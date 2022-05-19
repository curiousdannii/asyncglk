/*

Web GlkOte implementation
=========================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {throttle} from 'lodash-es'

import * as GlkOte from '../common/glkote.js'
import * as protocol from '../../common/protocol.js'

import Metrics from './metrics.js'
import {DOM} from './shared.js'
import Windows, {GraphicsWindow} from './windows.js'

interface AutosaveState {
    graphics_bg?: Array<[number, string]>,
    history?: Array<string>,
    metrics?: {
        height: number,
        width: number,
    }
}

/** A GlkOte implementation for the web
 * 
 * WebGlkOte requires the following HTML divs to be present (though the id names can be varied through the options):
 * 
 * ```
 *     <div id="gameport">
 *         <div id="windowport"></div>
 *         <div id="loadingpane">Loading...</div>
 *         <div id="errorpane" style="display:none;"><div id="errorcontent"></div></div>
 *     </div>
 * ```
 */
export default class WebGlkOte extends GlkOte.GlkOteBase implements GlkOte.GlkOte {
    dom: DOM = new DOM({
        context_element: undefined,
        errorcontent_id: 'errorcontent',
        errorpane_id: 'errorpane',
        gameport_id: 'gameport',
        loadingpane_id: 'loadingpane',
        prefix: '',
        windowport_id: 'windowport',
    })
    private metrics_calculator: Metrics
    private showing_error = false
    private showing_loading = true
    private windows: Windows

    constructor() {
        super()

        this.metrics_calculator = new Metrics(this)
        this.windows = new Windows(this)
    }

    async init(options: GlkOte.GlkOteOptions) {
        try {
            if (!options) {
                throw new Error('no options provided')
            }

            if (typeof jQuery === 'undefined') {
                throw new Error('jQuery is not loaded')
            }

            // Set DOM IDs
            if (options.dom_prefix) {
                this.dom.prefix = options.dom_prefix
            }
            if (options.errorcontent) {
                this.dom.errorcontent_id = options.errorcontent
            }
            if (options.errorpane) {
                this.dom.errorpane_id = options.errorpane
            }
            if (options.gameport) {
                this.dom.gameport_id = options.gameport
            }
            if (options.loadingpane) {
                this.dom.loadingpane_id = options.loadingpane
            }
            if (options.windowport) {
                this.dom.windowport_id = options.windowport
            }

            if (options.Blorb) {
                this.windows.blorb = options.Blorb
            }

            // The windport is required to already exist
            const windowport = this.dom.windowport()
            if (!windowport.length) {
                throw new Error(`Cannot find windowport element #${this.dom.windowport_id}`)
            }
            windowport.empty()

            $(document).on('scroll', this.on_document_scroll)

            // Prevent iOS from zooming in when focusing input, but allow Android to still pinch zoom
            // As they handle the maximum-scale viewport meta option differently, we will conditionally add it only in iOS
            // Idea from https://stackoverflow.com/a/62750441/2854284
            if (/iPhone OS/i.test(navigator.userAgent)) {
                (document.head.querySelector('meta[name="viewport"]')! as HTMLMetaElement).content = 'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1'
            }

            await this.metrics_calculator.measure()

            // Note that this must be called last as it will result in VM.start() being called
            return super.init(options)
        }
        catch (err) {
            this.error(err as Error)
        }
    }

    protected autorestore(data: AutosaveState) {
        // erkyrath/glkote history is an object rather than an array
        if (Array.isArray(data.history)) {
            this.windows.history = data.history
        }

        for (const win of this.windows.values()) {
            // Scroll all buffer windows
            if (win.type === 'buffer') {
                win.frameel.scrollTop(win.innerel.height()!)
            }
        }

        if (data.graphics_bg) {
            for (const [winid, colour] of data.graphics_bg) {
                (this.windows.get(winid) as GraphicsWindow).fillcolour = colour
            }
        }

        if (data.metrics && (data.metrics.height !== this.current_metrics.height || data.metrics.width !== this.current_metrics.width)) {
            // Force a resize event
            this.current_metrics.width += 2
            this.metrics_calculator.on_gameport_resize()
        }
    }

    protected cancel_inputs(windows: protocol.InputUpdate[]) {
        this.windows.cancel_inputs(windows)
    }

