/*

GlkApi
======

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as Interface from './interface.js'
import {GlkByteArray, GlkWordArray} from './interface.js'
import {Stream} from './streams.js'

function ByteToUint8Array(arr: GlkByteArray) {
    return arr instanceof Uint8Array ? arr : Uint8Array.from(arr)
}
function WordToUint32Array(arr: GlkWordArray) {
    return arr instanceof Uint32Array ? arr : Uint32Array.from(arr)
}

export class RefBox implements Interface.RefBox {
    private value = 0
    get_value() {
        return this.value
    }
    set_value(val: number) {
        this.value = val
    }
}

type RefStructValue = Interface.RefStructValue
export class RefStruct implements Interface.RefStruct {
    private fields: RefStructValue[] = []
    get_field(index: number): RefStructValue {
        return this.fields[index]
    }
    get_fields(): RefStructValue[] {
        return this.fields
    }
    push_field(val: RefStructValue) {
        this.fields.push(val)
    }
    set_field(index: number, val: RefStructValue) {
        this.fields[index] = val
    }
}

export class AsyncGlk implements Partial<Interface.GlkApiAsync> {
    private current_stream: Stream | null = null
    private first_stream: Stream | null = null

    // Extra functions
    glk_put_jstring(val: string, _all_bytes?: boolean) {
        this.glk_put_jstring_stream(this.current_stream!, val)
    }

    glk_put_jstring_stream(str: Stream, val: string, _all_bytes?: boolean) {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        str.put_string(val)
    }

    // The Glk functions

    glk_get_buffer_stream(str: Stream, buf: GlkByteArray): number {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        return str.get_buffer(ByteToUint8Array(buf))
    }

    glk_get_buffer_stream_uni(str: Stream, buf: GlkWordArray): number {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        return str.get_buffer(WordToUint32Array(buf))
    }

    glk_get_char_stream(str: Stream): number {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        return str.get_char(false)
    }

    glk_get_char_stream_uni(str: Stream): number {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        return str.get_char(true)
    }

    glk_get_line_stream(str: Stream, buf: GlkByteArray): number {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        return str.get_line(ByteToUint8Array(buf))
    }

    glk_get_line_stream_uni(str: Stream, buf: GlkWordArray): number {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        return str.get_line(WordToUint32Array(buf))
    }

    glk_put_buffer(val: GlkByteArray) {
        this.glk_put_buffer_stream(this.current_stream!, val)
    }

    glk_put_buffer_stream(str: Stream, val: GlkByteArray) {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        str.put_buffer(ByteToUint8Array(val))
    }

    glk_put_buffer_stream_uni(str: Stream, val: GlkWordArray) {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        str.put_buffer(WordToUint32Array(val))
    }

    glk_put_buffer_uni(val: GlkWordArray) {
        this.glk_put_buffer_stream_uni(this.current_stream!, val)
    }

    glk_put_char(val: number) {
        this.glk_put_char_stream(this.current_stream!, val)
    }

    glk_put_char_stream(str: Stream, val: number) {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        str.put_char(val)
    }

    glk_put_char_stream_uni(str: Stream, val: number) {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        str.put_char(val)
    }

    glk_put_char_uni(val: number) {
        this.glk_put_char_stream_uni(this.current_stream!, val)
    }

    glk_put_string(val: string) {
        this.glk_put_string_stream(this.current_stream!, val)
    }

    glk_put_string_stream(str: Stream, val: string) {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        str.put_string(val)
    }

    glk_put_string_stream_uni(str: Stream, val: string) {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        str.put_string(val)
    }

    glk_put_string_uni(val: string) {
        this.glk_put_string_stream_uni(this.current_stream!, val)
    }

    glk_stream_get_current(): Stream | null {
        return this.current_stream
    }

    glk_stream_get_position(str: Stream): number {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        return str.get_position()
    }

    glk_stream_get_rock(str: Stream): number {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        return str.rock
    }

    glk_stream_iterate(str?: Stream, rockbox?: RefBox): Stream | null {
        const next_stream = str ? str.next_str : this.first_stream
        if (rockbox) {
            rockbox.set_value(next_stream ? next_stream.rock : 0)
        }
        return next_stream
    }

    glk_stream_set_current(str: Stream | null) {
        this.current_stream = str
    }

    glk_stream_set_position(str: Stream, pos: number, seekmode: number) {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        str.set_position(seekmode, pos)
    }
}