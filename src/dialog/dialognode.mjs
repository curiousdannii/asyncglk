/*

DialogNode: A Node.js Dialog class
==================================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import fs from 'fs'
import util from 'util'

import * as Const from '../glk/const.mjs'
import Dialog from './dialog.mjs'

const promisify = util.promisify
const access = promisify( fs.access )
const close = promisify( fs.close )
const read = promisify( fs.read )
const open = promisify( fs.open )
const write = promisify( fs.write )

const modestrings = {
    [Const.filemode_Read]: 'r',
    [Const.filemode_ReadWrite]: 'a',
    [Const.filemode_Write]: 'w',
    [Const.filemode_WriteAppend]: 'a',
}

class FStream
{
    constructor( fmode, filename )
    {
        this.fd = null
        this.filename = filename
        this.fmode = fmode
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
        const data = await read( this.fd, array, 0, len || array.buffer.byteLength, null )
        return data.bytesRead
    }

    // Queue an array to be written to the buffer
    fwrite( array )
    {
        this.writebuffer.push( array )
        this._write()
    }

    async open()
    {
        this.fd = await open( this.filename, modestrings[this.fmode] )
    }

    // Go through the queue, writing each in turn
    async _write()
    {
        while ( this.writebuffer.length )
        {
            const data = this.writebuffer.shift()
            await write( this.fd, data )
        }
    }
}

export default class DialogNode extends Dialog
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
}