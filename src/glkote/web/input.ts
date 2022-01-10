/*

GlkOte input handlers
=====================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {WindowBase} from './windows.js'

export class TextInput {
    el: JQuery<HTMLElement>
    type: 'char' | 'line' = 'char'
    window: WindowBase

    constructor(window: WindowBase) {
        this.window = window

        this.el = $('<input>', {
            'aria-live': 'off',
            autocapitalize: 'off',
            class: 'Input',
            id: `win${this.window.id}_input`,
            keypress: (ev: JQuery.KeyPressEvent) => this.keypress(ev),
            type: 'text',
        })
        if ('ontouchstart' in window) {
            // TODO: internationalise?
            this.el.attr('placeholder', 'Tap here to type')
        }
    }

    destroy() {
        this.el.remove()
    }

    keypress(ev: JQuery.KeyPressEvent) {
        const keycode = ev.which

        // Submit line input
        if (this.type === 'line' && keycode === 13) {
            this.submit_line(ev.target.value)
            return false
        }
    }

    submit_line(val: string, terminator?: string) {
        // TODO: history

        this.window.send_event({
            type: 'line',
            gen: this.window.inputs!.gen!,
            terminator,
            value: val,
            window: this.window.id,
        })
    }

    update() {
        const update = this.window.inputs!
        if (update.type !== 'char' && update.type !== 'line') {
            throw new Error(`Invalid input update given to TextInput win${this.window.id}_input`)
        }
        if (update.type === 'line' && this.window.type === 'graphics') {
            throw new Error(`Cannot request line input in graphcis window ${this.window.id}`)
        }
        this.type = update.type

        this.el
            .removeClass('CharInput LineInput')
            .addClass(this.type === 'char' ? 'CharInput' : 'LineInput')
            .attr({
                maxlength: this.type === 'char' ? 1 : update.maxlen!
            })
            .val(update.initial || '')

        // TODO: set colours and reverse
    }
}