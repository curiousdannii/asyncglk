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
import {create, DOM} from './shared.js'

type EventFunc = (event: protocol.Event) => void

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

    onclick(ev: JQuery.ClickEvent) {
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
    create_text_run(run: protocol.TextRun): JQuery<HTMLElement> {
        const runel = create('span', `Style_${run.style}`)
        if (run.hyperlink) {
            const ael = $('<a>')
            ael.text(run.text)
            // TODO: hyperlink onclick handler
            runel.append(ael)
        }
        else {
            runel.text(run.text)
        }
        return runel
    }
}

class BufferWindow extends TextualWindow {
    type: 'buffer' = 'buffer'
    cursor?: JQuery<HTMLElement>
    lastline?: JQuery<HTMLElement>

    constructor(options: any) {
        super(options)
        this.frameel.attr({
            'aria-atomic': 'false',
            'aria-live': 'polite',
            'aria-relevant': 'additions',
        })
    }

    add_cursor() {
        if (this.cursor) {
            this.cursor.remove()
        }
        const cursor = create('span', 'InvisibleCursor')
        const container = this.lastline || this.frameel
        container.append(cursor)
        if (this.lastline) {
            cursor.append(THINSPACE)
        }
        this.cursor = cursor
    }

    iscursorvisible(): boolean {
        const rect = this.cursor![0].getBoundingClientRect()
        return rect.bottom >= 0 && rect.top <= document.documentElement.clientHeight
    }

    onclick(ev: JQuery.ClickEvent) {
        if (this.inputs?.type) {
            // Check that the cursor is visible
            if (this.cursor && this.iscursorvisible()) {
                this.textinput.el.trigger('focus')
                return false
            }
        }
    }

    update(data: protocol.BufferWindowContentUpdate) {
        // TODO: detach character input?

        if (data.clear) {
            this.frameel.children('.BufferLine').remove()
            this.lastline = undefined
        }

        // If the text field is missing, just do nothing
        if (!data.text) {
            return
        }

        // Remove the cursor
        const oldscrolltop = (this.cursor?.position().top || 0) + this.frameel.scrollTop()! - 20
        if (this.cursor) {
            this.cursor.remove()
            delete this.cursor
        }

        for (const line of data.text) {
            const content = line.content
            let divel: JQuery<HTMLElement> | undefined
            if (line.append) {
                divel = this.lastline
            }
            if (!divel) {
                divel = create('div', 'BufferLine')
                this.frameel.append(divel)
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

            for (let i = 0; i < content.length; i++) {
                let run: protocol.TextRun
                const instruction = content[i]
                if (typeof instruction === 'string') {
                    run = {
                        style: content[i++] as string,
                        text: content[i] as string,
                    }
                }
                else if ('special' in instruction && instruction.special === 'image') {
                    // TODO: inline images
                    continue
                }
                else {
                    run = instruction as protocol.TextRun
                }
                divel.append(this.create_text_run(run))
            }
        }

        // Attach a new cursor
        if (this.lastline) {
            this.add_cursor()
        }

        // Scroll down
        this.frameel.scrollTop(oldscrolltop)
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
    private dom: DOM
    private metrics: protocol.NormalisedMetrics
    send_event: EventFunc

    constructor(dom: DOM, send_event: EventFunc, metrics: protocol.NormalisedMetrics) {
        super()
        this.dom = dom
        this.metrics = metrics
        this.send_event = send_event

        $(document).on('keydown', (ev: JQuery.KeyDownEvent) => this.onkeydown(ev))
    }

    cancel_inputs(windows: protocol.InputUpdate[]) {
        const newinputs: Record<number, protocol.InputUpdate> = {}
        for (const window of windows) {
            newinputs[window.id] = window
        }

        for (const win of this.values()) {
            const update = newinputs[win.id]
            if (!update && win.inputs) {
                delete win.inputs
            }
        }
    }

    // on document.keypress events, trigger a window with active text input
    onkeydown(ev: JQuery.KeyDownEvent) {
        if (ev.target.nodeName !== 'input') {
            for (const window of this.values()) {
                if (window.inputs?.type) {
                    window.frameel.trigger('click')
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
    }
}