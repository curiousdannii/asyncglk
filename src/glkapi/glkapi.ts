/*

GlkApi
======

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {default as Blorb} from '../blorb/blorb.js'
import {utf8decoder} from '../common/misc.js'

import {copy_array, GlkTypedArray, GlkTypedArrayConstructor, Uint8Array_to_Uint32Array} from './common.js'
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

    glk_buffer_canon_decompose_uni(buf: GlkWordArray, initlen: number): number {
        return buffer_transformer(buf, initlen, str => (str as string).normalize('NFD'))
    }

    glk_buffer_canon_normalize_uni(buf: GlkWordArray, initlen: number): number {
        return buffer_transformer(buf, initlen, str => (str as string).normalize('NFC'))
    }

    glk_buffer_to_lower_case_uni(buf: GlkWordArray, initlen: number): number {
        return buffer_transformer(buf, initlen, str => (str as string).toLowerCase())
    }

    glk_buffer_to_title_case_uni(buf: GlkWordArray, initlen: number, lowerrest: number): number {
        return buffer_transformer(buf, initlen, buf => (buf as Uint32Array).reduce((prev, ch, index) => {
            const special_cases: Record<string, string> = {
                ß: 'Ss', Ǆ: 'ǅ', ǅ: 'ǅ', ǆ: 'ǅ', Ǉ: 'ǈ', ǈ: 'ǈ', ǉ: 'ǈ', Ǌ: 'ǋ', ǋ: 'ǋ', ǌ: 'ǋ',
                Ǳ: 'ǲ', ǲ: 'ǲ', ǳ: 'ǲ', և: 'Եւ', ᾲ: 'Ὰͅ', ᾳ: 'ᾼ', ᾴ: 'Άͅ', ᾷ: 'ᾼ͂', ᾼ: 'ᾼ', ῂ: 'Ὴͅ',
                ῃ: 'ῌ', ῄ: 'Ήͅ', ῇ: 'ῌ͂', ῌ: 'ῌ', ῲ: 'Ὼͅ', ῳ: 'ῼ', ῴ: 'Ώͅ', ῷ: 'ῼ͂', ῼ: 'ῼ', ﬀ: 'Ff',
                ﬁ: 'Fi', ﬂ: 'Fl', ﬃ: 'Ffi', ﬄ: 'Ffl', ﬅ: 'St', ﬆ: 'St', ﬓ: 'Մն', ﬔ: 'Մե',
                ﬕ: 'Մի', ﬖ: 'Վն', ﬗ: 'Մխ',
            }
            const slightly_less_special_cases = ['ᾈᾉᾊᾋᾌᾍᾎᾏ', 'ᾘᾙᾚᾛᾜᾝᾞᾟ', 'ᾨᾩᾪᾫᾬᾭᾮᾯ']
            let thischar = String.fromCodePoint(ch)
            if (index === 0) {
                if (special_cases[thischar]) {
                    thischar = special_cases[thischar]
                }
                else if (ch >= 8064 && ch < 8112) {
                    thischar = slightly_less_special_cases[((ch - 8064) / 16) | 0][ch % 8]
                }
                else {
                    thischar = thischar.toUpperCase()
                }
            }
            else if (lowerrest) {
                thischar = thischar.toLowerCase()
            }
            return prev + thischar
        }, ''), true)
    }

    glk_buffer_to_upper_case_uni(buf: GlkWordArray, initlen: number): number {
        return buffer_transformer(buf, initlen, str => (str as string).toUpperCase())
    }

    // glk_cancel_char_event(win: GlkWindow)
    // glk_cancel_hyperlink_event(win: GlkWindow)
    // glk_cancel_line_event(win: GlkWindow, ev?: RefStruct)
    // glk_cancel_mouse_event(win: GlkWindow)

    glk_char_to_lower(val: number): number {
        if (val >= 0x41 && val <= 0x5A) {
            return val + 0x20
        }
        if (val >= 0xC0 && val <= 0xDE && val !== 0xD7) {
            return val + 0x20
        }
        return val
    }

    glk_char_to_upper(val: number): number {
        if (val >= 0x61 && val <= 0x7A) {
            return val - 0x20
        }
        if (val >= 0xE0 && val <= 0xFE && val !== 0xF7) {
            return val - 0x20
        }
        return val
    }

    glk_current_simple_time(factor: number): number {
        return Math.floor(Date.now() / (factor * 1000))
    }

    glk_current_time(struct: RefStruct) {
        timestamp_to_time_struct(Date.now(), struct)
    }

    glk_date_to_simple_time_local(struct: RefStruct, factor: number): number {
        return Math.floor(date_struct_to_timestamp_local(struct) / (factor * 1000))
    }

    glk_date_to_simple_time_utc(struct: RefStruct, factor: number): number {
        return Math.floor(date_struct_to_timestamp_utc(struct) / (factor * 1000))
    }

    glk_date_to_time_local(datestruct: RefStruct, timestruct: RefStruct) {
        timestamp_to_time_struct(date_struct_to_timestamp_local(datestruct), timestruct)
    }

    glk_date_to_time_utc(datestruct: RefStruct, timestruct: RefStruct) {
        timestamp_to_time_struct(date_struct_to_timestamp_utc(datestruct), timestruct)
    }

    // glk_exit(): typeof DidNotReturn
    // glk_fileref_create_by_name(usage: number, filename: string, rock: number): GlkFref
    // glk_fileref_create_by_prompt(usage: number, fmode: number, rock: number): typeof DidNotReturn
    // glk_fileref_create_from_fileref(usage: number, oldfref: GlkFref, rock: number): GlkFref
    // glk_fileref_create_temp(usage: number, rock: number): GlkFref
    // glk_fileref_delete_file(fref: GlkFref)
    // glk_fileref_destroy(fref: GlkFref)
    // glk_fileref_does_file_exist(fref: GlkFref): boolean
    // glk_fileref_get_rock(fref: GlkFref): number
    // glk_fileref_iterate(fref?: GlkFref, rockbox?: RefBox): GlkFref | null
    // glk_gestalt(sel: number, val: number): number
    // glk_gestalt_ext(sel: number, val: number, arr: GlkArray | null): number

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

    // glk_image_draw(win: GlkWindow, imgid: number, val1: number, val2: number): number
    // glk_image_draw_scaled(win: GlkWindow, imgid: number, val1: number, val2: number, width: number, height: number): number
    // glk_image_get_info(imgid: number, width?: RefBox, height?: RefBox): number

    glk_put_buffer(val: GlkByteArray) {
        this.glk_put_buffer_stream(this.current_stream!, val)
    }

    glk_put_buffer_stream(str: Stream, val: GlkByteArray) {
        if (!str) {
            throw new Error('Invalid Stream')
        }
        // But when writing to a window stream this step would be unneccessary, right? Maybe move the conversion inside the stream
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

    // glk_request_char_event(win: GlkWindow)
    // glk_request_char_event_uni(win: GlkWindow)
    // glk_request_hyperlink_event(win: GlkWindow)
    // glk_request_line_event(win: GlkWindow, buf: GlkByteArray, initlen?: number)
    // glk_request_line_event_uni(win: GlkWindow, buf: GlkWordArray, initlen?: number)
    // glk_request_mouse_event(win: GlkWindow)
    // glk_request_timer_events(msecs: number)
    // glk_schannel_create(rock: number): GlkSchannel | null
    // glk_schannel_create_ext(rock: number, volume: number): GlkSchannel | null
    // glk_schannel_destroy(schannel: GlkSchannel)
    // glk_schannel_get_rock(schannel: GlkSchannel): number
    // glk_schannel_iterate(schannel?: GlkSchannel, rockbox?: RefBox): GlkSchannel | null
    // glk_schannel_pause(schannel: GlkSchannel)
    // glk_schannel_play(schannel: GlkSchannel, sound: number): number
    // glk_schannel_play_ext(schannel: GlkSchannel, sound: number, repeats: number, notify: number): number
    // glk_schannel_play_multi(schannels: GlkSchannel[], sounds: GlkArray, notify: number): number
    // glk_schannel_set_volume(schannel: GlkSchannel, volume: number)
    // glk_schannel_set_volume_ext(schannel: GlkSchannel, volume: number, duration: number, notify: number)
    // glk_schannel_stop(schannel: GlkSchannel)
    // glk_schannel_unpause(schannel: GlkSchannel)
    // glk_select(ev: RefStruct): typeof DidNotReturn
    // glk_select_poll(ev: RefStruct)
    // glk_set_echo_line_event(win: GlkWindow, val: number)
    // glk_set_hyperlink(val: number)
    // glk_set_hyperlink_stream(str: GlkStream, val: number)
    // glk_set_style(style: number)
    // glk_set_style_stream(str: GlkStream, style: number)
    // glk_set_terminators_line_event(win: GlkWindow, keycodes: GlkArray)
    // glk_set_window(win?: GlkWindow)
    // glk_sound_load_hint(sound: number, load: number)

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

    // glk_stream_open_file(fref: FileRef, mode: number, rock: number): GlkStream | null
    // glk_stream_open_file_uni(fref: FileRef, mode: number, rock: number): GlkStream | null

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

    // glk_style_distinguish(win: GlkWindow, style1: number, style2: number): number
    // glk_style_measure(win: GlkWindow, style: number, hint: number, result?: RefBox): number
    // glk_stylehint_clear(wintype: number, style: number, hint: number)
    // glk_stylehint_set(wintype: number, style: number, hint: number, value: number)

    glk_tick() {}

    glk_simple_time_to_date_local(time: number, factor: number, struct: RefStruct) {
        timestamp_to_date_struct_local(time * 1000 * factor, struct)
    }

    glk_simple_time_to_date_utc(time: number, factor: number, struct: RefStruct) {
        timestamp_to_date_struct_utc(time * 1000 * factor, struct)
    }

    glk_time_to_date_local(timestruct: RefStruct, datestruct: RefStruct) {
        timestamp_to_date_struct_local(time_struct_to_timestamp(timestruct), datestruct)
    }

    glk_time_to_date_utc(timestruct: RefStruct, datestruct: RefStruct) {
        timestamp_to_date_struct_utc(time_struct_to_timestamp(timestruct), datestruct)
    }

    // glk_window_clear(win: GlkWindow)
    // glk_window_close(win: GlkWindow, stats?: RefStruct)
    // glk_window_erase_rect(win: GlkWindow, left: number, top: number, width: number, height: number)
    // glk_window_fill_rect(win: GlkWindow, colour: number, left: number, top: number, width: number, height: number)
    // glk_window_flow_break(win: GlkWindow)
    // glk_window_get_arrangement(win: GlkWindow, method?: RefBox, size?: RefBox, keywin?: RefBox)
    // glk_window_get_echo_stream(win: GlkWindow): GlkStream | null
    // glk_window_get_parent(win: GlkWindow): GlkWindow | null
    // glk_window_get_rock(win: GlkWindow): number
    // glk_window_get_root(): GlkWindow | null
    // glk_window_get_sibling(win: GlkWindow): GlkWindow | null
    // glk_window_get_size(win: GlkWindow, width?: RefBox, height?: RefBox)
    // glk_window_get_stream(win: GlkWindow): GlkStream
    // glk_window_get_type(win: GlkWindow): number
    // glk_window_iterate(win?: GlkWindow, rockbox?: RefBox): GlkWindow | null
    // glk_window_move_cursor(win: GlkWindow, xpos: number, ypos: number)
    // glk_window_open(splitwin: GlkWindow | null, method: number, size: number, wintype: number, rock: number): GlkWindow | null
    // glk_window_set_arrangement(win: GlkWindow, method: number, size: number, keywin?: GlkWindow)
    // glk_window_set_background_color(win: GlkWindow, colour: number)
    // glk_window_set_echo_stream(win: GlkWindow, stream: GlkStream | null)
    // garglk_set_reversevideo(val: number)
    // garglk_set_reversevideo_stream(str: GlkStream, val: number)
    // garglk_set_zcolors(fg: number, bg: number)
    // garglk_set_zcolors_stream(str: GlkStream, fg: number, bg: number)

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
                    copy_array(new_arr, buf, buf.length)
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

function buffer_transformer(buf: GlkWordArray, initlen: number, func: (str: string | Uint32Array) => string, dont_reduce?: boolean) {
    const utf32_array = Array.isArray(buf) ? buf.slice(0, initlen) as any as Uint32Array : buf.subarray(0, initlen)
    const data = dont_reduce ? utf32_array : utf32_array.reduce((prev, ch) => prev + String.fromCodePoint(ch), '')
    const new_str = func(data)
    const newbuf = Uint32Array.from(new_str, ch => ch.codePointAt(0)!)
    const newlen = newbuf.length
    if (Array.isArray(buf)) {
        copy_array(newbuf, buf, newlen)
    }
    else {
        buf.set(newbuf.subarray(0, Math.min(buf.length, newlen)))
    }
    return newlen
}

function date_struct_to_timestamp_local(struct: RefStruct): number {
    const date = new Date(
        struct.get_field(0) as number,
        struct.get_field(1) as number - 1,
        struct.get_field(2) as number,
        struct.get_field(4) as number,
        struct.get_field(5) as number,
        struct.get_field(6) as number,
        struct.get_field(7) as number / 1000
    )
    return date.getTime()
}

function date_struct_to_timestamp_utc(struct: RefStruct): number {
    const date = new Date(0)
    date.setUTCFullYear(struct.get_field(0) as number)
    date.setUTCMonth(struct.get_field(1) as number - 1)
    date.setUTCDate(struct.get_field(2) as number)
    date.setUTCHours(struct.get_field(4) as number)
    date.setUTCMinutes(struct.get_field(5) as number)
    date.setUTCSeconds(struct.get_field(6) as number)
    date.setUTCMilliseconds(struct.get_field(7) as number / 1000)
    return date.getTime()
}

function timestamp_to_date_struct_local(timestamp: number, struct: RefStruct) {
    const date = new Date(timestamp)
    struct.set_field(0, date.getFullYear())
    struct.set_field(1, date.getMonth() + 1)
    struct.set_field(2, date.getDate())
    struct.set_field(3, date.getDay())
    struct.set_field(4, date.getHours())
    struct.set_field(5, date.getMinutes())
    struct.set_field(6, date.getSeconds())
    struct.set_field(7, date.getMilliseconds() * 1000)
}

function timestamp_to_date_struct_utc(timestamp: number, struct: RefStruct) {
    const date = new Date(timestamp)
    struct.set_field(0, date.getUTCFullYear())
    struct.set_field(1, date.getUTCMonth() + 1)
    struct.set_field(2, date.getUTCDate())
    struct.set_field(3, date.getUTCDay())
    struct.set_field(4, date.getUTCHours())
    struct.set_field(5, date.getUTCMinutes())
    struct.set_field(6, date.getUTCSeconds())
    struct.set_field(7, date.getUTCMilliseconds() * 1000)
}

function timestamp_to_time_struct(timestamp: number, struct: RefStruct) {
    struct.set_field(0, Math.floor(timestamp / 4294967296000))
    struct.set_field(1, Math.floor(timestamp / 1000) >>> 0)
    let microsecs = Math.floor((timestamp % 1000) * 1000)
    if (microsecs < 0) {
        microsecs += 1000000
    }
    struct.set_field(2, microsecs)
}

function time_struct_to_timestamp(struct: RefStruct): number {
    return (struct.get_field(0) as number) * 4294967296000 +
        (struct.get_field(1) as number) * 1000 +
        (struct.get_field(2) as number) / 1000
}

/** Handle legacy non-typed arrays in functions which need to write to the array */
function wrap_for_array(arr: number[], typed_array: GlkTypedArrayConstructor, func: (arr: GlkTypedArray) => number): number {
    const new_arr = new typed_array(arr.length)
    const res = func(new_arr)
    copy_array(new_arr, arr, res)
    return res
}