    protected capabilities(): string[] {
        return [
            'garglktext',
            'graphics',
            'graphicswin',
            'hyperlinks',
            'timer',
        ]
    }

    protected disable(disable: boolean) {
        for (const win of this.windows.values()) {
            win.textinput.el.prop('disabled', disable || !win.inputs?.type)
        }
        this.disabled = disable
    }

    error(error: Error | string) {
        error ??= '???'
        let msg: string
        if (typeof error === 'string') {
            msg = error
            error = new Error(error)
        }
        else {
            msg = error.toString()
        }

        // Don't use jQuery, because this is called if jQuery isn't present
        const errorcontent = document.getElementById(this.dom.errorcontent_id)
        if (!errorcontent) {
            throw new Error(msg)
        }
        errorcontent.innerHTML = msg

        const errorpane = document.getElementById(this.dom.errorpane_id)!
        if (errorpane.className === 'WarningPane') {
            errorpane.className = ''
        }
        errorpane.style.display = ''
        this.showing_error = true
        this.hide_loading()
        console.error(error)
    }

    protected exit() {
        throw new Error('exit not yet implemented')
    }

    getdomcontext(): HTMLElement | undefined {
        return this.dom.context_element
    }

    getdomid(name: string): string {
        switch (name) {
            case 'errorcontent': return this.dom.errorcontent_id
            case 'errorpane': return this.dom.errorpane_id
            case 'gameport': return this.dom.gameport_id
            case 'loadingpane': return this.dom.loadingpane_id
            case 'windowport': return this.dom.windowport_id
            default: return name
        }
    }

    private hide_loading() {
        if (!this.showing_loading) {
            return
        }
        this.showing_loading = false

        // Don't use jQuery because this could be called from error()
        const loadingpane = document.getElementById(this.dom.loadingpane_id)
        if (loadingpane) {
            loadingpane.style.display = 'none'
        }
    }

    // iOS devices can scroll the window even though body/#gameport are set to height 100%
    // Scroll back to the top if they try
    on_document_scroll = throttle(async () => {
        window.scrollTo(0, 0)
    }, 500, {leading: false})

    save_allstate(): AutosaveState {
        const graphics_bg: Array<[number, string]> = []
        for (const win of this.windows.values()) {
            if (win.type === 'graphics') {
                graphics_bg.push([win.id, win.fillcolour])
            }
        }

        return {
            graphics_bg,
            history: this.windows.history,
            metrics: {
                height: this.current_metrics.height,
                width: this.current_metrics.width,
            },
        }
    }

    // Send partial line input values
    send_event(ev: Partial<protocol.Event>) {
        if (ev.type !== 'init' && ev.type !== 'refresh' && ev.type !== 'specialresponse') {
            for (const win of this.windows.values()) {
                if (win.inputs?.type) {
                    const val = win.textinput.el.val() as string
                    if (val) {
                        if (!ev.partial) {
                            ev.partial = {}
                        }
                        ev.partial[win.id] = val
                    }
                }
            }
        }
        super.send_event(ev)
    }

    setdomcontext(val: HTMLElement) {
        this.dom.context_element = val
    }

    protected set_page_bg(colour: string) {
        $('body').css('background-color', colour)
    }

    update(data: protocol.Update) {
        if (this.showing_loading) {
            this.hide_loading()
        }
        super.update(data)
    }

    protected update_content(content: protocol.ContentUpdate[]) {
        this.windows.update_content(content)
    }

    protected update_inputs(windows: protocol.InputUpdate[]) {
        this.windows.update_inputs(windows)
    }

    protected update_windows(windows: protocol.WindowUpdate[]) {
        this.windows.update(windows)
    }

    warning(msg: any) {
        // Don't show warnings if an error is already being shown
        if (this.showing_error) {
            return
        }

        const errorpane = $(`#${this.dom.errorpane_id}`)

        // Hide a warning
        if (!msg) {
            errorpane.hide()
            return
        }

        const errorcontent = document.getElementById(this.dom.errorcontent_id)
        if (!errorcontent) {
            console.warn(msg)
            return
        }
        errorcontent.innerHTML = msg

        errorpane.addClass('WarningPane')
        errorpane.show()
        this.hide_loading()
    }
}