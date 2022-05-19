/*

GlkOte windows
==============

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {debounce} from 'lodash-es'

import Blorb from '../../blorb/blorb.js'
import {NBSP, STYLES_COUNT, STYLE_NAMES, STYLE_NAMES_TO_CODES} from '../../common/constants.js'
import * as protocol from '../../common/protocol.js'

import {TextInput} from './input.js'
import {create, DOM, EventFunc} from './shared.js'
import WebGlkOte from './web.js'

export type Window = BufferWindow | GraphicsWindow | GridWindow
type WindowCodes = 'buffer' | 'graphics' | 'grid'

function no_text_selected(): boolean {
    return (window.getSelection() + '') === ''
}

abstract class WindowBase {
    blorb?: Blorb
    desired = true
    dom: DOM
    frameel: JQuery<HTMLElement>
    id: number
    inputs?: protocol.InputUpdate
    manager: Windows
    metrics: protocol.NormalisedMetrics
    textinput: TextInput
    type: WindowCodes

    constructor(options: {
        blorb?: Blorb
        dom: DOM,
        id: number,
        manager: Windows,
        metrics: protocol.NormalisedMetrics,
        rock: number,
        type: WindowCodes,
    }) {
        this.blorb = options.blorb
        this.dom = options.dom
        this.id = options.id
        this.manager = options.manager
        this.metrics = options.metrics
        this.type = options.type

        this.frameel = this.dom.create('div', `window${options.id}`, {
            class: `WindowFrame ${window_types[this.type]} WindowRock_${options.rock}`,
            click: (ev: JQuery.ClickEvent) => this.onclick(ev),
        })
            .appendTo(this.dom.windowport())

        // (this as any as Window) is a silly hack to work around Typescript's abstract class rules
        this.textinput = new TextInput(this as any as Window)
    }

    destroy() {
        this.frameel.remove()
        this.textinput.destroy()
    }

    // Dummy function which is only needed for buffer windows
    measure_height() {}

    protected onclick(ev: JQuery.ClickEvent) {
        if (this.inputs?.type && no_text_selected()) {
            this.textinput.el.trigger('focus')
            return false
        }
    }

    send_text_event(ev: Partial<protocol.CharEvent | protocol.LineEvent>) {
        // Measure the height of the window, which should account for a virtual keyboard
        this.measure_height()
        this.textinput.reset()
        // Clear the input type so we won't accidentally send it again
        this.inputs!.type = undefined
        // We're the last active window
        this.manager.active_window = this as any as Window
        // Set the event's window prop and send it
        ev.window = this.id
        this.manager.send_event(ev)
    }

    update_textinput() {
        this.textinput.update()
    }
}

abstract class TextualWindow extends WindowBase {
    bg?: string
    fg?: string
    last_textrun?: protocol.TextRun
    stylehints?: protocol.StyleHints

    constructor(options: any) {
        super(options)

        // We need the `this` object provided by jQuery, so we can't use an arrow function handler like we normally do
        const onlink = (target: HTMLElement) => this.onlink(target)
        this.frameel.on('click', 'a', function() {onlink(this)})

        // Add stylehints
        if (options.stylehints) {
            this.stylehints = options.stylehints
            this.add_stylehints()
        }
    }

    /** Convert stylehints to CSS and add to a window */
    add_stylehints() {
        const css_rules = []
        const windowid = `window${this.id}`
        if (this.stylehints) {
            for (let style_number = 0; style_number < STYLES_COUNT; style_number++) {
                const stylehints = this.stylehints![style_number]
                if (!stylehints) {
                    continue
                }
                const par_props = []
                const span_props = []

                for (const prop in stylehints) {
                    if (prop === 'reverse' || (prop === 'font-family' && this.type !== 'buffer')) {
                        continue
                    }
                    if (prop === 'margin-left' || prop === 'text-align' || prop === 'text-indent') {
                        par_props.push(`${prop}: ${stylehints[prop]}`)
                    }
                    else {
                        // If the whole style is reversed, then don't set colours here, set them below
                        if ((prop === 'color' || prop === 'background-color') && stylehints.reverse) {
                            continue
                        }
                        span_props.push(`${prop}: ${stylehints[prop]}`)
                    }
                }

                const stylename = STYLE_NAMES[style_number]
                if (par_props.length) {
                    css_rules.push(`#${windowid} div.Style_${stylename} {${par_props.join('; ')}}`)
                }
                if (span_props.length) {
                    css_rules.push(`#${windowid} span.Style_${stylename} {${span_props.join('; ')}}`)
                    // Also output styles for the <input>
                    // May not place nice with reverse!
                    if (style_number === 8) {
                        css_rules.push(`#${windowid} .LineInput {${span_props.join('; ')}}`)
                    }
                }

                if (stylehints.color || stylehints['background-color']) {
                    const css_props = []
                    if (stylehints.color) {
                        css_props.push(`background-color: ${stylehints.color}`)
                    }
                    if (stylehints['background-color']) {
                        css_props.push(`color: ${stylehints['background-color']}`)
                    }
                    css_rules.push(`#${windowid} span.Style_${stylename}.reverse {${css_props.join('; ')}}`)
                }
            }
        }

        // Set window background colour
        if (this.bg || this.fg || this.stylehints?.[0]?.['background-color']) {
            css_rules.push(
                `#${windowid} {background-color: ${this.bg || this.stylehints?.[0]?.['background-color'] || `var(--glkote-${this.type}-bg)`}}`,
                `#${windowid}.reverse {background-color: ${this.fg || this.stylehints?.[0]?.['color'] || `var(--glkote-${this.type}-reverse-bg)`}}`
            )
        }

        if (css_rules.length) {
            this.frameel.children('style').remove()
            this.frameel.prepend(`<style>${css_rules.join('\n')}</style>`)
        }
    }

    create_text_run(run: protocol.TextRun, split_words?: boolean): JQuery<HTMLElement> {
        const reverse = run.reverse ?? (this.stylehints?.[STYLE_NAMES_TO_CODES[run.style]]?.reverse)
        const el = create('span', `Style_${run.style}${reverse ? ' reverse' : ''}`)
        /*const els = split_words
            ? $(run.text.split(/(?<=\s)\b/g).map(text => el.clone().text(text)[0]))
            : el.text(run.text)*/
        // Safari doesn't support look behind regexs, so comment out for now
        const els = el.text(run.text)
        const bg = run.bg
        const fg = run.fg
        if (bg || fg) {
            const css_props: any = {}
            if (bg) {
                css_props[reverse ? 'color' : 'background-color'] = bg
            }
            if (fg) {
                css_props[reverse ? 'background-color' : 'color'] = fg
            }
            el.css(css_props)
        }
        if (run.hyperlink) {
            return $('<a>', {
                data: {
                    glklink: run.hyperlink,
                },
                href: '#',
            })
                .append(els)
        }
        return els
    }

    onlink(target: HTMLElement) {
        const linkval = $(target).data('glklink')
        if (linkval) {
            if (this.inputs?.hyperlink) {
                this.manager.send_event({
                    type: 'hyperlink',
                    value: linkval,
                    window: this.id,
                })
            }
            return false
        }
    }

    /** Refresh styles after a cleared window */
    refresh_styles(bg?: string, fg?: string) {
        if (this.stylehints) {
            let styles_need_refreshing
            if (typeof bg !== undefined) {
                this.bg = bg
                styles_need_refreshing = 1
            }
            if (typeof fg !== undefined) {
                this.fg = fg
                styles_need_refreshing = 1
            }
            if (styles_need_refreshing) {
                this.add_stylehints()
            }
        }
    }
}

