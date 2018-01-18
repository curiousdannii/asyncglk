/*

AsyncGlk: An ES2017 Glk library
===============================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import SyncGlk from 'glkote-term/src/glkapi.js'

import * as Const from './const.mjs'
import DateTime from './datetime.mjs'
import Fref from './fref.mjs'
//import Gestalt from './gestalt.mjs'
//import MemoryView from './memoryview.mjs'
import Misc from './misc.mjs'
import Stream from './stream.mjs'
import Style from './style.mjs'
import Window from './window.mjs'

// Unimplemented functions which we will proxy
const asyncFuncs = [
    'glk_exit',
    'glk_get_line_stream',
    'glk_get_line_stream_uni',
    'glk_image_get_info',
    'glk_schannel_create',
    'glk_schannel_create_ext',
    'glk_schannel_destroy',
    'glk_schannel_play',
    'glk_schannel_play_ext',
    'glk_schannel_play_multi',
    'glk_select_poll',
    'glk_style_distinguish',
    'glk_style_measure',
    'glk_window_close',
    'glk_window_get_arrangement',
    'glk_window_get_size',
    'glk_window_open',
    'glk_window_set_arrangement',
    'restore_allstate',
    'save_allstate',
]

const syncFuncs = [
    'byte_array_to_string',
    'call_may_not_return',
    'fatal_error',
    'glk_buffer_canon_decompose_uni',
    'glk_buffer_canon_normalize_uni',
    'glk_buffer_to_lower_case_uni',
    'glk_buffer_to_title_case_uni',
    'glk_buffer_to_upper_case_uni',
    'glk_cancel_char_event',
    'glk_cancel_hyperlink_event',
    'glk_cancel_line_event',
    'glk_cancel_mouse_event',
    'glk_char_to_lower',
    'glk_char_to_upper',
    'glk_gestalt',
    'glk_gestalt_ext',
    'glk_image_draw',
    'glk_image_draw_scaled',
    'glk_request_char_event',
    'glk_request_char_event_uni',
    'glk_request_hyperlink_event',
    'glk_request_line_event',
    'glk_request_line_event_uni',
    'glk_request_mouse_event',
    'glk_request_timer_events',
    'glk_schannel_get_rock',
    'glk_schannel_iterate',
    'glk_schannel_pause',
    'glk_schannel_set_volume',
    'glk_schannel_set_volume_ext',
    'glk_schannel_stop',
    'glk_schannel_unpause',
    'glk_set_echo_line_event',
    'glk_set_hyperlink',
    'glk_set_hyperlink_stream',
    'glk_set_terminators_line_event',
    'glk_set_window',
    'glk_simple_time_to_date_local',
    'glk_simple_time_to_date_utc',
    'glk_sound_load_hint',
    'glk_stylehint_clear',
    'glk_stylehint_set',
    'glk_window_clear',
    'glk_window_erase_rect',
    'glk_window_fill_rect',
    'glk_window_flow_break',
    'glk_window_get_echo_stream',
    'glk_window_get_parent',
    'glk_window_get_rock',
    'glk_window_get_root',
    'glk_window_get_sibling',
    'glk_window_get_stream',
    'glk_window_get_type',
    'glk_window_iterate',
    'glk_window_move_cursor',
    'glk_window_set_background_color',
    'glk_window_set_echo_stream',
    'uni_array_to_string',
]

const props = [
    'DidNotReturn',
    'RefBox',
    'RefStruct',
    'version',
]

class GlkAPI
{

    constructor()
    {
        this.buffer = null
        this.Const = Const
        this.Dialog = null
        this.GiDispa = null
        this.GiLoad = null
        this.Glk = SyncGlk
        this.GlkOte = null
        this.mem = null
        this.metrics = null
        this.support = {}
        this.vm = null

        for ( const func of asyncFuncs )
        {
            this[func] = async function()
            {
                return SyncGlk[func].apply( SyncGlk, arguments )
            }
        }

        for ( const func of syncFuncs )
        {
            this[func] = function()
            {
                return SyncGlk[func].apply( SyncGlk, arguments )
            }
        }

        for ( const prop of props )
        {
            this[prop] = SyncGlk[prop]
        }
    }

    // Initialise the library and the VM
    async init( options )
    {
        this.set_references( options )

        if ( !this.vm )
        {
            throw new Error( 'No VM provided' )
        }

        if ( this.GiDispa )
        {
            this.GiDispa.set_vm( this.vm )
        }

        // Initialise GlkOte, and get back the support array and metrics
        /*const data = await this.GlkOte.init()
        this.metrics = data.metrics
        for ( const item of data.support )
        {
            this.support[item] = true
        }

        // Initialise the VM
        this.vm.init()*/

        options.vm.resume = res =>
        {
            this.callback( res )
        }

        options.Glk = this.Glk
        this.Glk.init( options )
        this.accept = options.accept
    }

    // Set our reference to the memory
    /*set_buffer( buffer )
    {
        this.buffer = buffer
        this.mem = MemoryView( buffer )
    }*/

    // Set references to external libraries
    set_references( refs )
    {
        if ( refs.Dialog )
        {
            this.Dialog = refs.Dialog
        }

        if ( refs.GiDispa )
        {
            this.GiDispa = refs.GiDispa
        }

        if ( refs.GiLoad )
        {
            this.GiLoad = refs.GiLoad
        }

        if ( refs.GlkOte )
        {
            this.GlkOte = refs.GlkOte
        }

        if ( refs.vm )
        {
            this.vm = refs.vm
        }
    }

    async glk_select( eventref )
    {
        return new Promise( ( resolve /*, reject*/ ) =>
        {
            this.callback = resolve
            this.Glk.glk_select( eventref )
            this.Glk.update()
        })
    }
}

const inherit = ( ...fns ) => fns.reduce( ( v, f ) => f( v ) )

const Glk = inherit( GlkAPI, DateTime, Fref, Misc, Stream, Style, Window )

export default Glk