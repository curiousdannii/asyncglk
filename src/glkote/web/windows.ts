/*

GlkOte windows
==============

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {NBSP} from '../../common/constants.js'
import * as protocol from '../../common/protocol.js'

import {TextInput} from './input.js'
import {create, DOM} from './shared.js'

type EventFunc = (event: protocol.Event) => void

type Window = BufferWindow | GraphicsWindow | GridWindow

export abstract class WindowBase {
    desired: boolean = true
    dom: DOM
    frameel: JQuery<HTMLElement>
    id: number
    inputs?: protocol.InputUpdate
    metrics: protocol.Metrics
    rock: number
    send_event: EventFunc
    textinput?: TextInput
    abstract type: 'buffer' | 'graphics' | 'grid'

    constructor(options: {
        dom: DOM,
        frameel: JQuery<HTMLElement>,
        id: number,
        metrics: protocol.Metrics,
        rock: number,
        send_event: EventFunc,
    }) {
        this.dom = options.dom
        this.frameel = options.frameel
        this.id = options.id
        this.metrics = options.metrics
        this.rock = options.rock
        this.send_event = options.send_event
    }

    destroy() {
        if (this.textinput) {
            this.textinput.destroy()
        }
        this.frameel.remove()
    }

    update_input() {
        if (!this.textinput) {
            this.textinput = new TextInput(this)
        }
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
    lastline?: JQuery<HTMLElement>

    add_cursor(): JQuery<HTMLElement> {
        const cursor = this.dom.create('span', `win${this.id}_cursor`, 'InvisibleCursor')
        cursor.append(NBSP)
        const container = this.lastline || this.frameel
        container.append(cursor)
        return cursor
    }

    update(data: protocol.BufferWindowContentUpdate) {
        // TODO: detach character input?

        if (data.clear) {
            this.frameel.empty()
            this.lastline = undefined
        }

        // If the text field is missing, just do nothing
        if (!data.text) {
            return
        }

        // Detach input and remove the cursor
        if (this.textinput) {
            this.textinput.el.detach()
        }
        this.dom.id(`win${this.id}_cursor`).remove()

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

        // Attach a new cursor and the input if it exists
        if (this.lastline) {
            const cursor = this.add_cursor()
            if (this.textinput) {
                cursor.append(this.textinput.el)
            }
        }
    }

    update_input() {
        super.update_input()

        let cursor = this.dom.id(`win${this.id}_cursor`)
        if (!cursor.length) {
            cursor = this.add_cursor()
        }
        const pos = cursor.position()
        const width = Math.max(200, this.frameel.width()! - (this.metrics.buffermarginx! + pos.left + 2))
        this.textinput!.el.css('width', `${width}px`)
        cursor.append(this.textinput!.el)
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
    private metrics: protocol.Metrics
    private send_event: EventFunc

    constructor(dom: DOM, send_event: EventFunc, metrics: protocol.Metrics) {
        super()
        this.dom = dom
        this.metrics = metrics
        this.send_event = send_event
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
                if (win.textinput) {
                    win.textinput.destroy()
                    delete win.textinput
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
            let frameel

            // Create it if not
            if (!win) {
                // GlkOte added class HasNoInputField - is it necessary?
                frameel = this.dom.create('div', `window${id}`, `WindowFrame ${window_types[type]} WindowRock_${rock}`)
                // TODO: attach mousedown handler, scrolling handler, etc

                const options = {
                    dom: this.dom,
                    frameel,
                    id,
                    metrics: this.metrics,
                    rock,
                    send_event: this.send_event,
                }

                switch (type) {
                    case 'buffer': {
                        frameel.attr({
                            'aria-atomic': 'false',
                            'aria-live': 'polite',
                            'aria-relevant': 'additions',
                        })
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
                this.dom.windowport().append(frameel)
            }
            else {
                if (win.type !== type) {
                    throw new Error(`Window ${id} was created with type ${win.type}, but now is described as type ${type}`)
                }
                frameel = win.frameel
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
            frameel.css({
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
                    win.update_input()
                }
            }
            else if (win.textinput) {
                win.textinput.destroy()
                delete win.textinput
            }
        }
    }
}