const inline_alignment_classes: Record<string, string> = {
    inlinecenter: 'ImageInlineCenter',
    inlinedown: 'ImageInlineDown',
    inlineup: 'ImageInlineUp',
    marginleft: 'ImageMarginLeft',
    marginright: 'ImageMarginRight',
}

class BufferWindow extends TextualWindow {
    type: 'buffer' = 'buffer'
    innerel: JQuery<HTMLElement>
    lastline?: JQuery<HTMLElement>
    updatescrolltop = 0
    visibleheight: number

    constructor(options: any) {
        super(options)
        this.frameel.attr({
            'aria-atomic': 'false',
            'aria-live': 'polite',
            'aria-relevant': 'additions',
            tabindex: -1,
        })
        this.innerel = create('div', 'BufferWindowInner')
            .append(this.textinput.el)
            .appendTo(this.frameel)
        this.visibleheight = this.frameel.height()!
    }

    /** Measure the height of the window that is currently visible (excluding virtual keyboards for example) */
    measure_height() {
        this.visibleheight = this.frameel.height()!
    }

    protected onclick(_: JQuery.ClickEvent) {
        if (this.inputs?.type && no_text_selected()) {
            // Check that we've scrolled to the bottom (if there is actually text in this window)
            if (this.lastline && this.visibleheight) {
                const rect = this.lastline[0].getBoundingClientRect()
                if (rect.bottom < 0 || rect.top > document.documentElement.clientHeight) {
                    return false
                }
            }
            this.textinput.el.trigger('focus')
            return false
        }
    }

