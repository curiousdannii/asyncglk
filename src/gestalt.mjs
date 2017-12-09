/*

Gestalt functions
=================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as Const from 'const.mjs'

const Gestalt = Base => class extends Base
{
    glk_gestalt( sel, val )
    {
        return this.glk_gestalt_ext( sel, val )
    }

    glk_gestalt_ext( sel, val, arr, arrlen )
    {
        const support = this.support

        if ( arr && typeof arr === 'number' )
        {
            arr = this.mem.getUint32Array( arr, arrlen )
        }

        switch ( sel )
        {
            case Const.gestalt_Version:
                // This library implements Glk spec version 0.7.4.
                return 0x00000704

            case Const.gestalt_CharInput:
                /* This is not a terrific approximation. Return false for function
                    keys, control keys, and the high-bit non-printables. For
                    everything else in the Unicode range, return true. */
                if ( val <= Const.keycode_Left && val >= Const.keycode_End )
                {
                    return 1
                }
                if ( val >= 0x100000000 - Const.keycode_MAXVAL )
                {
                    return 0
                }
                if ( val > 0x10FFFF )
                {
                    return 0
                }
                if ( ( val >= 0 && val < 32 ) || ( val >= 127 && val < 160 ) )
                {
                    return 0
                }
                return 1

            case Const.gestalt_LineInput:
                /* Same as the above, except no special keys. */
                if ( val > 0x10FFFF )
                {
                    return 0
                }
                if ( ( val >= 0 && val < 32 ) || ( val >= 127 && val < 160 ) )
                {
                    return 0
                }
                return 1

            case Const.gestalt_CharOutput:
                /* Same thing again. We assume that all printable characters,
                    as well as the placeholders for nonprintables, are one character
                    wide. */
                if ( ( val > 0x10FFFF )
                    || ( val >= 0 && val < 32 )
                    || ( val >= 127 && val < 160 ) )
                {
                    if ( arr )
                    {
                        arr[0] = 1
                    }
                    return Const.gestalt_CharOutput_CannotPrint
                }
                if ( arr )
                {
                    arr[0] = 1
                }
                return Const.gestalt_CharOutput_ExactPrint

            case Const.gestalt_MouseInput:
                if ( val === Const.wintype_TextGrid )
                {
                    return 1
                }
                if ( support.graphics && val === Const.wintype_Graphics )
                {
                    return 1
                }
                return 0

            case Const.gestalt_Timer:
                return support.timer || 0

            case Const.gestalt_Graphics:
                return support.graphics || 0

            case Const.gestalt_DrawImage:
                if ( support.graphics && ( val === Const.wintype_TextBuffer || val === Const.wintype_Graphics ) )
                {
                    return 1
                }
                return 0

            case Const.gestalt_Sound:
                return 0

            case Const.gestalt_SoundVolume:
                return 0

            case Const.gestalt_SoundNotify:
                return 0

            case Const.gestalt_Hyperlinks:
                return support.hyperlinks || 0

            case Const.gestalt_HyperlinkInput:
                if ( support.hyperlinks && ( val === Const.wintype_TextBuffer || val === Const.wintype_TextGrid ) )
                {
                    return 1
                }
                return 0

            case Const.gestalt_SoundMusic:
                return 0

            case Const.gestalt_GraphicsTransparency:
                return support.graphics || 0

            case Const.gestalt_Unicode:
                return 1

            case Const.gestalt_UnicodeNorm:
                return 1

            case Const.gestalt_LineInputEcho:
                return 1

            case Const.gestalt_LineTerminators:
                return 1

            case Const.gestalt_LineTerminatorKey:
                /* Really this result should be inspected from glkote.js. Since it
                    isn't, be sure to keep these values in sync with
                    terminator_key_names. */
                if ( val === Const.keycode_Escape )
                {
                    return 1
                }
                if ( val >= Const.keycode_Func12 && val <= Const.keycode_Func1 )
                {
                    return 1
                }
                return 0

            case Const.gestalt_DateTime:
                return 1

            case Const.gestalt_Sound2:
                return 0

            case Const.gestalt_ResourceStream:
                return 1

            case Const.gestalt_GraphicsCharInput:
                return 0
        }

        return 0
    }
}

export default Gestalt