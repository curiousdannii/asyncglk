/*

GlkApi
======

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {default as Blorb} from '../blorb/blorb.js'
import {DEFAULT_METRICS} from '../common/constants.js'
import {utf8decoder} from '../common/misc.js'
import {NormalisedMetrics} from '../common/protocol.js'
import {Dialog, FileRef as DialogFileRef} from '../dialog/common/interface.js'

import {BEBuffer_to_Array, copy_array, GlkTypedArray, GlkTypedArrayConstructor} from './common.js'
import {filemode_Read, filemode_ReadWrite, filemode_Write, filemode_WriteAppend, fileusage_SavedGame, fileusage_TypeMask, seekmode_End, winmethod_Above, winmethod_Below, winmethod_DirMask, winmethod_DivisionMask, winmethod_Fixed, winmethod_Left, winmethod_Proportional, winmethod_Right, wintype_Blank, wintype_Graphics, wintype_TextBuffer, wintype_TextGrid} from './constants.js'
import {FileRef} from './filerefs.js'
import * as Interface from './interface.js'
import {GlkArray, GlkByteArray, GlkWordArray, RefStructValue} from './interface.js'
import {ArrayBackedStream, FileStream, Stream} from './streams.js'
import {BlankWindow, BufferWindow, GraphicsWindow, GridWindow, PairWindow, Window, WindowBox} from './windows.js'

const FileTypeMap: Record<number, string> = {
    0: 'data',
    1: 'save',
    2: 'transcript',
    3: 'command',
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
    private Dialog: Dialog
    private GiDispa?: Interface.GiDispa
    private VM: Interface.GlkVM

    // For assigning disprocks when there is no GiDispa
    private disprock_counter = 0

    // TODO: assert outspacings are 0
    private metrics: NormalisedMetrics = DEFAULT_METRICS

    private first_fref: FileRef | null = null

    private current_stream: Stream | null = null
    private first_stream: Stream | null = null

    private first_window: Window | null = null
    private root_window: Window | null = null
    private windows_changed = false

    constructor(options: Interface.GlkApiOptions) {
        this.Blorb = options.Blorb
        this.Dialog = options.Dialog
        this.GiDispa = options.GiDispa
        this.VM = options.vm
    }

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

    glk_fileref_create_by_name(usage: number, filename: string, rock: number): FileRef {
        const fixed_filename = this.Dialog.file_clean_fixed_name(filename, usage & fileusage_TypeMask)
        return this.create_fileref(fixed_filename, usage, rock)
    }

    // glk_fileref_create_by_prompt(usage: number, fmode: number, rock: number): typeof DidNotReturn

    glk_fileref_create_from_fileref(usage: number, oldfref: FileRef, rock: number): FileRef {
        if (!oldfref) {
            throw new Error('Invalid Fileref')
        }
        return this.create_fileref(oldfref.filename, usage, rock)
    }

    glk_fileref_create_temp(usage: number, rock: number): FileRef {
        const filetypename = FileTypeMap[usage & fileusage_TypeMask]
        const dialog_fref = this.Dialog.file_construct_temp_ref(filetypename)
        return this.create_fileref(dialog_fref.filename, usage, rock, dialog_fref)
    }

    glk_fileref_delete_file(fref: FileRef) {
        if (!fref) {
            throw new Error('Invalid Fileref')
        }
        fref.delete_file()
    }

    glk_fileref_destroy(fref: FileRef) {
        if (!fref) {
            throw new Error('Invalid Fileref')
        }
        this.GiDispa?.class_unregister('fileref', fref)
        const prev = fref.prev
        const next = fref.next
        fref.prev = null
        fref.next = null
        if (prev) {
            prev.next = next
        }
        else {
            this.first_fref = next
        }
        if (next) {
            next.prev = prev
        }
    }

    glk_fileref_does_file_exist(fref: FileRef): boolean {
        if (!fref) {
            throw new Error('Invalid Fileref')
        }
        return fref.exists()
    }

    glk_fileref_get_rock(fref: FileRef): number {
        if (!fref) {
            throw new Error('Invalid Fileref')
        }
        return fref.rock
    }

    glk_fileref_iterate(fref?: FileRef, rockbox?: RefBox): FileRef | null {
        const next_fref = fref ? fref.next : this.first_fref
        rockbox?.set_value(next_fref ? next_fref.rock : 0)
        return next_fref
    }

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
        const next_stream = str ? str.next : this.first_stream
        rockbox?.set_value(next_stream ? next_stream.rock : 0)
        return next_stream
    }

    glk_stream_open_file(fref: FileRef, mode: number, rock: number): Stream | null {
        return this.create_file_stream(fref, mode, rock, false)
    }

    glk_stream_open_file_uni(fref: FileRef, mode: number, rock: number): Stream | null {
        return this.create_file_stream(fref, mode, rock, true)
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

    glk_window_clear(win: Window) {
        if (!win) {
            throw new Error('Invalid Window')
        }
        // TODO: test pending line request
        win.clear()
    }

    // glk_window_close(win: GlkWindow, stats?: RefStruct)
    // glk_window_erase_rect(win: GlkWindow, left: number, top: number, width: number, height: number)
    // glk_window_fill_rect(win: GlkWindow, colour: number, left: number, top: number, width: number, height: number)
    // glk_window_flow_break(win: GlkWindow)
    // glk_window_get_arrangement(win: GlkWindow, method?: RefBox, size?: RefBox, keywin?: RefBox)

    glk_window_get_echo_stream(win: Window): Stream | null {
        if (!win) {
            throw new Error('Invalid Window')
        }
        return win.echo_str
    }

    glk_window_get_parent(win: Window): Window | null {
        if (!win) {
            throw new Error('Invalid Window')
        }
        return win.parent
    }

    glk_window_get_rock(win: Window): number {
        if (!win) {
            throw new Error('Invalid Window')
        }
        return win.rock
    }

    glk_window_get_root(): Window | null {
        return this.root_window
    }

    glk_window_get_sibling(win: Window): Window | null {
        if (!win) {
            throw new Error('Invalid Window')
        }
        const parent = win.parent
        if (!parent) {
            return null
        }
        if (parent.child1 === win) {
            return parent.child2
        }
        else {
            return parent.child1
        }
    }

    // glk_window_get_size(win: GlkWindow, width?: RefBox, height?: RefBox)

    glk_window_get_stream(win: Window): Stream {
        if (!win) {
            throw new Error('Invalid Window')
        }
        return win.stream
    }

    glk_window_get_type(win: Window): number {
        if (!win) {
            throw new Error('Invalid Window')
        }
        return win.typenum
    }

    glk_window_iterate(win?: Window, rockbox?: RefBox): Window | null {
        const next_window = win ? win.next : this.first_window
        rockbox?.set_value(next_window ? next_window.rock : 0)
        return next_window
    }

    // glk_window_move_cursor(win: GlkWindow, xpos: number, ypos: number)

    glk_window_open(splitwin: Window | null, method: number, size: number, wintype: number, rock: number): Window | null {
        // Check the parameters
        if (!this.root_window) {
            if (splitwin) {
                throw new Error('Invalid splitwin: must be null for first window')
            }
        }
        else {
            if (!splitwin) {
                throw new Error('Invalid splitwin')
            }
            if (splitwin.type === 'pair') {
                throw new Error('Invalid splitwin: must not be a pair window')
            }
            const division = method & winmethod_DivisionMask
            const direction = method & winmethod_DirMask
            if (division !== winmethod_Fixed && division !== winmethod_Proportional) {
                throw new Error('Invalid method: must be fixed or proportional')
            }
            if (direction !== winmethod_Above && direction !== winmethod_Below && direction !== winmethod_Left && direction !== winmethod_Right) {
                throw new Error('Invalid method: bad direction')
            }
        }

        // Create the window
        let win: Window
        switch (wintype) {
            case wintype_Blank:
                win = new BlankWindow(rock)
                break
            case wintype_Graphics:
                win = new GraphicsWindow(rock)
                break
            case wintype_TextBuffer:
                win = new BufferWindow(rock)
                break
            case wintype_TextGrid:
                win = new GridWindow(rock)
                break
            default:
                throw new Error('Invalid wintype')
        }
        this.register_window(win)

        // Rearrange the windows for the new window
        if (splitwin) {
            const pairwin = new PairWindow(win, method, size)
            this.register_window(pairwin)
            // Set up the win relations
            pairwin.child1 = splitwin
            pairwin.child2 = win
            const oldparent = splitwin.parent
            splitwin.parent = pairwin
            win.parent = pairwin
            pairwin.parent = oldparent
            if (oldparent) {
                if (oldparent.child1 === splitwin) {
                    oldparent.child1 = pairwin
                }
                else {
                    oldparent.child2 = pairwin
                }
            }
            else {
                this.root_window = pairwin
            }
            this.rearrange_window(pairwin, splitwin.box)
        }
        else {
            this.root_window = win
            this.rearrange_window(win, {
                bottom: this.metrics.height,
                left: 0,
                right: this.metrics.width,
                top: 0,
            })
        }

        return win
    }

    // glk_window_set_arrangement(win: GlkWindow, method: number, size: number, keywin?: GlkWindow)
    // glk_window_set_background_color(win: GlkWindow, colour: number)

    glk_window_set_echo_stream(win: Window, stream: Stream | null) {
        if (!win) {
            throw new Error('Invalid Window')
        }
        win.echo_str = stream
    }

    // garglk_set_reversevideo(val: number)
    // garglk_set_reversevideo_stream(str: GlkStream, val: number)
    // garglk_set_zcolors(fg: number, bg: number)
    // garglk_set_zcolors_stream(str: GlkStream, fg: number, bg: number)

    // Private internal functions

    private create_fileref(filename: string, usage: number, rock: number, dialog_fref?: DialogFileRef): FileRef {
        if (!dialog_fref) {
            const filetype = usage & fileusage_TypeMask
            const signature = filetype === fileusage_SavedGame ? this.VM.get_signature() : undefined
            dialog_fref = this.Dialog.file_construct_ref(filename, FileTypeMap[filetype] ?? 'xxx', signature)
        }
        const fref = new FileRef(this.Dialog, filename, dialog_fref, rock, usage)
        fref.next = this.first_fref
        this.first_fref = fref
        if (fref.next) {
            fref.next.prev = fref
        }
        this.GiDispa?.class_register('fileref', fref)
        return fref
    }

    private create_file_stream(fref: FileRef, mode: number, rock: number, unicode: boolean) {
        if (!fref) {
            throw new Error('Invalid Fileref')
        }
        if (mode !== filemode_Write && mode !== filemode_Read && mode !== filemode_ReadWrite && mode !== filemode_WriteAppend) {
            throw new Error('Invalid filemode')
        }
        if (mode === filemode_Read && !fref.exists()) {
            return null
        }

        // Now read in the data
        let data: Uint8Array | null = null
        if (mode !== filemode_Write) {
            data = fref.read()
        }
        if (!data) {
            data = new Uint8Array(0)
            fref.write(data)
        }

        // Create an appropriate stream
        const str = create_stream_from_buffer(data, fref.binary, mode, rock, unicode, fref)

        if (mode === filemode_WriteAppend) {
            str.set_position(seekmode_End, 0)
        }
        this.register_stream(str)
        return str
    }

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
        const str = create_stream_from_buffer(chunk.data, chunk.binary, filemode_Read, rock, unicode)
        this.register_stream(str)
        return str
    }

    private rearrange_window(win: Window, box: WindowBox) {
        const metrics = this.metrics
        this.windows_changed = true
        win.box = box
        switch (win.type) {
            case 'graphics': {
                const height = box.bottom - box.top
                const width = box.right - box.left
                win.height = Math.max(0, height - metrics.graphicsmarginy)
                win.width = Math.max(0, width - metrics.graphicsmarginx)
                break
            }
            case 'grid': {
                const height = box.bottom - box.top
                const width = box.right - box.left
                win.update_size(height, width)
                break
            }
            case 'pair': {
                let min, max, splitwidth
                if (win.vertical) {
                    min = box.left
                    max = box.right
                    splitwidth = metrics.inspacingx
                }
                else {
                    min = box.top
                    max = box.bottom
                    splitwidth = metrics.inspacingy
                }
                if (!win.border) {
                    splitwidth = 0
                }
                const diff = max - min

                // Calculate the split size
                let split = 0
                if (win.fixed) {
                    switch (win.key.type) {
                        case 'buffer':
                            if (win.vertical) {
                                split = win.size * metrics.buffercharwidth + metrics.buffermarginx
                            }
                            else {
                                split = win.size * metrics.buffercharheight + metrics.buffermarginy
                            }
                            break
                        case 'graphics':
                            split = win.size + (win.vertical ? metrics.graphicsmarginx : metrics.graphicsmarginy)
                            break
                        case 'grid':
                            if (win.vertical) {
                                split = win.size * metrics.gridcharwidth + metrics.gridmarginx
                            }
                            else {
                                split = win.size * metrics.gridcharheight + metrics.gridmarginy
                            }
                            break
                    }
                    split = Math.ceil(split)
                }
                else {
                    split = Math.floor((diff * win.size) / 100)
                }

                // split is now a number between 0 and diff; now convert it to a number between min and max, and apply upside-down-ness
                if (win.backward) {
                    split = min + split
                }
                else {
                    split = max - split - splitwidth
                }

                // Make sure it really is between min and max
                if (min >= max) {
                    split = min
                }
                else {
                    split = Math.min(Math.max(split, min), max - splitwidth)
                }

                // The two child window boxes can now be constructed
                let box1: WindowBox, box2: WindowBox
                if (win.vertical) {
                    box1 = {
                        bottom: box.bottom,
                        left: box.left,
                        right: split,
                        top: box.top,
                    }
                    box2 = {
                        bottom: box.bottom,
                        left: split + splitwidth,
                        right: box.right,
                        top: box.top,
                    }
                }
                else {
                    box1 = {
                        bottom: split,
                        left: box.left,
                        right: box.right,
                        top: box.top,
                    }
                    box2 = {
                        bottom: box.bottom,
                        left: box.left,
                        right: box.right,
                        top: box.bottom + splitwidth,
                    }
                }
                this.rearrange_window(win.child1!, win.backward ? box2 : box1)
                this.rearrange_window(win.child2!, win.backward ? box1 : box2)
                break
            }
        }
    }

    private register_stream(str: Stream) {
        str.next = this.first_stream
        this.first_stream = str
        if (str.next) {
            str.next.prev = str
        }
        this.GiDispa?.class_register('stream', str)
    }

    private register_window(win: Window) {
        this.windows_changed = true
        win.next = this.first_window
        this.first_window = win
        if (win.next) {
            win.next.prev = win
        }
        // A disprock must be assigned because it is used as the protocol ID
        if (this.GiDispa) {
            this.GiDispa?.class_register('window', win)
        }
        else {
            win.disprock = this.disprock_counter++
        }
        this.register_stream(win.stream)
    }

    private unregister_stream(str: Stream) {
        if (this.current_stream === str) {
            this.current_stream = null
        }
        this.GiDispa?.class_unregister('stream', str)
        const prev = str.prev
        const next = str.next
        str.prev = null
        str.next = null
        if (prev) {
            prev.next = next
        }
        else {
            this.first_stream = next
        }
        if (next) {
            next.prev = prev
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

function create_stream_from_buffer(buf: Uint8Array, binary: boolean, mode: number, rock: number, unicode: boolean, fref?: FileRef) {
    let data: GlkTypedArray
    if (unicode) {
        if (binary) {
            data = BEBuffer_to_Array(buf)
        }
        else {
            const text = utf8decoder.decode(buf)
            data = Uint32Array.from(text, ch => ch.codePointAt(0)!)
        }
    }
    else {
        data = buf
    }
    if (mode === filemode_Read) {
        return new ArrayBackedStream(data, mode, rock)
    }
    else {
        return new FileStream(fref!, data, mode, rock)
    }
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