    update(data: protocol.BufferWindowContentUpdate) {
        if (data.clear) {
            this.innerel.children('.BufferLine').remove()
            this.lastline = undefined
            this.last_textrun = undefined
            this.refresh_styles(data.bg, data.fg)
        }

        // If the text field is missing, just do nothing
        if (!data.text) {
            return
        }

        // Get the scrolltop for this update
        this.updatescrolltop = Math.max(0, (this.lastline?.position().top || 0) - 20)

        let line_index = 0
        while (line_index < data.text.length) {
            const line = data.text[line_index++]
            const content = line.content
            let divel: JQuery<HTMLElement> | undefined
            let line_has_style
            if (line.append && this.lastline) {
                divel = this.lastline
                line_has_style = 1
            }
            else {
                divel = create('div', 'BufferLine')
                this.innerel.append(divel)
                this.lastline = divel
                if (!content?.length) {
                    divel.addClass('BlankPara')
                    divel.append(create('span', 'BlankLineSpace').text(NBSP))
                    continue
                }
            }
            if (line.flowbreak) {
                divel.addClass('FlowBreak')
            }

            if (!content?.length) {
                continue
            }
            for (let run_index = 0; run_index < content.length; run_index++) {
                let run: protocol.TextRun
                const instruction = content[run_index]
                if (typeof instruction === 'string') {
                    run = {
                        style: content[run_index++] as string,
                        text: content[run_index] as string,
                    }
                }
                else if ('special' in instruction && instruction.special === 'image') {
                    const el = $('<img>', {
                        alt: instruction.alttext || `Image ${instruction.image}`,
                        class: inline_alignment_classes[instruction.alignment || 'inlineup'],
                        height: instruction.height,
                        src: this.blorb && this.blorb.get_image_url(instruction.image!) || instruction.url!,
                        width: instruction.width,
                    })
                    if (instruction.hyperlink) {
                        $('<a>', {
                            data: {
                                glklink: instruction.hyperlink,
                            },
                            href: '#',
                        })
                            .append(el)
                            .appendTo(divel)
                        continue
                    }
                    divel.append(el)
                    continue
                }
                else {
                    run = instruction as protocol.TextRun
                }
                if (!line_has_style) {
                    line_has_style = 1
                    divel.addClass(`Style_${run.style}`)
                }
                divel.append(this.create_text_run(run, line_index === data.text.length))
                // Store the last text run for setting styles in the input
                this.last_textrun = run
            }
        }

        // Scroll down
        if (visualViewport.scale === 1) {
            this.frameel.scrollTop(this.updatescrolltop)
        }

        // TODO: Trim log?
    }
}

export class GraphicsWindow extends WindowBase {
    type: 'graphics' = 'graphics'
    buffer: JQuery<HTMLCanvasElement>
    canvas: JQuery<HTMLCanvasElement>
    fillcolour = ''
    framequeue: protocol.GraphicsWindowOperation[][] = []
    /** Height in CSS pixels */
    height = 0
    image_cache: Map<number | string, HTMLImageElement> = new Map()
    /** Width in CSS pixels */
    width = 0

    constructor(options: any) {
        super(options)
        // Create the canvas
        this.canvas = this.dom.create('canvas', `win${options.id}_canvas`, {
            data: {
                window: this,
            },
        }) as JQuery<HTMLCanvasElement>
        this.frameel.append(this.canvas)
        this.manager.canvasResizeObserver?.observe(this.canvas[0])

        // And a buffer canvas to reduce flicker
        this.buffer = this.dom.create('canvas', `win${options.id}_buffer`) as JQuery<HTMLCanvasElement>
    }

    // Clear the image cache 5 seconds after the last frame, so that the cache can be useful for animations, but we don't waste memory for images which are only updated each turn
    clear_cache = debounce(() => {
        this.image_cache.clear()
    }, 5000)

    // Decode and cache an image
    decode_image(key: number | string, url: string): Promise<void> {
        const image = new Image()
        image.src = url
        return image.decode()
            .then(() => {
                this.image_cache.set(key, image)
            })
            .catch(() => {})
    }

