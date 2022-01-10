/*

GlkOte windows
==============

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {NBSP} from '../../common/constants.js'
import * as protocol from '../../common/protocol.js'

import {create, DOM} from './shared.js'

type Window = BufferWindow | GraphicsWindow | GridWindow

abstract class WindowBase {
    desired: boolean = true
    frameel: JQuery<HTMLElement>
    id: number
    rock: number
    abstract type: 'buffer' | 'graphics' | 'grid'

    constructor(options: {
        frameel: JQuery<HTMLElement>,
        id: number,
        rock: number,
    }) {
        this.frameel = options.frameel
        this.id = options.id
        this.rock = options.rock
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

    update(data: protocol.BufferWindowContentUpdate) {
        // TODO: detach character input?

        if (data.clear) {
            this.frameel.empty()
        }

        // If the text field is missing, just do nothing
        if (!data.text) {
            return
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
    }
}

class GraphicsWindow extends WindowBase {
    type: 'graphics' = 'graphics'
    height = 0
    width = 0

    update(data: protocol.GraphicsWindowContentUpdate) {
        
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

    constructor(dom: DOM, metrics: protocol.Metrics) {
        super()
        this.dom = dom
        this.metrics = metrics
    }

    update(windows: protocol.WindowUpdate[]) {
        // Mark all windows as non-desired
        for (const win of this.values()) {
            win.desired = false
        }

        // Go through each window in this update
        for (const update of windows) {
            // Is there an existing window?
            let win = this.get(update.id)
            let frameel

            // Create it if not
            if (!win) {
                // GlkOte added class HasNoInputField - is it necessary?
                frameel = this.dom.create('div', `window${update.id}`, `WindowFrame ${window_types[update.type]} WindowRock_${update.rock}`)
                // TODO: attach mousedown handler, scrolling handler, etc

                switch (update.type) {
                    case 'buffer': {
                        frameel.attr({
                            'aria-atomic': 'false',
                            'aria-live': 'polite',
                            'aria-relevant': 'additions',
                        })
                        win = new BufferWindow({
                            frameel,
                            id: update.id,
                            rock: update.rock,
                        })
                        break
                    }
                    case 'graphics': {
                        //const canvas = this.dom.create('canvas', `win${update.id}_canvas`)
                        win = new GraphicsWindow({
                            frameel,
                            id: update.id,
                            rock: update.rock,
                        })
                        break
                    }
                    case 'grid': {
                        win = new GridWindow({
                            frameel,
                            id: update.id,
                            rock: update.rock,
                        })
                        break
                    }
                }

                this.set(update.id, win)
                this.dom.windowport().append(frameel)
            }
            else {
                if (win.type !== update.type) {
                    throw new Error(`Window ${update.id} was created with type ${win.type}, but now is described as type ${update.type}`)
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
            win.frameel.remove()
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
}