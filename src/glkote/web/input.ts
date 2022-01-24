/*

GlkOte input handlers
=====================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/
import {throttle} from 'lodash-es'

import {KEY_CODES_TO_NAMES, KEY_NAMES_TO_CODES, OFFSCREEN_OFFSET} from '../../common/constants.js'
import * as protocol from '../../common/protocol.js'

import WindowManager, {Window} from './windows.js'

export class TextInput {
    el: JQuery<HTMLElement>
    is_line = false
    window: Window

    constructor(window: Window) {
        this.window = window

        this.el = $('<input>', {
            'aria-live': 'off',
            autocapitalize: 'off',
            blur: () => this.onblur(),
            class: 'Input',
            data: {
                window,
            },
            focus: () => this.onfocus(),
            type: 'text',
        })
        window.frameel.append(this.el)
    }

    destroy() {
        this.el.remove()
    }

    private onblur() {
        scroll_window()
    }

    private onfocus() {
        // Ensure a buffer window is scrolled down
        if (this.window.type === 'buffer') {
            this.window.frameel.scrollTop(this.window.innerel.height()!)
        }
        // Scroll the browser window over the next 600ms
        scroll_window()
    }

    /** The keydown and keypress inputs are unreliable in mobile browsers with virtual keyboards. This handler can handle character input for printable characters, but not function/arrow keys */
    private oninput(ev: any) {
        // This input shouldn't be active
        if (!this.window.inputs?.type) {
            this.el.trigger('blur')
            return false
        }

        if (this.window.inputs.type === 'char') {
            const char = ev.target.value[0]
            this.submit_char(char)
            // Even though we have reset and emptied the input, Android acts as though it still has spaces within it, and won't send backspace keydown events until the phantom spaces have all been deleted. Refocusing seems to fix it.
            if (char === ' ') {
                this.el.trigger('blur').trigger('focus')
            }
            return false
        }
    }

    private onkeydown(ev: JQuery.KeyDownEvent) {
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

    private onkeypress(ev: JQuery.KeyPressEvent) {
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

    /** Refocus the input, if it wouldn't obscure part of the update */
    // On Android this forces the window to be scrolled down to the bottom, so only refocus if the virtual keyboard doesn't make the window too small for the full update text to be seen
    refocus() {
        if (this.window.type === 'buffer') {
            const updateheight = this.window.innerel.outerHeight()! - this.window.updatescrolltop
            if (updateheight > this.window.visibleheight) {
                return
            }
        }
        this.el[0].focus({preventScroll: true})
    }

    reset() {
        this.el
            .css({
                'left': OFFSCREEN_OFFSET,
                'top': '',
                'width': '',
            })
            .off('input keydown keypress')
            .removeClass('LineInput')
            .val('')
        const inputparent = this.window.type === 'buffer' ? this.window.innerel : this.window.frameel
        if (!this.el.parent().is(inputparent)) {
            this.el.appendTo(inputparent)
        }
    }

    private submit_char(val: string) {
        this.window.send_text_event({
            type: 'char',
            value: val,
        })
    }

    private submit_line(val: string, terminator?: protocol.TerminatorCode) {
        // TODO: history

        this.window.send_text_event({
            type: 'line',
            terminator,
            value: val,
        })
    }

    update() {
        // If this is called, then any existing input handlers are out of date and need to be removed
        this.reset()

        const update = this.window.inputs!
        if (update.type !== 'char' && update.type !== 'line') {
            return
        }
        this.is_line = update.type === 'line'

        this.el
            .attr({
                maxlength: this.is_line ? update.maxlen! : 1
            })
            .on('keydown', (ev: JQuery.KeyDownEvent) => this.onkeydown(ev))
            .on('keypress', (ev: JQuery.KeyPressEvent) => this.onkeypress(ev))

        // For character input attach the oninput handler, then stop
        if (!this.is_line) {
            this.el.on('input', (ev: any) => this.oninput(ev))
            return
        }
        if (this.window.type === 'graphics') {
            throw new Error(`Cannot request line input in graphics window ${this.window.id}`)
        }

        // Position the input element within the window
        switch (this.window.type) {
            case 'buffer':
                this.el.addClass('LineInput')
                ;(this.window.lastline || this.window.innerel).append(this.el)
                break
            case 'grid':
                this.el.css({
                    left: update.ypos! * this.window.metrics.gridcharwidth,
                    top: update.xpos! * this.window.metrics.gridcharheight,
                    width: `${update.maxlen}em`,
                })
                break
        }
        this.el.val(update.initial || '')

        // TODO: set colours and reverse
    }
}

/* A little helper function to repeatedly scroll the window, because iOS sometimes scrolls badly
   On iOS, when focusing the soft keyboard, the keyboard animates in over 500ms
   This would normally cover up the focused input, so iOS cleverly tries to
   scroll the top-level window down to bring the input into the view
   But we know better: we want to scroll the input's window frame to the bottom,
   without scrolling the top-level window at all. */
const scroll_window = throttle(() => {
    function do_scroll(count: number) {
        window.scrollTo(0, 0)
        if (count > 0) {
            setTimeout(do_scroll, 50, count - 1)
        }
    }
    do_scroll(12)
}, 1000)