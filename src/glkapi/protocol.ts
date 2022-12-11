/*

GlkOte protocol handler
=======================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as Protocol from '../common/protocol.js'

import {TimerData} from './common.js'
import {TextWindow, Window} from './windows.js'

interface UpdateOptions {
    disabled: boolean
    first_window: Window | null
    gen: number
    special?: Protocol.SpecialInput
    timer: TimerData
    windows_changed: boolean
}

/** Here we construct the whole GlkOte protocol update */
export function update(options: UpdateOptions) {
    const {first_window, special, timer} = options

    const state: Protocol.StateUpdate = {
        gen: options.gen,
        type: 'update',
    }

    if (options.disabled) {
        state.disable = true
    }

    // Window geometries
    if (options.windows_changed) {
        state.windows = []
        for (let win = first_window; win; win = win.next) {
            if (win.type === 'blank' || win.type === 'pair') {
                continue
            }
            const box = win.box
            const data: Protocol.WindowUpdate = {
                height: box.bottom - box.top,
                id: win.disprock,
                left: box.left,
                rock: win.rock,
                top: box.top,
                type: win.type,
                width: box.right - box.left,
            }
            switch (win.type) {
                case 'graphics':
                    data.graphheight = win.height
                    data.graphwidth = win.width
                    break
                case 'grid':
                    data.gridheight = win.height
                    data.gridwidth = win.width
                    // fall through
                case 'buffer':
                    // TODO: don't resend stylehints when only metrics have changed
                    data.styles = win.stylehints
                    break
            }
            state.windows.push(data)
        }
    }

    // Window content updates
    const content: Protocol.ContentUpdate[] = []
    for (let win = first_window; win; win = win.next) {
        let data: Protocol.ContentUpdate | undefined
        switch (win.type) {
            case 'buffer': {
                // Exclude empty text runs
                const paragraphs = win.content
                for (const par of paragraphs) {
                    par.content = par.content.filter((text) => 'special' in text || text.text)
                }
                // Only send an update if there is new content or the window has been cleared
                if (win.cleared || paragraphs.length > 1 || paragraphs[0].content.length) {
                    data = {
                        id: win.disprock,
                        // Send an empty object for a blank line
                        text: paragraphs.map(par => par.append || par.flowbreak || par.content.length ? par : {}),
                    }
                }
                win.clear_content()
                break
            }
            case 'graphics':
                if (win.draw.length) {
                    data = {
                        draw: win.draw,
                        id: win.disprock,
                    }
                    win.draw.length = 0
                }
                break
            case 'grid':
                if (win.lines.find(line => line.changed)) {
                    data = {
                        id: win.disprock,
                        lines: win.lines.flatMap((line, index) => {
                            if (!line.changed) {
                                return []
                            }
                            line.changed = false
                            return {
                                content: line.content.reduce((acc: Protocol.TextRun[], cur) => {
                                    if (!acc.length) {
                                        return [cur]
                                    }

                                    // Combine adjacent characters when they have the same textrun properties
                                    const last = acc[acc.length - 1]
                                    if (cur.css_styles === last.css_styles && cur.hyperlink === last.hyperlink && cur.style === last.style) {
                                        last.text += cur.text
                                    }
                                    else {
                                        acc.push(cur)
                                    }
                                    return acc
                                }, []),
                                line: index,
                            }
                        }),
                    }
                }
                break
        }
        if (data) {
            if (win.type === 'buffer' || win.type === 'grid') {
                if (win.cleared) {
                    (data as Protocol.TextualWindowUpdate).clear = true
                    win.cleared = false
                }
                // TODO: fg bg
            }

            content.push(data)
        }
    }
    if (content.length) {
        state.content = content
    }

    // Input requests
    const inputs: Protocol.InputUpdate[] = []
    for (let win = first_window; win; win = win.next) {
        const input = win.input
        const input_update: Protocol.InputUpdate = {
            id: input.id,
        }
        const copy_prop = (prop: keyof Protocol.InputUpdate) => {
            if (input[prop]) {
                (input_update[prop] as any) = input[prop]
            }
        }
        if (input.type) {
            copy_prop('gen')
            copy_prop('type')
            if (input.type === 'line') {
                input_update.maxlen = (win as TextWindow).line_input_buf!.length
                copy_prop('initial')
                copy_prop('terminators')
            }
            if (win.type === 'grid') {
                if (win.fit_cursor()) {
                    input_update.xpos = win.width - 1
                    input_update.ypos = win.height - 1
                }
                else {
                    input_update.xpos = win.x
                    input_update.ypos = win.y
                }
            }
        }
        copy_prop('hyperlink')
        copy_prop('mouse')
        if (input_update.hyperlink || input_update.mouse || input_update.type) {
            inputs.push(input_update)
        }

        // Clean up the partial output
        delete input.initial
    }
    if (inputs.length) {
        state.input = inputs
    }

    // TODO: Page BG colour

    // Special input
    if (special) {
        state.specialinput = special
    }

    // Timer
    if (timer.last_interval !== timer.interval) {
        state.timer = timer.interval || null
        timer.last_interval = timer.interval
    }

    // Autorestore state?

    return state
}