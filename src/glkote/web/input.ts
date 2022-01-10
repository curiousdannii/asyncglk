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
        if (update.initial) {
            this.el.val(update.initial)
        }

        // TODO: set colours and reverse
    }
}