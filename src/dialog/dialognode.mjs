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

const open = util.promisify( fs.open )

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
    }

    async open()
    {
        this.fd = await open( this.filename, modestrings[this.fmode] )
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
}