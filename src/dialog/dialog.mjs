/*

Dialog: An async Dialog class
==================================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

export default class Dialog
{
    autosave_read()
    {
        throw new Error( 'Method not implemented: autosave_read' )
    }

    autosave_write()
    {
        throw new Error( 'Method not implemented: autosave_write' )
    }

    file_clean_fixed_name()
    {
        throw new Error( 'Method not implemented: file_clean_fixed_name' )
    }

    file_construct_ref( filename = '', usage = '', gameid = '' )
    {
        return {
            filename,
            gameid,
            usage,
        }
    }

    file_construct_temp_ref()
    {
        throw new Error( 'Method not implemented: file_construct_temp_ref' )
    }

    async file_fopen()
    {
        throw new Error( 'Method not implemented: file_fopen' )
    }

    file_read()
    {
        throw new Error( 'Method not implemented: file_read' )
    }

    file_ref_exists()
    {
        throw new Error( 'Method not implemented: file_ref_exists' )
    }

    file_remove_ref()
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

    async open()
    {
        throw new Error( 'Method not implemented: open' )
    }

    get streaming()
    {
        return true
    }
}