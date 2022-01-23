/*

Metrics and resize handlers
===========================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {throttle} from 'lodash-es'

import {OFFSCREEN_OFFSET} from '../../common/constants.js'
import * as protocol from '../../common/protocol.js'

import {create} from './shared.js'
import WebGlkOte from './web.js'
import {Window} from './windows.js'

function get_size(el: JQuery<HTMLElement>): {height: number, width: number} {
    return {
        height: el.outerHeight()!,
        width: el.outerWidth()!,
    }
}

/** Compare two metrics to see if they differ enough to send an arrange event */
function metrics_differ(newmetrics: protocol.NormalisedMetrics, oldmetrics: protocol.NormalisedMetrics): boolean {
    return (oldmetrics.buffercharheight !== newmetrics.buffercharheight ||
        oldmetrics.buffercharwidth !== newmetrics.buffercharwidth ||
        oldmetrics.gridcharheight !== newmetrics.gridcharheight ||
        oldmetrics.gridcharwidth !== newmetrics.gridcharwidth ||
        oldmetrics.height !== newmetrics.height ||
        oldmetrics.width !== newmetrics.width)
}

export default class Metrics {
    // Shares the current_metrics and DOM of WebGlkOte
    private metrics: protocol.NormalisedMetrics
    private loaded: Promise<void>
    private glkote: WebGlkOte

    constructor(glkote: WebGlkOte) {
        this.glkote = glkote
        this.metrics = glkote.current_metrics

        // AsyncGlk may have started after a DOMContentLoaded event, but Metrics needs the load event so that the CSS is finished
        this.loaded = new Promise((resolve: any) => {
            window.addEventListener('load', resolve, {once: true})
        })

        $(document).on('scroll', this.on_document_scroll)
        $(window).on('resize', () => this.on_window_resize())
        $(visualViewport).on('resize', () => this.on_visualViewport_resize())
    }

    async measure() {
        // Ensure #gameport exists
        const dom = this.glkote.dom
        const gameport = dom.gameport()
        if (!gameport.length) {
            throw new Error(`Cannot find gameport element #${dom.gameport_id}`)
        }

        // Old versions of GlkOte used a pre-existing #layouttestpane, remove it if it exists
        dom.id('layouttestpane').remove()

        // Create a layout test pane
        const layout_test_pane = dom.create('div', 'layout_test_pane')
        layout_test_pane.text('This should not be visible')
        layout_test_pane.css({
            // Make the test pane render, but invisibly and off-screen
            left: OFFSCREEN_OFFSET,
            position: 'absolute',
            visibility: 'hidden',
        })

        // Create the test windows
        const line = $('<div>')
        create('span', 'Style_normal').text('12345678').appendTo(line)

        const bufwin = create('div', 'WindowFrame BufferWindow')
        const bufline1 = line.clone().addClass('BufferLine').appendTo(bufwin)
        const bufline2 = line.clone().addClass('BufferLine').appendTo(bufwin)
        create('span', 'InvisibleCursor').appendTo(bufline2)
        const bufspan = bufline1.children('span')
        layout_test_pane.append(bufwin)

        const graphwin = create('div', 'WindowFrame GraphicsWindow')
        const graphcanvas = $('<canvas>', {
            height: 32,
            width: 64,
        }).appendTo(graphwin)
        layout_test_pane.append(graphwin)

        const gridwin = create('div', 'WindowFrame GridWindow')
        const gridline1 = line.clone().addClass('GridLine').appendTo(gridwin)
        const gridline2 = line.clone().addClass('GridLine').appendTo(gridwin)
        const gridspan = gridline1.children('span')
        layout_test_pane.append(gridwin)

        gameport.append(layout_test_pane)

        // Wait first for the load event for the CSS to be loaded
        await this.loaded
        // And then for the actual font(s) to be loaded
        const font_family = getComputedStyle(gridwin[0]).getPropertyValue('--glkote-grid-mono-family').split(',')[0].replace(/"/g, '')
        await document.fonts.load(`14px ${font_family}`)

        // Measure the gameport height/width, excluding border and padding
        this.metrics.height = gameport.height()!
        this.metrics.width = gameport.width()!

        // Measure the buffer window
        const bufwinsize = get_size(bufwin)
        const bufspansize = get_size(bufspan)
        const bufline1size = get_size(bufline1)
        const bufline2size = get_size(bufline2)
        // A minimum of 1, but not necessarily an integer
        this.metrics.buffercharheight = Math.max(1, bufline2.position().top - bufline1.position().top)
        this.metrics.buffercharwidth = Math.max(1, bufspan.width()! / 8)
        this.metrics.buffermarginx = bufwinsize.width - bufspansize.width
        this.metrics.buffermarginy = bufwinsize.height - (bufline1size.height + bufline2size.height)

        // Measure the graphics window
        const graphicswinsize = get_size(graphwin)
        const canvassize = get_size(graphcanvas)
        this.metrics.graphicsmarginx = graphicswinsize.width - canvassize.width
        this.metrics.graphicsmarginy = graphicswinsize.height - canvassize.height

        // Measure the grid window
        const gridwinsize = get_size(gridwin)
        const gridspansize = get_size(gridspan)
        const gridline1size = get_size(gridline1)
        const gridline2size = get_size(gridline2)
        // A minimum of 1, but not necessarily an integer
        this.metrics.gridcharheight = Math.max(1, gridline2.position().top - gridline1.position().top)
        this.metrics.gridcharwidth = Math.max(1, gridspan.width()! / 8)
        this.metrics.gridmarginx = gridwinsize.width - gridspansize.width
        this.metrics.gridmarginy = gridwinsize.height - (gridline1size.height + gridline2size.height)

        // Clean up
        layout_test_pane.remove()
    }

    // iOS devices can scroll the window even though body/#gameport are set to height 100%
    // Scroll back to the top if they try
    on_document_scroll = throttle(async () => {
        window.scrollTo(0, 0)
    }, 500, {leading: false})

    on_visualViewport_resize() {
        // The iOS virtual keyboard does not change the gameport height, but it does change the viewport
        // Try to account for this by setting the gameport to the viewport height

        // But first...
        // iOS 15: When the virtual keyboard is active, the URL bar is not correctly accounted for in visualViewport.height
        // https://bugs.webkit.org/show_bug.cgi?id=229876
        // Should be fixed in iOS 15.1
        // Account for it by adding some padding to the #gameport
        const input_is_active = document.activeElement?.tagName === 'INPUT'
        this.glkote.dom.gameport()
            .toggleClass('ios15fix', input_is_active && /(iPad; CPU|iPhone) OS 15_0/i.test(navigator.userAgent))
            // And then set the outer height, to account for the padding
            .outerHeight(visualViewport.height)

        // Safari might have scrolled weirdly, so try to put it right
        window.scrollTo(0, 0)
        if (input_is_active) {
            const window: Window = $(document.activeElement!).data('window')
            if (window && window.type === 'buffer') {
                window.frameel.scrollTop(window.innerel.height()!)
            }
        }

        // Measure and send the new metrics
        this.on_window_resize()
    }

    on_window_resize = throttle(async () => {
        // Delay again if disabled
        if (this.glkote.disabled) {
            this.on_window_resize()
            return
        }
        const oldmetrics = Object.assign({}, this.metrics)
        await this.measure()
        if (metrics_differ(this.metrics, oldmetrics)) {
            this.glkote.send_event({type: 'arrange'})
        }
    }, 200, {leading: false})
}