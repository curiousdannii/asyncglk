/*

Glk Windows
===========

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {winmethod_Above, winmethod_BorderMask, winmethod_DirMask, winmethod_DivisionMask, winmethod_Fixed, winmethod_Left, winmethod_Right, wintype_Blank, wintype_Graphics, wintype_Pair, wintype_TextBuffer, wintype_TextGrid} from './constants.js'
import {GlkWindow, RefStruct} from './interface.js'
import {Stream, WindowStream} from './streams.js'

export type Window = BlankWindow | BufferWindow | GraphicsWindow | GridWindow | PairWindow
type WindowTypes = 'blank' | 'buffer' | 'graphics' | 'grid' | 'pair'

export interface WindowBox {
    bottom: number
    left: number
    right: number
    top: number
}

abstract class WindowBase implements GlkWindow {
    box: WindowBox = {
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
    }
    child1: Window | null = null
    child2: Window | null = null
    disprock = 0
    echo_str: Stream | null = null
    next: Window | null = null
    parent: Window | null = null
    prev: Window | null = null
    rock: number
    stream: WindowStream
    abstract type: WindowTypes
    abstract typenum: number

    constructor(rock: number) {
        this.rock = rock
        this.stream = new WindowStream(this as Window)
    }

    clear() {}

    close(result?: RefStruct) {}
}

export class BlankWindow extends WindowBase {
    type = 'blank' as const
    typenum = wintype_Blank
}

export class BufferWindow extends WindowBase {
    type = 'buffer' as const
    typenum = wintype_TextBuffer
}

export class GraphicsWindow extends WindowBase {
    height = 0
    type = 'graphics' as const
    typenum = wintype_Graphics
    width = 0
}

export class GridLine {}

export class GridWindow extends WindowBase {
    height = 0
    lines: GridLine[] = []
    type = 'grid' as const
    typenum = wintype_TextGrid
    width = 0

    update_size(height: number, width: number) {
        const oldheight = this.height
        this.height = Math.max(0, height)
        this.width = Math.max(0, width)
        // Resize the lines array if necessary
        if (oldheight > this.height) {
            this.lines.length = this.height
        }
        else {
            for (let i = oldheight; i < this.height; i++) {
                this.lines[i] = new GridLine()
            }
        }
        // TODO: handle changing row width
    }
}

export class PairWindow extends WindowBase {
    backward: boolean
    border: boolean
    dir: number
    fixed: boolean
    key: Window
    size: number
    type = 'pair' as const
    typenum = wintype_Pair
    vertical: boolean

    constructor(keywin: Window, method: number, size: number) {
        super(0)
        this.border = (method & winmethod_BorderMask) === winmethod_BorderMask
        this.dir = method & winmethod_DirMask
        this.fixed = (method & winmethod_DivisionMask) === winmethod_Fixed
        this.key = keywin
        this.size = size
        this.backward = this.dir === winmethod_Left || this.dir === winmethod_Above
        this.vertical = this.dir === winmethod_Left || this.dir === winmethod_Right
    }
}