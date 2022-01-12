/*

GlkOte input handlers
=====================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {KEY_CODES_TO_NAMES, KEY_NAMES_TO_CODES, OFFSCREEN_OFFSET} from '../../common/constants.js'
import * as protocol from '../../common/protocol.js'

import WindowManager, {Window} from './windows.js'

export class TextInput {
    arrange_handler: (ev: any) => void
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
            type: 'text',
        })
        window.frameel.append(this.el)

        this.arrange_handler = () => this.position()
        $(document).on('glkote-arrange', this.arrange_handler)
    }

    destroy() {
        this.el.remove()
        $(document).off('glkote-arrange', this.arrange_handler)
    }

    onkeydown(ev: JQuery.KeyDownEvent) {
        // This input shouldn't be active
        if (!this.window.inputs?.type) {
            this.el.trigger('blur')
            return false
        }

        const keycode = ev.which
        if (!keycode) {
            return
        }

        if (this.is_line) {
            // History
            if (keycode === KEY_NAMES_TO_CODES.down || keycode === KEY_NAMES_TO_CODES.up) {
                // TODO
            }

            // Terminator for this input
            else if (this.window.inputs!.terminators) {
                const terminator = KEY_CODES_TO_NAMES[keycode] as protocol.TerminatorCode
                if (this.window.inputs!.terminators.includes(KEY_CODES_TO_NAMES[keycode] as protocol.TerminatorCode)) {
                    this.submit_line(ev.target.value, terminator)
                    return false
                }
            }
        }
        // Character input
        else {
            const code = KEY_CODES_TO_NAMES[keycode]
            if (code) {
                this.submit_char(code)
                return false
            }
        }

        // Don't propagate, so that document.keydown doesn't trigger
        ev.stopPropagation()
    }

    onkeypress(ev: JQuery.KeyPressEvent) {
        // This input shouldn't be active
        if (!this.window.inputs?.type) {
            this.el.trigger('blur')
            return false
        }

        const keycode = ev.which
        if (!keycode) {
            return
        }

        // Submit line input
        if (this.is_line) {
            if (keycode === KEY_NAMES_TO_CODES.return) {
                this.submit_line(ev.target.value)
                return false
            }
        }
        // Character input
        else {
            const code = keycode === KEY_NAMES_TO_CODES.return ? 'return' : String.fromCharCode(keycode)
            this.submit_char(code)
            return false
        }
    }

    position() {
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
            case 'graphics':
                throw new Error(`Cannot request line input in graphics window ${this.window.id}`)
            case 'grid':
                // TODO
                return
                break
        }

        this.el.css({
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
        })
    }

    reset() {
        this.el
            .css('left', OFFSCREEN_OFFSET)
            .off('keydown keypress')
            .val('')
    }

    submit_char(val: string) {
        this.reset()
        this.window_manager.send_event({
            type: 'char',
            value: val,
            window: this.window.id,
        })
    }

    submit_line(val: string, terminator?: protocol.TerminatorCode) {
        this.reset()

        // TODO: history

        this.window_manager.send_event({
            type: 'line',
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

        this.el
            .attr({
                maxlength: this.is_line ? update.maxlen! : 1
            })
            .on('keydown', (ev: JQuery.KeyDownEvent) => this.onkeydown(ev))
            .on('keypress', (ev: JQuery.KeyPressEvent) => this.onkeypress(ev))

        // Stop here on character input
        if (!this.is_line) {
            return
        }
        if (this.window.type === 'graphics') {
            throw new Error(`Cannot request line input in graphics window ${this.window.id}`)
        }

        this.position()
        this.el.val(update.initial || '')

        // TODO: set colours and reverse
    }
}