    destroy() {
        this.manager.canvasResizeObserver?.unobserve(this.canvas[0])
        super.destroy()
    }

    onclick(ev: JQuery.ClickEvent) {
        if (this.inputs?.mouse && ev.button === 0) {
            this.inputs.mouse = false
            this.manager.send_event({
                type: 'mouse',
                window: this.id,
                x: Math.floor(ev.offsetX - this.metrics.graphicsmarginx / 2),
                y: Math.floor(ev.offsetY - this.metrics.graphicsmarginy / 2),
            })
            return false
        }
        return super.onclick(ev)
    }

    set_dimensions(height: number, width: number) {
        // First set the things which use CSS pixels
        this.canvas.css({height, width})
        this.height = height
        this.width = width
        // Then the canvas dimensions using devicePixelRatio
        const dPR = devicePixelRatio
        height = height * dPR
        width = width * dPR
        this.buffer.attr({height, width})
        this.canvas.attr({height, width})
        // The resize observer will handle setting true pixel sizes if supported
    }

    // This function is async because images must be loaded asynchrounously, and each operation painted in sequence, but the rest of GlkOte doesn't need to await it
    async update() {
        const buffercontext = this.buffer[0].getContext('2d')!

        // If we're slow loading images then more than one frame may have arrived, so go through the queue now
        for (let i = 0; i < this.framequeue.length; i++) {
            const frame = this.framequeue[i]

            // Stop if the window is collapsed
            if (!this.height || !this.width) {
                break
            }
            // There shouldn't be any empty frames, but check just in case
            if (!frame.length) {
                continue
            }

            // Preload images
            const loading_images = []
            for (const op of frame) {
                if (op.special === 'image') {
                    const key = op.url || op.image!
                    if (this.image_cache.has(key)) {
                        continue
                    }
                    const url = op.url || this.blorb && this.blorb.get_image_url(op.image!)
                    if (url) {
                        loading_images.push(this.decode_image(key, url))
                    }
                }
            }
            await Promise.all(loading_images)

            const dPR = devicePixelRatio
            for (const op of frame) {
                switch (op.special) {
                    case 'fill':
                        buffercontext.fillStyle = op.color || this.fillcolour
                        if (Number.isFinite(op.x)) {
                            buffercontext.fillRect(op.x! * dPR, op.y! * dPR, op.width! * dPR, op.height! * dPR)
                        }
                        else {
                            buffercontext.fillRect(0, 0, parseInt(this.buffer.attr('width')!), parseInt(this.buffer.attr('height')!))
                        }
                        break
                    case 'image': {
                        const image = this.image_cache.get(op.url || op.image!)
                        if (image) {
                            buffercontext.drawImage(image, op.x * dPR, op.y * dPR, op.width * dPR, op.height * dPR)
                        }
                        break
                    }
                    case 'setcolor':
                        this.fillcolour = op.color
                        break
                }
            }
        }
        // Now that all operations/frames are finished, draw the buffer to the main canvas (as long as it hasn't been collapsed)
        if (this.height && this.width) {
            this.canvas[0].getContext('2d')!.drawImage(this.buffer[0], 0, 0)
        }

        // Empty the queue
        this.framequeue.length = 0
        // And queue the cache to be cleared, if more frames don't arrive soon
        this.clear_cache()
    }
}

class GridWindow extends TextualWindow {
    type: 'grid' = 'grid'
    height = 0
    lines: JQuery<HTMLElement>[] = []
    width = 0

    onclick(ev: JQuery.ClickEvent) {
        if (this.inputs?.mouse && ev.button === 0 && no_text_selected()) {
            this.inputs.mouse = false
            this.manager.send_event({
                type: 'mouse',
                window: this.id,
                x: Math.floor((ev.offsetX - this.metrics.gridmarginx / 2) / this.metrics.gridcharwidth),
                y: Math.floor((ev.offsetY - this.metrics.gridmarginy / 2) / this.metrics.gridcharheight),
            })
            return false
        }
        return super.onclick(ev)
    }

