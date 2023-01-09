/*

Glk Streams
===========

Copyright (c) 2023 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {GlkTypedArray, is_unicode_array} from '../common/misc.js'

import {filemode_Read, filemode_ReadWrite, seekmode_Current, seekmode_End} from './constants.js'
import {FileRef} from './filerefs.js'
import {GlkArray, GlkStream, RefStructArg} from './interface.js'
import {GLK_NULL, MAX_LATIN1, QUESTION_MARK} from './lib_constants.js'
import {Window} from './windows.js'

export type Stream = ArrayBackedStream | FileStream | WindowStream
type StreamType = 'array' | 'window'

abstract class StreamBase implements GlkStream {
    disprock?: number
    next: Stream | null = null
    prev: Stream | null = null
    rock = 0
    abstract type: StreamType
    protected write_count = 0

    abstract close(result?: RefStructArg): void
    abstract get_buffer(buf: GlkTypedArray): number
    abstract get_char(unicode: boolean): number
    abstract get_line(buf: GlkTypedArray): number
    abstract get_position(): number
    abstract put_buffer(buf: GlkArray, uni: boolean): void
    abstract put_char(ch: number): void
    abstract put_string(str: string, style?: string): void
    abstract set_position(mode: number, pos: number): void
}

/** A fixed-length TypedArray backed stream */
export class ArrayBackedStream extends StreamBase {
    protected buf: GlkTypedArray
    private close_cb?: () => void
    private fmode: number
    protected len: number
    protected pos = 0
    private read_count = 0
    type = 'array' as const
    protected uni: boolean

    constructor(buf: GlkTypedArray, fmode: number, rock: number, close_cb?: () => void) {
        super()
        this.buf = buf
        this.close_cb = close_cb
        this.fmode = fmode
        this.len = buf.length
        this.rock = rock
        this.uni = is_unicode_array(buf)
    }

    close(result?: RefStructArg) {
        this.close_cb?.()
        if (result) {
            result.set_field(0, this.read_count)
            result.set_field(1, this.write_count)
        }
    }

    get_buffer(buf: GlkTypedArray): number {
        if (this.fmode !== filemode_Read && this.fmode !== filemode_ReadWrite) {
            throw new Error ('Cannot read from write-only stream')
        }
        const read_length = Math.min(buf.length, this.len - this.pos)
        // When a unicode array is read into a latin1 array we must catch non-latin1 characters
        if (!is_unicode_array(buf) && this.uni) {
            for (let i = 0; i < read_length; i++) {
                const ch = this.buf[this.pos + i]
                buf[i] = ch > MAX_LATIN1 ? QUESTION_MARK : ch
            }
        }
        // Otherwise we can copy it whole
        else {
            buf.set(this.buf.subarray(this.pos, this.pos + read_length))
        }
        this.pos += read_length
        this.read_count += read_length
        return read_length
    }

    get_char(unicode: boolean): number {
        if (this.fmode !== filemode_Read && this.fmode !== filemode_ReadWrite) {
            throw new Error ('Cannot read from write-only stream')
        }
        if (this.pos < this.len) {
            this.read_count++
            const ch = this.buf[this.pos++]
            return !unicode && ch > MAX_LATIN1 ? QUESTION_MARK : ch
        }
        return -1
    }

    get_line(buf: GlkTypedArray): number {
        if (this.fmode !== filemode_Read && this.fmode !== filemode_ReadWrite) {
            throw new Error ('Cannot read from write-only stream')
        }
        const read_length = Math.min(buf.length - 1, this.len - this.pos)
        if (read_length < 0) {
            return 0
        }
        const check_unicode = !is_unicode_array(buf) && this.uni
        let i = 0
        while (i < read_length) {
            const ch = this.buf[this.pos++]
            buf[i++] = check_unicode && ch > MAX_LATIN1 ? QUESTION_MARK : ch
            if (ch === 10) {
                break
            }
        }
        buf[i] = GLK_NULL
        this.read_count += i
        return i
    }

    get_position(): number {
        return this.pos
    }

    put_buffer(buf: GlkArray, uni: boolean) {
        if (this.fmode === filemode_Read) {
            throw new Error('Cannot write to read-only stream')
        }
        const write_length = Math.min(buf.length, this.len - this.pos)
        // When writing a unicode array into a latin1 array we must catch non-latin1 characters
        if (uni && !this.uni) {
            for (let i = 0; i < write_length; i++) {
                const ch = buf[i]
                this.buf[this.pos + i] = ch > MAX_LATIN1 ? QUESTION_MARK : ch
            }
        }
        // Otherwise we can copy it whole
        else {
            if (Array.isArray(buf)) {
                buf = (uni ? Uint32Array : Uint8Array).from(buf)
            }
            this.buf.set(buf.subarray(0, write_length), this.pos)
        }
        this.pos += write_length
        this.write_count += buf.length
    }

