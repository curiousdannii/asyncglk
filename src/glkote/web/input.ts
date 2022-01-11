/*

GlkOte input handlers
=====================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {OFFSCREEN_OFFSET} from '../../common/constants.js'

import WindowManager, {Window} from './windows.js'

export class TextInput {
    el: JQuery<HTMLElement>
    is_line = false
    window: Window
    window_manager: WindowManager

    constructor(window: Window, manager: WindowManager) {
        this.window = window
        this.window_manager = manager

        this.el = $('<input>', {
            'aria-live': 'off',
            autocapitalize: 'off',
            class: 'Input',
            keypress: (ev: JQuery.KeyPressEvent) => this.onkeypress(ev),
            type: 'text',
        })
        window.frameel.append(this.el)
    }

    destroy() {
        this.el.remove()
    }

    //onkeydown
    // Don't propagate, so that document.keydown doesn't trigger

    onkeypress(ev: JQuery.KeyPressEvent) {
        const keycode = ev.which

        // Submit line input
        if (this.is_line && keycode === 13) {
            const value = ev.target.value
            this.reset()
            this.submit_line(value)
            return false
        }
    }

    reset() {
        this.el
            .css('left', OFFSCREEN_OFFSET)
            .val('')
    }

    submit_line(val: string, terminator?: string) {
        // TODO: history

        this.window_manager.send_event({
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
            throw new Error(`Invalid input update given to TextInput for window ${this.window.id}`)
        }
        this.is_line = update.type === 'line'
        this.el.attr({
            maxlength: this.is_line ? update.maxlen! : 1
        })

        // Stop here on character input
        if (!this.is_line) {
            return
        }
        if (this.window.type === 'graphics') {
            throw new Error(`Cannot request line input in graphics window ${this.window.id}`)
        }

        // Calculate the position
        let left: number, top: number, width: number
        switch (this.window.type) {
            case 'buffer':
                if (!this.window.cursor) {
                    this.window.add_cursor()
                }
                const cursor = this.window.cursor!
                const frameel = this.window.frameel
                const pos = cursor.position()
                left = pos.left + cursor.width()!
                top = pos.top + frameel.scrollTop()!
                width = Math.max(200, frameel.width()! - (this.window.metrics.buffermarginx + left + 2))
                break
            case 'grid':
                // TODO
                return
                break
        }

        this.el
            .css({
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
            })
            .val(update.initial || '')

        // TODO: set colours and reverse
    }
}