/*

Constants
=========

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as protocol from './protocol.js'

export const DEFAULT_METRICS: protocol.NormalisedMetrics = {
    buffercharheight: 1,
    buffercharwidth: 1,
    buffermarginx: 0,
    buffermarginy: 0,
    graphicsmarginx: 0,
    graphicsmarginy: 0,
    gridcharheight: 1,
    gridcharwidth: 1,
    gridmarginx: 0,
    gridmarginy: 0,
    height: 50,
    inspacingx: 0,
    inspacingy: 0,
    outspacingx: 0,
    outspacingy: 0,
    width: 80,
}

// Dialog file constants
export const filemode_Write = 0x01
export const filemode_Read = 0x02
export const filemode_ReadWrite = 0x03
export const filemode_WriteAppend = 0x05
export const seekmode_Start = 0
export const seekmode_Current = 1
export const seekmode_End = 2
export const fileusage_Data = 0x00
export const fileusage_SavedGame = 0x01
export const fileusage_Transcript = 0x02
export const fileusage_InputRecord = 0x03

export const KEY_NAMES_TO_CODES: Record<protocol.SpecialKeyCode, number> = {
    delete: 8, // Backspace to be precise
    down: 40,
    end: 35,
    escape: 27,
    func1: 112,
    func2: 113,
    func3: 114,
    func4: 115,
    func5: 116,
    func6: 117,
    func7: 118,
    func8: 119,
    func9: 120,
    func10: 121,
    func11: 122,
    func12: 123,
    home: 36,
    left: 37,
    pagedown: 34,
    pageup: 33,
    return: 13,
    right: 39,
    tab: 9,
    up: 38,
}
// Using a trick from https://stackoverflow.com/a/46582758
export const KEY_CODES_TO_NAMES: Record<number, protocol.SpecialKeyCode> = Object.assign({}, ...Object.entries(KEY_NAMES_TO_CODES).map(([a,b]) => ({ [b]: a })))

export const NBSP = '\xa0'
export const THINSPACE = '\u2009'

export const OFFSCREEN_OFFSET = '-10000px'

export const PACKAGE_VERSION = '0.1.0'