    update(data: protocol.GridWindowContentUpdate) {
        if (data.clear) {
            this.last_textrun = undefined
            this.refresh_styles(data.bg, data.fg)
        }

        for (const line of data.lines) {
            const lineel = this.lines[line.line]
            if (!lineel.length) {
                throw new Error(`Got content for nonexistent line ${line.line} of window ${this.id}`)
            }

            const content = line.content
            if (!content || !content.length) {
                lineel.text(NBSP)
            }
            else {
                lineel.empty()
                for (let i = 0; i < content.length; i++) {
                    let run: protocol.TextRun
                    if (typeof content[i] === 'string') {
                        run = {
                            style: content[i++] as string,
                            text: content[i] as string,
                        }
                    }
                    else {
                        run = content[i] as protocol.TextRun
                    }
                    lineel.append(this.create_text_run(run))
                    // Store the last text run for setting styles in the input
                    this.last_textrun = run
                }
            }
        }

        // Apply the class of 'reverse' to the window if all the text in it is reversed
        $(`#window${this.id}`).toggleClass('reverse', $(`#window${this.id} span:not(.reverse)`).length === 0)
    }
}

const window_types: Record<string, string> = {
    buffer: 'BufferWindow',
    graphics: 'GraphicsWindow',
    grid: 'GridWindow',
}

export default class Windows extends Map<number, Window> {
    active_window?: Window
    blorb?: Blorb // Note will be set after this is constructed, in WebGlkOte.init
    canvasResizeObserver?: ResizeObserver // Will only be created if the browser's ResizeObserver supports devicePixelContentBoxSize
    private dom: DOM
    private glkote: WebGlkOte
    history: string[] = []
    private metrics: protocol.NormalisedMetrics
    send_event: EventFunc

    constructor(glkote: WebGlkOte) {
        super()
        this.dom = glkote.dom
        this.glkote = glkote
        this.metrics = glkote.current_metrics
        if (window.ResizeObserver) {
            // We can use a ResizeObserver to get true pixel dimensions for canvases, but it's not supported in all browsers, so test
            const testRO = new ResizeObserver((entries) => {
                if (typeof entries?.[0].devicePixelContentBoxSize?.[0].blockSize !== 'undefined') {
                    this.canvasResizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => this.oncanvasresize(entries))
                }
                testRO.disconnect()
            })
            testRO.observe(document.body)
        }
        this.send_event = ev => glkote.send_event(ev)

