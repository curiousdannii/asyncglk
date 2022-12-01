/*

GlkApi
======

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {default as Blorb} from '../blorb/blorb.js'
import {utf8decoder} from '../common/misc.js'

import {GlkTypedArray, GlkTypedArrayConstructor, Uint8Array_to_Uint32Array} from './common.js'
import {filemode_Read, filemode_ReadWrite, filemode_Write} from './constants.js'
import * as Interface from './interface.js'
import {GlkArray, GlkByteArray, GlkWordArray, RefStructValue} from './interface.js'
import {ArrayBackedStream, Stream} from './streams.js'

export class RefBox implements Interface.RefBox {
    private value = 0
    get_value() {
        return this.value
    }
    set_value(val: number) {
        this.value = val
    }
}

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
    private Blorb?: Blorb
    private GiDispa?: Interface.GiDispa

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
        if (Array.isArray(buf)) {
            return wrap_for_array(buf, Uint8Array, arr => str.get_buffer(arr))
        }
        else {
            return str.get_buffer(buf)
        }
    }

    glk_get_buffer_stream_uni(str: Stream, buf: GlkWordArray): number {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        if (Array.isArray(buf)) {
            return wrap_for_array(buf, Uint32Array, arr => str.get_buffer(arr))
        }
        else {
            return str.get_buffer(buf)
        }
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
        if (Array.isArray(buf)) {
            // Handle the NULL byte by adding and subtracting 1 to the read length
            return wrap_for_array(buf, Uint8Array, arr => str.get_line(arr) + 1) - 1
        }
        else {
            return str.get_line(buf)
        }
    }

    glk_get_line_stream_uni(str: Stream, buf: GlkWordArray): number {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        if (Array.isArray(buf)) {
            // Handle the NULL byte by adding and subtracting 1 to the read length
            return wrap_for_array(buf, Uint32Array, arr => str.get_line(arr) + 1) - 1
        }
        else {
            return str.get_line(buf)
        }
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


    glk_stream_close(str: Stream, result?: RefStruct) {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        str.close(result)
        this.unregister_stream(str)
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
        rockbox?.set_value(next_stream ? next_stream.rock : 0)
        return next_stream
    }

    glk_stream_open_memory(buf: GlkByteArray, mode: number, rock: number): Stream {
        return this.create_memory_stream(buf, mode, rock, Uint8Array)
    }

    glk_stream_open_memory_uni(buf: GlkWordArray, mode: number, rock: number): Stream {
        return this.create_memory_stream(buf, mode, rock, Uint32Array)
    }

    glk_stream_open_resource(filenum: number, rock: number): Stream | null {
        return this.create_resource_stream(filenum, rock, false)
    }

    glk_stream_open_resource_uni(filenum: number, rock: number): Stream | null {
        return this.create_resource_stream(filenum, rock, true)
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

    // Private internal functions

    private create_memory_stream(buf: GlkArray, mode: number, rock: number, typed_array: GlkTypedArrayConstructor) {
        if (mode !== filemode_Read && mode !== filemode_Write && mode !== filemode_ReadWrite) {
            throw new Error('Illegal filemode')
        }
        const common_cb = () => this.GiDispa?.unretain_array(buf)
        let str: ArrayBackedStream
        if (Array.isArray(buf)) {
            const new_arr = typed_array.from(buf)
            if (mode === filemode_Read) {
                str = new ArrayBackedStream(new_arr, mode, rock, common_cb)
            }
            // When opening an Array in a write mode we must copy the values back
            else {
                str = new ArrayBackedStream(new_arr, mode, rock, () => {
                    for (let i = 0; i < buf.length; i++) {
                        buf[i] = new_arr[0]
                    }
                    common_cb()
                })
            }
        }
        else {
            str = new ArrayBackedStream(buf, mode, rock, common_cb)
        }
        this.register_stream(str)
        this.GiDispa?.retain_array(buf)
        return str
    }

    private create_resource_stream(filenum: number, rock: number, unicode: boolean) {
        if (!this.Blorb) {
            return null
        }
        const chunk = this.Blorb.get_data_chunk(filenum)
        if (!chunk) {
            return null
        }
        let str: ArrayBackedStream
        if (chunk.binary || !unicode) {
            str = new ArrayBackedStream(unicode ? Uint8Array_to_Uint32Array(chunk.data) : chunk.data, filemode_Read, rock)
        }
        // A Unicode text resource is UTF-8 which must be decoded first
        else {
            const text = utf8decoder.decode(chunk.data)
            str = new ArrayBackedStream(Uint32Array.from(text, ch => ch.codePointAt(0)!), filemode_Read, rock)
        }
        this.register_stream(str)
        return str
    }

    private register_stream(str: Stream) {
        str.next_str = this.first_stream
        this.first_stream = str
        if (str.next_str) {
            str.next_str.prev_str = str
        }
        this.GiDispa?.class_register('stream', str)
    }

    private unregister_stream(str: Stream) {
        if (this.current_stream === str) {
            this.current_stream = null
        }
        this.GiDispa?.class_unregister('stream', str)
        const prev = str.prev_str
        const next = str.next_str
        str.prev_str = null
        str.next_str = null
        if (prev) {
            prev.next_str = next
        }
        else {
            this.first_stream = next
        }
        if (next) {
            next.prev_str = prev
        }
    }
}

function ByteToUint8Array(arr: GlkByteArray) {
    return Array.isArray(arr) ? Uint8Array.from(arr) : arr
}
function WordToUint32Array(arr: GlkWordArray) {
    return Array.isArray(arr) ? Uint32Array.from(arr) : arr
}

/** Handle legacy non-typed arrays in functions which need to write to the array */
function wrap_for_array(arr: number[], typed_array: GlkTypedArrayConstructor, func: (arr: GlkTypedArray) => number): number {
    const new_arr = new typed_array(arr.length)
    const res = func(new_arr)
    for (let i = 0; i < res; i++) {
        arr[i] = new_arr[i]
    }
    return res
}