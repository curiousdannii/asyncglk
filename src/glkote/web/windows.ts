/*

GlkOte windows
==============

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {NBSP, THINSPACE} from '../../common/constants.js'
import * as protocol from '../../common/protocol.js'

import {TextInput} from './input.js'
import {create, DOM, EventFunc} from './shared.js'

export type Window = BufferWindow | GraphicsWindow | GridWindow
type WindowCodes = 'buffer' | 'graphics' | 'grid'

abstract class WindowBase {
    desired: boolean = true
    dom: DOM
    frameel: JQuery<HTMLElement>
    id: number
    inputs?: protocol.InputUpdate
    metrics: protocol.NormalisedMetrics
    textinput: TextInput
    type: WindowCodes

    constructor(options: {
        dom: DOM,
        id: number,
        manager: Windows,
        metrics: protocol.NormalisedMetrics,
        rock: number,
        type: WindowCodes,
    }) {
        this.dom = options.dom
        this.id = options.id
        this.metrics = options.metrics
        this.type = options.type

        this.frameel = this.dom.create('div', `window${options.id}`, {
            class: `WindowFrame ${window_types[this.type]} WindowRock_${options.rock}`,
            click: (ev: JQuery.ClickEvent) => this.onclick(ev),
        })
            .appendTo(this.dom.windowport())
        // TODO: attach scrolling handler, etc

        // (this as any as Window) is a silly hack to work around Typescript's abstract class rules
        this.textinput = new TextInput(this as any as Window, options.manager)
    }

    destroy() {
        this.frameel.remove()
        this.textinput.destroy()
    }

    protected onclick(ev: JQuery.ClickEvent) {
        if (this.inputs?.type) {
            this.textinput.el.trigger('focus')
            return false
        }
    }

    update_textinput() {
        this.textinput.update()
    }
}

abstract class TextualWindow extends WindowBase {
    create_text_run(run: protocol.TextRun, split_words?: boolean): JQuery<HTMLElement> {
        const el = create('span', `Style_${run.style}`)
        const els = split_words
            ? $(run.text.split(/(?<=\s)\b/g).map(text => el.clone().text(text)[0]))
            : el.text(run.text)
        if (run.hyperlink) {
            els.wrap($('<a>', {href: '#'}))
        }
        return els
    }
}

class BufferWindow extends TextualWindow {
    type: 'buffer' = 'buffer'
    innerel: JQuery<HTMLElement>
    lastline?: JQuery<HTMLElement>
    oldscrolltop: number = 0

    constructor(options: any) {
        super(options)
        this.frameel.attr({
            'aria-atomic': 'false',
            'aria-live': 'polite',
            'aria-relevant': 'additions',
        })
        this.innerel = create('div', 'BufferWindowInner')
            .append(this.textinput.el)
            .appendTo(this.frameel)
    }

    protected onclick(ev: JQuery.ClickEvent) {
        if (this.inputs?.type && this.lastline) {
            // Check that we've scrolled to the bottom
            const rect = this.lastline[0].getBoundingClientRect()
            if (rect.bottom >= 0 && rect.top <= document.documentElement.clientHeight) {
                this.textinput.el.trigger('focus')
            }
            return false
        }
    }

    scrolltolastupdate() {
        this.frameel.scrollTop(this.oldscrolltop)
    }

    update(data: protocol.BufferWindowContentUpdate) {
        if (data.clear) {
            this.innerel.children('.BufferLine').remove()
            this.lastline = undefined
        }

        // If the text field is missing, just do nothing
        if (!data.text) {
            return
        }

        // Calculate the last scroll height
        this.oldscrolltop = (this.lastline?.position()?.top || 0) + this.frameel.scrollTop()! - 20

        for (const [line_index, line] of data.text.entries()) {
            const content = line.content
            let divel: JQuery<HTMLElement> | undefined
            if (line.append && this.lastline) {
                divel = this.lastline
            }
            else {
                divel = create('div', 'BufferLine')
                this.innerel.append(divel)
                this.lastline = divel
                if (!content || !line.content.length) {
                    divel.addClass('BlankPara')
                    divel.append(create('span', 'BlankLineSpace').text(NBSP))
                    continue
                }
            }
            if (line.flowbreak) {
                divel.addClass('FlowBreak')
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
                    // TODO: inline images
                    continue
                }
                else {
                    run = instruction as protocol.TextRun
                }
                divel.append(this.create_text_run(run, line_index === data.text.length))
            }
        }

        // Scroll down
        this.scrolltolastupdate()
    }
}

class GraphicsWindow extends WindowBase {
    type: 'graphics' = 'graphics'
    height = 0
    width = 0

    update(data: protocol.GraphicsWindowContentUpdate) {
        // TODO!
    }
}

class GridWindow extends TextualWindow {
    type: 'grid' = 'grid'
    height = 0
    lines: JQuery<HTMLElement>[] = []
    width = 0

    update(data: protocol.GridWindowContentUpdate) {
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
                }
            }
        }
    }
}

const window_types: Record<string, string> = {
    buffer: 'BufferWindow',
    graphics: 'GraphicsWindow',
    grid: 'GridWindow'
}

export default class Windows extends Map<number, Window> {
    active_window?: Window
    private dom: DOM
    private metrics: protocol.NormalisedMetrics
    send_event: EventFunc

    constructor(dom: DOM, metrics: protocol.NormalisedMetrics, send_event: EventFunc) {
        super()
        this.dom = dom
        this.metrics = metrics
        this.send_event = send_event

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
                if (!this.active_window && win.textinput.el.is(':focus')) {
                    this.active_window = win
                }
                delete win.inputs
            }
        }
    }

    // If the gameport receives a click event, then find one window with active text input to focus
    private onclick() {
        for (const window of this.values()) {
            if (window.inputs?.type) {
                window.frameel.trigger('click')
                break
            }
        }
    }

    // on document.keypress events, trigger a window with active text input
    private onkeydown(ev: JQuery.KeyDownEvent) {
        if (ev.target.nodeName !== 'input') {
            for (const window of this.values()) {
                if (window.inputs?.type) {
                    window.frameel.trigger('click')
                    // After focusing, the keypress event will fire, but not the keydown, meaning that function keys won't be recognised
                    // So manually trigger the keydown event in the input (as long as it is actually focused)
                    if (window.textinput.el.is(':focus')) {
                        window.textinput.el.trigger(ev)
                    }
                    break
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
                const options = {
                    dom: this.dom,
                    id,
                    manager: this,
                    metrics: this.metrics,
                    rock,
                    type,
                }

                switch (type) {
                    case 'buffer': {
                        win = new BufferWindow(options)
                        break
                    }
                    case 'graphics': {
                        //const canvas = this.dom.create('canvas', `win${id}_canvas`)
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

            // Update the position of the window
            win.frameel.css({
                bottom: `${this.metrics.height - (update.top + update.height)}px`,
                left: `${update.left}px`,
                right: `${this.metrics.width - (update.left + update.width)}px`,
                top: `${update.top}px`,
            })
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
                case 'graphics': win.update(update as protocol.GraphicsWindowContentUpdate); break
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
        // On Android this forces the window to be scrolled down to the bottom, so disable for now
        // Maybe in the future could be enabled only for iOS (if desired)?
        /*if (this.active_window) {
            // Refocus the same window if it hasn't been deleted and still wants input
            if (this.has(this.active_window.id) && this.active_window.inputs?.type) {
                this.active_window.textinput.refocus()
            }
            // Look for any window with text input
            else {
                [...this.values()].filter(win => win.inputs?.type)[0]?.textinput.refocus()
            }
        }*/
    }
}