    put_char(ch: number) {
        if (this.fmode === filemode_Read) {
            throw new Error('Cannot write to read-only stream')
        }
        this.write_count++
        if (this.pos < this.len) {
            this.buf[this.pos++] = (!this.uni && ch > MAX_LATIN1) ? QUESTION_MARK : ch
        }
    }

    put_string(str: string) {
        this.put_buffer(Uint32Array.from(str, ch => ch.codePointAt(0)!), true)
    }

    set_position(mode: number, pos: number) {
        if (mode === seekmode_Current) {
            this.pos += pos
        }
        else if (mode ===  seekmode_End) {
            this.pos = this.len + pos
        }
        // Default to start if the mode is invalid
        else {
            this.pos = pos
        }
        if (this.pos < 0) {
            this.pos = 0
        }
        if (this.pos > this.len) {
            this.pos = this.len
        }
    }
}

/** FileStreams are based on array backed streams, but can grow in length */
export class FileStream extends ArrayBackedStream {
    private fref: FileRef

    constructor(fref: FileRef, buf: GlkTypedArray, fmode: number, rock: number) {
        super(buf, fmode, rock)
        this.fref = fref
    }

    close(result?: RefStructArg) {
        this.write()
        super.close(result)
    }

    private expand(increase: number) {
        const end_pos = this.pos + increase
        if (end_pos > this.len) {
            this.len = end_pos
            let maxlen = this.buf.length
            if (end_pos > maxlen) {
                // Always expand by at least 100
                maxlen += Math.max(end_pos - maxlen, 100)
                const old_buf = this.buf
                this.buf = new (this.uni ? Uint32Array : Uint8Array)(maxlen)
                this.buf.set(old_buf)
            }
        }
    }

    put_buffer(buf: GlkArray, uni: boolean) {
        this.expand(buf.length)
        super.put_buffer(buf, uni)
        this.write()
    }

    put_char(ch: number) {
        this.expand(1)
        super.put_char(ch)
        this.write()
    }

    write() {
        this.fref.write(this.buf.subarray(0, this.len))
    }
}

/** Window streams operate a little bit differently */
export class WindowStream extends StreamBase {
    type = 'window' as const
    private win: Window

    constructor(win: Window) {
        super()
        this.win = win
    }

    close(result?: RefStructArg) {
        if (result) {
            result.set_field(0, 0)
            result.set_field(1, this.write_count)
        }
    }

    get_buffer(_buf: GlkTypedArray): number {
        return 0
    }

    get_char(_unicode: boolean): number {
        return -1
    }

    get_line(_buf: GlkTypedArray): number {
        return 0
    }

    get_position(): number {
        return 0
    }

    put_buffer(buf: GlkArray, uni: boolean) {
        if (this.win.input.type === 'line') {
            throw new Error('Window has pending line request')
        }
        this.write_count += buf.length
        this.win.put_string(String.fromCodePoint(...buf))
        this.win.echo_str?.put_buffer(buf, uni)
    }

    put_char(ch: number) {
        if (this.win.input.type === 'line') {
            throw new Error('Window has pending line request')
        }
        this.write_count++
        this.win.put_string(String.fromCodePoint(ch))
        this.win.echo_str?.put_char(ch)
    }

    put_string(str: string, style?: string) {
        if (this.win.input.type === 'line') {
            throw new Error('Window has pending line request')
        }
        this.write_count += [...str].length
        this.win.put_string(str, style)
        this.win.echo_str?.put_string(str, style)
    }

    set_css(name: string, val?: string | number) {
        this.win.set_css(name, val)
        if (this.win.echo_str?.type === 'window') {
            this.win.echo_str.set_css(name, val)
        }
    }

    set_hyperlink(val: number) {
        this.win.set_hyperlink(val)
        if (this.win.echo_str?.type === 'window') {
            this.win.echo_str.set_hyperlink(val)
        }
    }

    set_position(_mode: number, _pos: number) {}

    set_style(style: string) {
        this.win.set_style(style)
        if (this.win.echo_str?.type === 'window') {
            this.win.echo_str.set_style(style)
        }
    }
}