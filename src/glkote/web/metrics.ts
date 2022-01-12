/*

Web Metrics
===========

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {throttle} from 'lodash-es'

import {OFFSCREEN_OFFSET} from '../../common/constants.js'
import * as protocol from '../../common/protocol.js'

import {create, DOM, EventFunc} from './shared.js'

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
    private dom: DOM
    private send_event: EventFunc

    constructor(dom: DOM, metrics: protocol.NormalisedMetrics, send_event: EventFunc) {
        this.metrics = metrics
        this.dom = dom
        this.send_event = send_event

        const throttled_handler = throttle(() => this.onresize(), 200)
        $(window).on('resize', throttled_handler)
    }

    async measure() {
        // Ensure #gameport exists
        const gameport = this.dom.gameport()
        if (!gameport.length) {
            throw new Error(`Cannot find gameport element #${this.dom.gameport_id}`)
        }

        // Old versions of GlkOte used a pre-existing #layouttestpane, remove it if it exists
        this.dom.id('layouttestpane').remove()

        // Create a layout test pane
        const layout_test_pane = this.dom.create('div', 'layout_test_pane')
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
        await document.fonts.ready

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
        this.metrics.gridmarginx = graphicswinsize.width - canvassize.width
        this.metrics.gridmarginy = graphicswinsize.height - canvassize.height

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

    async onresize() {
        const oldmetrics = Object.assign({}, this.metrics)
        await this.measure()
        if (metrics_differ(this.metrics, oldmetrics)) {
            $(document).trigger('glkote-arrange')
            this.send_event({type: 'arrange'})
        }
    }
}