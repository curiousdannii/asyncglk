/*

Glk Streams
===========

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {GlkTypedArray, is_unicode_array} from './common.js'
import {
    //filemode_Write,
    filemode_Read,
    filemode_ReadWrite,
    filemode_WriteAppend,
    //seekmode_Start,
    seekmode_Current,
    seekmode_End,
    GLK_NULL,
    MAX_LATIN1,
    QUESTION_MARK,
} from './constants.js'
import {GlkStream, RefStruct} from './interface.js'

export interface Stream extends GlkStream {
    next_str: Stream | null
    prev_str: Stream | null
    rock: number
    close(result?: RefStruct): void
    get_buffer(buf: GlkTypedArray): number
    get_char(unicode: boolean): number
    get_line(buf: GlkTypedArray): number
    get_position(): number
    put_buffer(buf: GlkTypedArray): void
    put_char(ch: number): void
    put_string(str: string): void
    set_position(mode: number, pos: number): void
}

/** A fixed-length TypedArray backed stream */
export class ArrayBackedStream implements Stream {
    private buf: GlkTypedArray
    private close_cb?: () => void
    private fmode: number
    private len: number
    next_str = null
    private pos = 0
    prev_str = null
    private read_count = 0
    rock: number
    private uni: boolean
    private write_count = 0

    constructor(buf: GlkTypedArray, fmode: number, rock: number, close_cb?: () => void) {
        this.buf = buf
        this.close_cb = close_cb
        this.fmode = fmode
        this.len = buf.length
        this.rock = rock
        this.uni = is_unicode_array(buf)
        if (fmode === filemode_WriteAppend) {
            this.set_position(seekmode_End, 0)
        }
    }

    close(result?: RefStruct) {
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
        if (is_unicode_array(buf) && this.uni) {
            for (let i = 0; i < read_length; i++) {
                const ch = this.buf[this.pos + i]
                buf[i] = ch > MAX_LATIN1 ? QUESTION_MARK : ch
            }
        }
        // Otherwise we can copy it whole
        else {
            buf.set(this.buf.subarray(this.pos, read_length))
        }
        this.pos += read_length
        this.read_count += read_length
        return read_length
    }

    get_char(unicode: boolean): number {
        if (this.fmode !== filemode_Read && this.fmode !== filemode_ReadWrite) {
            throw new Error ('Cannot read from write-only stream')
        }
        this.read_count++
        if (this.pos < this.len) {
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
        const check_unicode = is_unicode_array(buf) && this.uni
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

    put_buffer(buf: GlkTypedArray) {
        if (this.fmode === filemode_Read) {
            throw new Error('Cannot write to read-only stream')
        }
        const write_length = Math.min(buf.length, this.len - this.pos)
        // When writing a unicode array into a latin1 array we must catch non-latin1 characters
        if (is_unicode_array(buf) && !this.uni) {
            for (let i = 0; i < write_length; i++) {
                const ch = buf[i]
                this.buf[this.pos + i] = ch > MAX_LATIN1 ? QUESTION_MARK  : ch
            }
        }
        // Otherwise we can copy it whole
        else {
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
        this.put_buffer(Uint32Array.from(str, ch => ch.codePointAt(0)!))
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