        $(document).on('keydown', (ev: JQuery.KeyDownEvent) => this.onkeydown(ev))
        this.dom.gameport().on('click', () => this.onclick())
    }

    cancel_inputs(windows: protocol.InputUpdate[]) {
        const newinputs: Record<number, protocol.InputUpdate> = {}
        for (const window of windows) {
            newinputs[window.id] = window
        }

        for (const win of this.values()) {
            const update = newinputs[win.id]
            if (!update && win.inputs) {
                if (win.textinput.el.is(':focus')) {
                    this.active_window = win
                    win.textinput.el.trigger('blur')
                }
                delete win.inputs
            }
        }
    }

    // Use a resize observer to set true pixel sizes on graphics windows
    private oncanvasresize(entries: ResizeObserverEntry[]) {
        for (const entry of entries) {
            const box = entry.devicePixelContentBoxSize![0]
            const height = box.blockSize
            const width = box.inlineSize
            const win: GraphicsWindow = $(entry.target).data('window')
            win.buffer.attr({height, width})
            win.canvas.attr({height, width})
        }
        this.send_event({type: 'redraw'})
    }

    // If the gameport receives a click event, then find one window with active text input to focus
    private onclick() {
        if (!this.glkote.disabled && no_text_selected()) {
            for (const window of this.values()) {
                if (window.inputs?.type) {
                    window.frameel.trigger('click')
                    break
                }
            }
        }
    }

    // On document.keypress events, redirect to a window
    private onkeydown(ev: JQuery.KeyDownEvent) {
        // Don't fire on inputs or focused buffer windows
        if (!this.glkote.disabled && ev.target.nodeName !== 'input' && !(ev.target.nodeName === 'div' && $(ev.target).is('.BufferWindow:focus'))) {
            // Look first for a window with active text input, but as a fallback any buffer window
            const windows = [...this.values()]
            const window = windows.filter(win => win.inputs?.type)[0] || windows.filter(win => win.type === 'buffer')[0]
            if (window) {
                window.frameel.trigger('click')
                // After focusing, the keypress event will fire, but not the keydown, meaning that function keys won't be recognised
                // So manually trigger the keydown event in the input (as long as it is actually focused)
                if (window.textinput.el.is(':focus')) {
                    window.textinput.el.trigger(ev)
                }
                // Otherwise focus the window so that nav keys will work
                else if (window.type === 'buffer') {
                    window.frameel.trigger('focus')
                }
            }
        }
    }

    update(windows: protocol.WindowUpdate[]) {
        // Mark all windows as non-desired
        for (const win of this.values()) {
            win.desired = false
        }

        // Go through each window in this update
        for (const update of windows) {
            const id = update.id
            const rock = update.rock
            const type = update.type

            // Is there an existing window?
            let win = this.get(id)

            // Create it if not
            if (!win) {
                const options: any = {
                    blorb: this.blorb,
                    dom: this.dom,
                    id,
                    manager: this,
                    metrics: this.metrics,
                    rock,
                    stylehints: update.stylehints,
                    type,
                }

                switch (type) {
                    case 'buffer': {
                        win = new BufferWindow(options)
                        break
                    }
                    case 'graphics': {
                        options.height = update.graphheight
                        options.width = update.graphwidth
                        win = new GraphicsWindow(options)
                        break
                    }
                    case 'grid': {
                        win = new GridWindow(options)
                        break
                    }
                }

                this.set(id, win)
            }
            else {
                if (win.type !== type) {
                    throw new Error(`Window ${id} was created with type ${win.type}, but now is described as type ${type}`)
                }
            }
            win.desired = true

            // Ensure graphics windows are the right size
            if (win.type === 'graphics') {
                if (win.height !== update.graphheight || win.width !== update.graphwidth) {
                    win.set_dimensions(update.graphheight!, update.graphwidth!)
                }
            }

            // Ensure grid windows have the right number of lines
            if (win.type === 'grid') {
                if (update.gridheight! > win.height) {
                    for (let i = win.height; i < update.gridheight!; i++) {
                        const line = this.dom.create('div', `win${win.id}_ln${i}`, 'GridLine')
                        line.append(NBSP)
                        win.frameel.append(line)
                        win.lines[i] = line
                    }
                }
                if (update.gridheight! < win.height) {
                    for (let i = update.gridheight!; i < win.height; i++) {
                        this.dom.id(`win${win.id}_ln${i}`).remove()
                    }
                }
                win.height = update.gridheight!
                win.lines.length = win.height
                win.width = update.gridwidth!
            }

            // Set window background after an autorestore
            if (win.type === 'buffer' || win.type === 'grid') {
                win.refresh_styles(update.bg, update.fg)
            }

            // Update the position of the window
            win.frameel.css({
                bottom: this.metrics.height - (update.top + update.height),
                left: update.left,
                right: this.metrics.width - (update.left + update.width),
                top: update.top,
            })
            win.measure_height()
        }

        const windowstoclose: Window[] = []
        for (const win of this.values()) {
            if (!win.desired) {
                windowstoclose.push(win)
            }
        }
        for (const win of windowstoclose) {
            win.destroy()
            this.delete(win.id)
        }
    }

    update_content(content: protocol.ContentUpdate[]) {
        for (const update of content) {
            const win = this.get(update.id)
            if (!win) {
                throw new Error(`Got content update for window ${update.id}, which does not exist`)
            }
            // TODO: check for pending line input

            switch (win.type) {
                case 'buffer': win.update(update as protocol.BufferWindowContentUpdate); break
                case 'graphics':
                    // Queue this frame, but only run the update function if this is the only frame
                    win.framequeue.push((update as protocol.GraphicsWindowContentUpdate).draw)
                    if (win.framequeue.length === 1) {
                        win.update()
                    }
                    break
                case 'grid': win.update(update as protocol.GridWindowContentUpdate); break
            }
        }
    }

    update_inputs(windows: protocol.InputUpdate[]) {
        for (const update of windows) {
            const win = this.get(update.id)
            if (!win) {
                throw new Error(`Got input update for window ${update.id}, which does not exist`)
            }

            const oldgen = win.inputs?.gen
            win.inputs = update
            if (update.type){
                if (update.gen !== oldgen) {
                    win.update_textinput()
                }
            }
        }

        // Refocus an <input>
        // On Android this forces the window to be scrolled down to the bottom, so only refocus if the virtual keyboard doesn't make the window too small for the full update text to be seen
        if (this.active_window) {
            // Refocus the same window if it hasn't been deleted and still wants input
            if (this.has(this.active_window.id) && this.active_window.inputs?.type) {
                this.active_window.textinput.refocus()
            }
            // Look for any window with text input
            else {
                [...this.values()].filter(win => win.inputs?.type)[0]?.textinput.refocus()
            }
        }
    }
}