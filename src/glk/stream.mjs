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

    async glk_get_buffer_stream( str, array )
    {
        return this._get_array( str, array, false )
    }

    async glk_get_buffer_stream_uni( str, array )
    {
        return this._get_array( str, array, true )
    }

    glk_put_buffer_stream( str, array )
    {
        this._put_array( str, array )
    }

    glk_put_buffer_stream_uni( str, array )
    {
        this._put_array( str, array )
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

    async _get_array( str, array, unicode )
    {
        const funcname = unicode ? 'glk_get_buffer_stream_uni' : 'glk_get_buffer_stream'
        if ( !str )
        {
            throw new Error( `${ funcname }: invalid stream` )
        }

        if ( !str.readable )
        {
            return 0
        }

        switch ( str.type )
        {
            case Const.strtype_File:
                return str.fstream.fread( array )
            default:
                return 0
        }
    }

    _new_stream( options )
    {
        const str = Object.assign( {
            disprock: null,
            readcount: 0,
            streaming: true,
            writecount: 0,
        }, options )

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

    _put_array( str, array )
    {
        if ( !str || !str.writable )
        {
            throw new Error( 'Glk._put_array: invalid stream' )
        }

        // Truncate to 8 bit if needed, also converts non-typed arrays to a Uint8Array
        if ( !str.unicode && array.byteLength !== 8 )
        {
            array = new Uint8Array( array )
        }

        str.writecount += array.length

        switch ( str.type )
        {
            case Const.strtype_File:
                if ( !str.unicode )
                {
                    str.fstream.fwrite( array )
                }
                else
                {
                    if ( !str.isbinary )
                    {
                        /* cheap UTF-8 stream */
                        //const arr8 = UniArrayToUTF8( array )
                        //const buf = new str.fstream.BufferClass(arr8)
                        //str.fstream.fwrite(buf)
                    }
                    else
                    {
                        /* cheap big-endian stream */
                        const buf = new str.fstream.BufferClass(4*array.length)
                        for (let ix=0; ix<array.length; ix++)
                        {
                            buf.writeUInt32BE(array[ix], 4*ix, true)
                        }
                        str.fstream.fwrite(buf)
                    }
                }
                break
        }
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

        if ( fmode === Const.filemode_Read && !( await this.Dialog.file_ref_exists( fref.ref ) ) )
        {
            return null
        }

        const fstream = await this.Dialog.file_fopen( fmode, fref.ref )
        if ( !fstream )
        {
            return null
        }

        const str = this._new_stream({
            fstream: fstream,
            isbinary: !fref.textmode,
            origfmode: fmode,
            readable: fmode !== Const.filemode_Write,
            ref: fref.ref,
            rock,
            type: Const.strtype_File,
            unicode,
            writable: fmode !== Const.filemode_Read,
        })

        return str
    }

}

export default StreamAPI