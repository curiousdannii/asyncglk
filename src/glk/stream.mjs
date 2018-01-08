/*

Stream functions
================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as Const from './const.mjs'

const StreamAPI = Base => class extends Base
{
    constructor()
    {
        super()

        // Beginning of the Stream linked list
        this.streamlist = null
    }

    glk_stream_get_rock (str)
    {
        if ( !str )
        {
            throw new Error( 'glk_stream_get_rock: invalid stream' )
        }
        return str.rock
    }

    glk_stream_iterate( str, rockref )
    {
        str = str ? str.next : this.streamlist

        if ( rockref )
        {
            rockref.set_value( str ? str.rock : 0 )
        }
        return str || null
    }

    async glk_stream_open_file( fref, fmode, rock )
    {
        return await this._stream_open_file( fref, fmode, rock, false )
    }

    async glk_stream_open_file_uni( fref, fmode, rock )
    {
        return await this._stream_open_file( fref, fmode, rock, true )
    }

    _new_stream( type, readable, writable, rock )
    {
        const str = {}
        str.type = type
        str.rock = rock
        str.disprock = undefined

        str.unicode = false
        // isbinary is only meaningful for Resource and streaming-File streams
        str.isbinary = false
        str.streaming = true
        str.ref = null
        str.win = null
        str.file = null
        str.fstream = null

        str.readcount = 0
        str.writecount = 0
        str.readable = readable
        str.writable = writable

        str.prev = null
        str.next = this.streamlist
        this.streamlist = str
        if ( str.next )
        {
            str.next.prev = str
        }

        if ( this.GiDispa )
        {
            this.GiDispa.class_register( 'stream', str )
        }

        return str
    }

    async _stream_open_file( fref, fmode, rock, unicode )
    {
        const funcname = unicode ? 'glk_stream_open_file_uni' : 'glk_stream_open_file'
        if ( !fref )
        {
            throw new Error( `${ funcname }: invalid fileref` )
        }

        if ( fmode !== Const.filemode_Read
            && fmode !== Const.filemode_Write
            && fmode !== Const.filemode_ReadWrite
            && fmode !== Const.filemode_WriteAppend )
        {
            throw new Error( `${ funcname }: illegal filemode` )
        }

        if ( fmode === Const.filemode_Read && !this.Dialog.file_ref_exists( fref.ref ) )
        {
            return null
        }

        const fstream = await this.Dialog.file_fopen( fmode, fref.ref )
        if ( !fstream )
        {
            return null
        }

        const str = this._new_stream( Const.strtype_File, ( fmode !== Const.filemode_Write ), ( fmode !== Const.filemode_Read ), rock )
        str.unicode = unicode
        str.isbinary = !fref.textmode
        str.ref = fref.ref
        str.origfmode = fmode

        str.fstream = fstream

        return str
    }

}

export default StreamAPI