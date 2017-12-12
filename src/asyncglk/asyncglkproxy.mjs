/*

AsyncGlkProxy: Proxy for a synchronous Glk
==========================================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

const asyncFuncs = [
    'glk_exit',
    'glk_fileref_create_by_name',
    'glk_fileref_create_from_fileref',
    'glk_fileref_create_temp',
    'glk_fileref_delete_file',
    'glk_fileref_destroy',
    'glk_fileref_does_file_exist',
    'glk_get_buffer_stream',
    'glk_get_buffer_stream_uni',
    'glk_get_char_stream',
    'glk_get_char_stream_uni',
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
    'glk_stream_close',
    'glk_stream_get_position',
    'glk_stream_open_file',
    'glk_stream_open_file_uni',
    'glk_stream_open_memory',
    'glk_stream_open_memory_uni',
    'glk_stream_open_resource',
    'glk_stream_open_resource_uni',
    'glk_stream_set_position',
    'glk_style_distinguish',
    'glk_style_measure',
    'glk_window_close',
    'glk_window_get_arrangement',
    'glk_window_get_size',
    'glk_window_open',
]

const syncFuncs = [
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
    'glk_current_simple_time',
    'glk_current_time',
    'glk_date_to_simple_time_local',
    'glk_date_to_simple_time_utc',
    'glk_date_to_time_local',
    'glk_date_to_time_utc',
    'glk_fileref_get_rock',
    'glk_fileref_iterate',
    'glk_gestalt',
    'glk_gestalt_ext',
    'glk_image_draw',
    'glk_image_draw_scaled',
    'glk_put_buffer',
    'glk_put_buffer_stream',
    'glk_put_buffer_stream_uni',
    'glk_put_buffer_uni',
    'glk_put_char',
    'glk_put_char_stream',
    'glk_put_char_stream_uni',
    'glk_put_char_uni',
    'glk_put_string',
    'glk_put_string_stream',
    'glk_put_string_stream_uni',
    'glk_put_string_uni',
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
    'glk_set_style',
    'glk_set_style_stream',
    'glk_set_terminators_line_event',
    'glk_set_window',
    'glk_simple_time_to_date_local',
    'glk_simple_time_to_date_utc',
    'glk_sound_load_hint',
    'glk_stream_get_current',
    'glk_stream_get_rock',
    'glk_stream_iterate',
    'glk_stream_set_current',
    'glk_stylehint_clear',
    'glk_stylehint_set',
    'glk_tick',
    'glk_time_to_date_local',
    'glk_time_to_date_utc',
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
    'glk_window_set_arrangement',
    'glk_window_set_background_color',
    'glk_window_set_echo_stream',
]

export default class AsyncGlkProxy
{
    constructor( Glk )
    {
        this.Glk = Glk

        for ( const func of asyncFuncs )
        {
            this[func] = async function()
            {
                return this.Glk[func].apply( this.Glk, arguments )
            }
        }

        for ( const func of syncFuncs )
        {
            this[func] = function()
            {
                return this.Glk[func].apply( this.Glk, arguments )
            }
        }
    }

    async glk_fileref_create_by_prompt( usage, fmode, rock )
    {
        return new Promise( ( resolve /*, reject*/ ) =>
        {
            this.callback = res => resolve( res )
            this.Glk.glk_fileref_create_by_prompt( usage, fmode, rock )
            this.Glk.update()
        })
    }

    async glk_select( eventref )
    {
        return new Promise( ( resolve /*, reject*/ ) =>
        {
            this.callback = () => resolve( eventref )
            this.Glk.glk_select( eventref )
            this.Glk.update()
        })
    }

    async init( options )
    {
        options.vm = {
            resume: res =>
            {
                this.callback( res )
            },
        }

        this.Glk.init( options )
    }
}