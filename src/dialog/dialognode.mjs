/*

DialogNode: A Node.js Dialog class
==================================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import fs from 'fs'
import mkdirp_module from 'mkdirp'
import os from 'os'
import path from 'path'
import util from 'util'

import * as Const from '../glk/const.mjs'
import * as Dialog from './dialog.mjs'

const promisify = util.promisify
const access = promisify( fs.access )
const close = promisify( fs.close )
const fstat = promisify( fs.fstat )
const mkdirp = promisify( mkdirp_module )
const read = promisify( fs.read )
const open = promisify( fs.open )
const unlink = promisify( fs.unlink )
const write = promisify( fs.write )

const modestrings = {
    [Const.filemode_Read]: 'r',
    [Const.filemode_ReadWrite]: 'r+',
    [Const.filemode_Write]: 'w',
    [Const.filemode_WriteAppend]: 'r+',
}

class FStream
{
    constructor( fmode, filename )
    {
        this.fd = null
        this.filename = filename
        this.fmode = fmode
        this.pos = 0
        this.writebuffer = []
    }

    async fclose()
    {
        await this._write()
        await close( this.fd )
    }

    async fread( array, len )
    {
        await this._write()
        const data = await read( this.fd, array, 0, len, this.pos )
        this.pos += data.bytesRead
        return data.bytesRead
    }

    async fseek( pos, seekmode )
    {
        await this._write()

        let val = 0
        if ( seekmode === Const.seekmode_Current )
        {
            val = this.pos + pos
        }
        else if ( seekmode === Const.seekmode_End )
        {
            try
            {
                const stats = await fstat( this.fd )
                val = stats.size + pos
            }
            catch (ex)
            {
                val = this.pos + pos
            }
        }
        else
        {
            val = pos
        }
        if ( val < 0 )
        {
            val = 0
        }
        this.pos = val
    }

    async ftell()
    {
        await this._write()
        return this.pos
    }

    // Queue an array to be written to the buffer
    fwrite( array )
    {
        this.writebuffer.push( array )
        this._write()
    }

    async open()
    {
        const fmode = this.fmode

        await mkdirp( path.dirname( this.filename ) )

        /* The spec says that Write, ReadWrite, and WriteAppend create the
        file if necessary. However, open( filename, "r+" ) doesn't create
        a file. So we have to pre-create it in the ReadWrite and
        WriteAppend cases. (We use "a" so as not to truncate.) */

        if ( fmode === Const.filemode_ReadWrite || fmode === Const.filemode_WriteAppend )
        {
            try
            {
                const tempfd = await open( this.filename, 'a' )
                await close( tempfd )
            }
            catch ( ex )
            {
                //this.log( `file_fopen: failed to open ${ fstream.filename }: ${ ex }` )
                return null
            }
        }

        this.fd = await open( this.filename, modestrings[fmode] )

        if ( fmode === Const.filemode_WriteAppend )
        {
            // We must manually jump to the end of the file
            try
            {
                const stats = await fstat( this.fd )
                this.pos = stats.size
            }
            catch ( ex ) {}
        }
    }

    // Go through the queue, writing each in turn
    async _write()
    {
        while ( this.writebuffer.length )
        {
            const data = this.writebuffer.shift()
            const len = data.length
            const pos = this.pos
            this.pos += data.length
            if ( typeof data === 'string' )
            {
                await write( this.fd, data, pos )
            }
            else
            {
                await write( this.fd, Uint8Array.from( data ), 0, len, pos )
            }
        }
    }
}

export default class DialogNode extends Dialog.Dialog
{
    async file_fopen( fmode, ref )
    {
        const fstream = new FStream( fmode, ref.filename )
        await fstream.open()
        return fstream
    }

    async file_ref_exists( ref )
    {
        try
        {
            await access( ref.filename )
        }
        catch (e)
        {
            return false
        }
        return true
    }

    async file_remove_ref( ref )
    {
        try
        {
            await unlink( ref.filename )
        }
        catch (e) {}
    }

    join_path( dir_mode, filename )
    {
        let directory = ''
        switch ( dir_mode )
        {
            case Dialog.filepath_Temp:
                directory = path.join( os.tmpdir(), this.appname )
        }

        return path.join( directory, filename )
    }
}