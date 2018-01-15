/*

Stream functions
================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as Const from './const.mjs'

// Given an array, return an array of the same length with all the values
// trimmed to the range 0-255. This may be the same array.
function TrimArrayToBytes( arr )
{
    let ix = 0
    const len = arr.length
    for ( ; ix < len; ix++ )
    {
        if ( arr[ix] < 0 || arr[ix] >= 0x100 )
        {
            break
        }
    }
    if ( ix === len )
    {
        return arr
    }

    // Replace characters out of range with a '?'
    return Uint8Array.from( arr, ch => ch < 0 || ch >= 0x100 ? 63 : ch )
}

const StreamAPI = Base => class extends Base
{
    constructor()
    {
        super()

        // Beginning of the Stream linked list
        this.streamlist = null
        this.currentstr = null
    }

    async glk_get_buffer_stream( str, array )
    {
        return this._get_array( str, array, false )
    }

    async glk_get_buffer_stream_uni( str, array )
    {
        return this._get_array( str, array, true )
    }

    glk_put_buffer( array )
    {
        this._put_array( this.currentstr, array )
    }

    glk_put_buffer_stream( str, array )
    {
        this._put_array( str, array )
    }

    glk_put_buffer_stream_uni( str, array )
    {
        this._put_array( str, array )
    }

    glk_put_buffer_uni( array )
    {
        this._put_array( this.currentstr, array )
    }

    glk_put_char( ch )
    {
        this._put_char( this.currentstr, ch & 0xFF )
    }

    glk_put_char_stream( str, ch )
    {
        this._put_char( str, ch & 0xFF )
    }

    glk_put_char_stream_uni( str, ch )
    {
        this._put_char( str, ch )
    }

    glk_put_char_uni( ch )
    {
        this._put_char( this.currentstr, ch )
    }

    glk_stream_get_current()
    {
        return this.currentstr
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

    glk_stream_open_memory( buf, fmode, rock )
    {
        return this._stream_open_memory( buf, fmode, rock, false )
    }

    glk_stream_open_memory_uni( buf, fmode, rock )
    {
        return this._stream_open_memory( buf, fmode, rock, true )
    }

    async glk_stream_open_resource( filenum, rock )
    {
        return await this._stream_open_resource( filenum, rock, false )
    }

    async glk_stream_open_resource_uni( filenum, rock )
    {
        return await this._stream_open_resource( filenum, rock, true )
    }

    glk_stream_set_current( str )
    {
        this.currentstr = str
    }

    async _get_array( str, array, unicode )
    {
        if ( !str )
        {
            throw new Error( 'Glk._get_array: invalid stream' )
        }

        if ( !str.readable )
        {
            return 0
        }

        let len = array.length
        switch ( str.type )
        {
            case Const.strtype_File:
                return str.fstream.fread( array )

            case Const.strtype_Memory:
            case Const.strtype_Resource:
                if ( str.bufpos >= str.bufeof )
                {
                    len = 0
                }
                else
                {
                    if ( str.bufpos + len > str.bufeof )
                    {
                        len = str.bufeof - str.bufpos
                    }
                }

                if ( !unicode )
                {
                    for ( let lx = 0; lx < len; lx++ )
                    {
                        let ch = str.buf[str.bufpos++]
                        if ( !unicode && ch >= 0x100 )
                        {
                            ch = 63 // '?'
                        }
                        array[lx] = ch
                    }
                }
                else
                {
                    for ( let lx = 0; lx < len; lx++ )
                    {
                        array[lx] = str.buf[str.bufpos++]
                    }
                }
                str.readcount += len
                return len

            default:
                return 0
        }
    }

    _new_stream( options )
    {
        const str = Object.assign( {
            disprock: null,
            readcount: 0,
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
            array = TrimArrayToBytes( array )
        }

        str.writecount += array.length

        let len = array.length
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
                        throw new Error( 'Glk._put_array: trying to put unicode non-binary array' )
                    }
                    else
                    {
                        throw new Error( 'Glk._put_array: trying to put unicode binary array' )
                    }
                }
                break

            case Const.strtype_Memory:
                if ( len > str.buflen - str.bufpos )
                {
                    len = str.buflen - str.bufpos
                }
                for ( let ix = 0; ix < len; ix++ )
                {
                    str.buf[str.bufpos + ix] = array[ix]
                }
                str.bufpos += len
                break

            case Const.strtype_Window:
                if ( str.win.line_request )
                {
                    throw new Error( 'Glk._put_array: window has pending line request' )
                }
                this._window_put_string( str.win, String.fromCodePoint.apply( null, array ) )
                if ( str.win.echostr )
                {
                    this._put_array( str.win.echostr, array )
                }
                break
        }
    }

    _put_char( str, ch )
    {
        if ( !str || !str.writable )
        {
            throw new Error( 'Glk._put_char: invalid stream' )
        }

        if ( !str.unicode && ( ch < 0 || ch >= 0x100 ) )
        {
            ch = 63 // '?'
        }

        str.writecount += 1

        switch ( str.type )
        {
            case Const.strtype_File:
                if ( !str.unicode )
                {
                    str.fstream.fwrite( [ch] )
                }
                else
                {
                    throw new Error( 'Glk._put_char: writing char to unicode file' )
                }
                break

            case Const.strtype_Memory:
                if ( str.bufpos < str.buflen )
                {
                    str.buf[str.bufpos] = ch
                    str.bufpos += 1
                    if ( str.bufpos > str.bufeof )
                    {
                        str.bufeof = str.bufpos
                    }
                }
                break

            case Const.strtype_Window:
                if ( str.win.line_request )
                {
                    throw new Error( 'Glk._put_char: window has pending line request' )
                }
                this._window_put_string( str.win, String.fromCodePoint( ch ) )
                if ( str.win.echostr )
                {
                    this._put_char( str.win.echostr, ch )
                }
                break
        }
    }

    async _stream_open_file( fref, fmode, rock, unicode )
    {
        const funcname = 'Glk._stream_open_file'
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

        return this._new_stream({
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
    }

    _stream_open_memory( buf, fmode, rock, unicode )
    {
        if ( fmode !== Const.filemode_Read
            && fmode !== Const.filemode_Write
            && fmode !== Const.filemode_ReadWrite )
        {
            throw new Error( 'Glk._stream_open_memory: illegal filemode' )
        }

        const buflen = buf ? buf.length : 0
        const str = this._new_stream({
            buf,
            bufeof: fmode === Const.filemode_Write ? 0 : buflen,
            buflen,
            bufpos: 0,
            readable: fmode !== Const.filemode_Write,
            rock,
            type: Const.strtype_Memory,
            unicode,
            writable: fmode !== Const.filemode_Read,
        })

        if ( buf )
        {
            if ( this.GiDispa )
            {
                this.GiDispa.retain_array( buf )
            }
        }

        return str
    }

    async _stream_open_resource( filenum, rock, unicode )
    {
        if ( !this.GiLoad || !this.GiLoad.find_data_chunk )
        {
            return null
        }

        const chunk = await this.GiLoad.find_data_chunk( filenum )
        if ( !chunk )
        {
            return null
        }

        const buf = chunk.data
        const buflen = buf ? buf.length : 0

        return this._new_stream({
            buf,
            bufeof: buflen,
            buflen,
            bufpos: 0,
            isbinary: chunk.type === 'BINA',
            readable: true,
            resfilenum: filenum,
            rock,
            type: Const.strtype_Resource,
            unicode,
            writable: false,
        })
    }
}

export default StreamAPI