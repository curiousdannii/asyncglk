/*

Window functions
================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import process from 'process'

const WindowAPI = Base => class extends Base
{
    _window_put_string( win, val )
    {
        process.stdout.write( val )
    }
}

export default WindowAPI