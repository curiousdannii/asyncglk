/*

Dialog: An async Dialog class
==================================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as Const from '../glk/const.mjs'

export default class Dialog
{
    constructor( options )
    {
        this.appname = options.appname || 'asyncglk'
    }

    autosave_read()
    {
        throw new Error( 'Method not implemented: autosave_read' )
    }

    autosave_write()
    {
        throw new Error( 'Method not implemented: autosave_write' )
    }

    /* Dialog.file_clean_fixed_name( filename, usage ) -- clean up a filename
     *
     * Take an arbitrary string and convert it into a filename that can
     * validly be stored in the user's directory. This is called for filenames
     * that come from the game file, but not for filenames selected directly
     * by the user (i.e. from a file selection dialog).
     *
     * The new spec recommendations: delete all characters in the string
     * "/\<>:|?*" (including quotes). Truncate at the first period. Change to
     * "null" if there's nothing left. Then append an appropriate suffix:
     * ".glkdata", ".glksave", ".txt".
     */
    file_clean_fixed_name( filename, usage )
    {
        filename = filename.replace( /["/\\<>:|?*]/g, '' )
        const pos = filename.indexOf( '.' )
        if ( pos >= 0 )
        {
            filename = filename.slice( 0, pos )
        }
        if ( filename.length === 0 )
        {
            filename = 'null'
        }

        switch ( usage )
        {
            case Const.fileusage_Data:
                return filename + '.glkdata'
            case Const.fileusage_SavedGame:
                return filename + '.glksave'
            case Const.fileusage_Transcript:
            case Const.fileusage_InputRecord:
                return filename + '.txt'
            default:
                return filename
        }
    }

    file_construct_ref( filename = '', usage = '', gameid = '' )
    {
        return {
            filename,
            gameid,
            usage,
        }
    }

    file_construct_temp_ref( usage )
    {
        const filename = `temp_${ new Date().getTime() }_${ Math.random() }`.replace( '.', '' )
        return {
            filename: this.join_path( 'temp', filename ),
            usage: usage,
        }
    }

    async file_fopen()
    {
        throw new Error( 'Method not implemented: file_fopen' )
    }

    file_read()
    {
        throw new Error( 'Method not implemented: file_read' )
    }

    async file_ref_exists()
    {
        throw new Error( 'Method not implemented: file_ref_exists' )
    }

    async file_remove_ref()
    {
        throw new Error( 'Method not implemented: file_remove_ref' )
    }

    file_write()
    {
        throw new Error( 'Method not implemented: file_write' )
    }

    filters_for_usage( val )
    {
        switch ( val )
        {
            case 'data':
                return [ { name: 'Data File', extensions: ['glkdata'] } ]
            case 'save':
                return [ { name: 'Save File', extensions: ['glksave'] } ]
            case 'transcript':
                return [ { name: 'Transcript File', extensions: ['txt'] } ]
            case 'command':
                return [ { name: 'Command File', extensions: ['txt'] } ]
            default:
                return []
        }
    }

    join_path()
    {
        throw new Error( 'Method not implemented: join_path' )
    }

    async open()
    {
        throw new Error( 'Method not implemented: open' )
    }

    get streaming()
    {
        return true
    }
}