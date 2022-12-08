/*

GlkApi constants
================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {BufferWindowImage, TerminatorCode} from '../common/protocol.js'

export const GLK_NULL = 0
export const MAX_LATIN1 = 0xFF
export const QUESTION_MARK = 63

export const FILE_TYPES: Record<number, string> = {
    0: 'data',
    1: 'save',
    2: 'transcript',
    3: 'command',
}

export const IMAGE_ALIGNMENTS: Record<number, BufferWindowImage['alignment']> = {
    1: 'inlineup',
    2: 'inlinedown',
    3: 'inlinecenter',
    4: 'marginleft',
    5: 'marginright',
}

export const STYLE_NAMES: Record<number, string> = {
    0: 'normal',
    1: 'emphasized',
    2: 'preformatted',
    3: 'header',
    4: 'subheader',
    5: 'alert',
    6: 'note',
    7: 'blockquote',
    8: 'input',
    9: 'user1',
    10: 'user2',
}

export const TERMINATOR_KEYS: Record<number, TerminatorCode> = {
    0xfffffff8: 'escape',
    0xffffffef: 'func1',
    0xffffffee: 'func2',
    0xffffffed: 'func3',
    0xffffffec: 'func4',
    0xffffffeb: 'func5',
    0xffffffea: 'func6',
    0xffffffe9: 'func7',
    0xffffffe8: 'func8',
    0xffffffe7: 'func9',
    0xffffffe6: 'func10',
    0xffffffe5: 'func11',
    0xffffffe4: 'func12',
}