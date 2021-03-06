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

    async glk_get_char_stream( str )
    {
        return this._get_char( str, false )
    }

    async glk_get_char_stream_uni( str )
    {
        return this._get_char( str, true )
    }

    glk_put_buffer( array )
    {
        this._put_array( this.currentstr || this.Glk.glk_stream_get_current(), array )
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
        this._put_array( this.currentstr || this.Glk.glk_stream_get_current(), array )
    }

    glk_put_char( ch )
    {
        this._put_char( this.currentstr || this.Glk.glk_stream_get_current(), ch & 0xFF )
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
        this._put_char( this.currentstr || this.Glk.glk_stream_get_current(), ch )
    }

    glk_put_jstring( val, allbytes )
    {
        this.glk_put_jstring_stream( this.currentstr || this.Glk.glk_stream_get_current(), val, allbytes )
    }

    glk_put_jstring_stream( str, val, allbytes )
    {
        if ( !str || !str.writable )
        {
            throw new Error( 'glk_put_jstring_stream: invalid stream' )
        }

        str.writecount += val.length

        let len = val.length
        let ch
        switch ( str.type )
        {
            case Const.strtype_File:
                if ( !str.unicode )
                {
                    str.fstream.fwrite( val )
                }
                else
                {
                    if ( !str.isbinary )
                    {
                        throw new Error( 'glk_put_jstring_stream: trying to put unicode non-binary array' )
                    }
                    else
                    {
                        throw new Error( 'glk_put_jstring_stream: trying to put unicode binary array' )
                    }
                }
                break

            case Const.strtype_Memory:
                if ( len > str.buflen - str.bufpos )
                {
                    len = str.buflen - str.bufpos
                }
                if ( str.unicode || allbytes )
                {
                    for ( let ix = 0; ix < len; ix++ )
                    {
                        // TODO: deal with post-BMP characters?
                        str.buf[str.bufpos+ix] = val.charCodeAt( ix )
                    }
                }
                else
                {
                    for ( let ix = 0; ix < len; ix++ )
                    {
                        ch = val.charCodeAt( ix )
                        str.buf[str.bufpos+ix] = ch < 0 || ch >= 0x100 ? 63 : ch
                    }
                }
                str.bufpos += len
                break

            case Const.strtype_Window:
                if ( str.win.line_request )
                {
                    throw new Error( 'glk_put_jstring_stream: window has pending line request' )
                }
                //this._window_put_string( str.win, val )
                this.Glk.glk_put_jstring_stream( str, val )
                if ( str.win.echostr )
                {
                    this.glk_put_jstring_stream( str.win.echostr, val, allbytes )
                }
                break
        }
    }

    glk_put_string( val )
    {
        this.glk_put_jstring_stream( this.currentstr || this.Glk.glk_stream_get_current(), val, true )
    }

    glk_put_string_stream( str, val )
    {
        this.glk_put_jstring_stream( str, val, true )
    }

    glk_put_string_stream_uni( str, val )
    {
        this.glk_put_jstring_stream( str, val, false )
    }

    glk_put_string_uni( val )
    {
        this.glk_put_jstring_stream( this.currentstr || this.Glk.glk_stream_get_current(), val, false )
    }

    async glk_stream_close( str, result )
    {
        if ( !str )
        {
            throw new Error( 'glk_stream_close: invalid stream' )
        }

        if ( str.type === Const.strtype_Window )
        {
            throw new Error( 'glk_stream_close: cannot close window stream' )
        }

        this._stream_fill_result( str, result )
        await this._delete_stream( str )
    }

    glk_stream_get_current()
    {
        return this.currentstr
    }

    async glk_stream_get_position( str )
    {
        if ( !str )
        {
            throw new Error( 'glk_stream_get_position: invalid stream' )
        }

        switch ( str.type )
        {
            case Const.strtype_File:
                return await str.fstream.ftell()
            case Const.strtype_Resource:
            case Const.strtype_Memory:
                return str.bufpos
            default:
                return 0
        }
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

    async glk_stream_set_position( str, pos, seekmode )
    {
        if ( !str )
        {
            throw new Error( 'glk_stream_set_position: invalid stream' )
        }

        switch ( str.type )
        {
            case Const.strtype_File:
                await str.fstream.fseek( pos, seekmode )
                break

            case Const.strtype_Resource:
            case Const.strtype_Memory:
                if ( seekmode === Const.seekmode_Current )
                {
                    pos = str.bufpos + pos
                }
                else if ( seekmode === Const.seekmode_End )
                {
                    pos = str.bufeof + pos
                }
                else
                {
                    /* pos = pos */
                }
                if ( pos < 0 )
                {
                    pos = 0
                }
                if ( pos > str.bufeof )
                {
                    pos = str.bufeof
                }
                str.bufpos = pos
        }
    }

    async _delete_stream( str )
    {
        if ( str === this.currentstr )
        {
            this.currentstr = null
        }

        this._windows_unechostream( str )

        if ( str.type === Const.strtype_Memory )
        {
            if ( this.GiDispa )
            {
                this.GiDispa.unretain_array( str.buf )
            }
        }
        else if ( str.type === Const.strtype_File )
        {
            await str.fstream.fclose()
            str.fstream = null
        }

        if ( this.GiDispa )
        {
            this.GiDispa.class_unregister( 'stream', str )
        }

        const prev = str.prev
        const next = str.next
        str.prev = null
        str.next = null

        if ( prev )
        {
            prev.next = next
        }
        else
        {
            this.streamlist = next
        }
        if ( next )
        {
            next.prev = prev
        }

        str.fstream = null
        str.buf = null
        str.readable = false
        str.writable = false
        str.ref = null
        str.win = null
        str.file = null
        str.rock = null
        str.disprock = null
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
                return str.fstream.fread( array, len )

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
                        if ( ch >= 0x100 )
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

    async _get_char( str, unicode )
    {
        if ( !str || !str.readable )
        {
            return -1
        }

        let ch, len
        switch ( str.type )
        {
            case Const.strtype_File:
                if ( !str.unicode )
                {
                    len = await str.fstream.fread( str.buffer4, 1 )
                    if ( !len )
                    {
                        return -1
                    }
                    str.readcount++
                    return str.buffer4[0]
                }
                else
                {
                    if ( !str.isbinary )
                    {
                        // slightly less cheap UTF8 stream
                        return -1
                    }
                    else
                    {
                        /* cheap big-endian stream */
                        len = str.fstream.fread( str.buffer4, 4 )
                        if ( len < 4 )
                        {
                            return -1
                        }
                        /*### or buf.readUInt32BE(0, true) */
                        ch = ( str.buffer4[0] << 24 )
                        ch |= ( str.buffer4[1] << 16 )
                        ch |= ( str.buffer4[2] << 8 )
                        ch |= str.buffer4[3]
                    }
                    str.readcount++
                    ch >>>= 0
                    if ( !unicode && ch >= 0x100 )
                    {
                        return 63 // return '?'
                    }
                    return ch
                }

            case Const.strtype_Resource:
                if (str.unicode)
                {
                    if (str.isbinary)
                    {
                        /* cheap big-endian stream */
                        if ( str.bufpos >= str.bufeof )
                        {
                            return -1
                        }
                        ch = str.buf[str.bufpos]
                        str.bufpos++
                        if ( str.bufpos >= str.bufeof )
                        {
                            return -1
                        }
                        ch = ( ch << 8 ) | ( str.buf[str.bufpos] & 0xFF )
                        str.bufpos++
                        if ( str.bufpos >= str.bufeof )
                        {
                            return -1
                        }
                        ch = ( ch << 8 ) | ( str.buf[str.bufpos] & 0xFF )
                        str.bufpos++
                        if ( str.bufpos >= str.bufeof )
                        {
                            return -1
                        }
                        ch = ( ch << 8 ) | ( str.buf[str.bufpos] & 0xFF )
                        str.bufpos++
                    }
                    else
                    {
                        /* slightly less cheap UTF8 stream */
                        return -1
                    }
                    str.readcount++
                    ch >>>= 0
                    if ( !unicode && ch >= 0x100 )
                    {
                        return 63 // return '?'
                    }
                    return ch
                }
                // non-unicode file/resource, fall through to memory...

            case Const.strtype_Memory:
                if ( str.bufpos < str.bufeof )
                {
                    ch = str.buf[str.bufpos]
                    str.bufpos++
                    str.readcount++
                    if ( !unicode && ch >= 0x100 )
                    {
                        return 63 // return '?'
                    }
                    return ch
                }
                else
                {
                    return -1 // end of stream
                }

            default:
                return -1
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
                //this._window_put_string( str.win, String.fromCodePoint.apply( null, array ) )
                this.Glk.glk_put_jstring_stream( str, String.fromCodePoint.apply( null, array ) )
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
                //this._window_put_string( str.win, String.fromCodePoint( ch ) )
                this.Glk.glk_put_jstring_stream( str, String.fromCodePoint( ch ) )
                if ( str.win.echostr )
                {
                    this._put_char( str.win.echostr, ch )
                }
                break
        }
    }

    _stream_fill_result( str, result )
    {
        if ( result )
        {
            result.set_field( 0, str.readcount )
            result.set_field( 1, str.writecount )
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
            buffer4: new Uint8Array( 4 ),
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