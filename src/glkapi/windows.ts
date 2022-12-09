/*

Glk Windows
===========

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {BufferWindowImage, BufferWindowParagraphUpdate, GraphicsWindowOperation, InputUpdate, TextRun, WindowStyles} from '../common/protocol.js'

import {winmethod_Above, winmethod_BorderMask, winmethod_DirMask, winmethod_DivisionMask, winmethod_Fixed, winmethod_Left, winmethod_Right, wintype_Blank, wintype_Graphics, wintype_Pair, wintype_TextBuffer, wintype_TextGrid} from './constants.js'
import {GlkArray, GlkWindow} from './interface.js'
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
    disprock = 0
    echo_str: Stream | null = null
    input: InputUpdate = {
        id: 0,
    }
    next: Window | null = null
    parent: PairWindow | null = null
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
    put_string(_str: string, _style?: string) {}
    set_css(_name: string, _val?: string | number) {}
    set_hyperlink(_val: number) {}
    set_style(_style: string) {}
}

export class BlankWindow extends WindowBase {
    type = 'blank' as const
    typenum = wintype_Blank
}

export abstract class TextWindow extends WindowBase {
    line_input_buf?: GlkArray
    partial_input?: string
    request_echo_line_input = true
    protected stylehints: WindowStyles
    uni_input?: boolean

    constructor(rock: number, stylehints: WindowStyles) {
        super(rock)
        this.stylehints = stylehints
    }
}

export class BufferWindow extends TextWindow {
    private cleared = true
    content: BufferWindowParagraphUpdate[]
    echo_line_input = true
    private last_par: BufferWindowParagraphUpdate
    private last_textrun: TextRun
    type = 'buffer' as const
    typenum = wintype_TextBuffer

    constructor(rock: number, stylehints: WindowStyles) {
        super(rock, stylehints)
        this.content = [{
            content: [clone_textrun(BASE_TEXTRUN)],
        }]
        this.last_par = this.content[0]
        this.last_textrun = this.last_par.content![0] as TextRun
    }

    clear() {
        this.cleared = true
        this.content = [{
            content: [clone_textrun(this.last_textrun)],
        }]
        this.last_par = this.content[0]
        this.last_textrun = this.last_par.content![0] as TextRun
    }

    private clone_textrun(force?: boolean) {
        if (force || this.last_textrun.text !== '') {
            this.last_textrun = clone_textrun(this.last_textrun)
            this.last_par.content!.push(this.last_textrun)
        }
    }

    put_image(img: BufferWindowImage) {
        img.hyperlink = this.last_textrun.hyperlink
        this.last_par.content!.push(img)
        this.clone_textrun(true)
    }

    put_string(str: string, style?: string) {
        const old_style = this.last_textrun.style
        if (style) {
            this.set_style(style)
        }
        for (const [i, line] of str.split('\n').entries()) {
            if (i !== 0) {
                this.last_textrun = clone_textrun(this.last_textrun)
                this.last_par = {content: [this.last_textrun]}
                this.content.push(this.last_par)
            }
            this.last_textrun.text += line
        }
        if (style) {
            this.set_style(old_style)
        }
    }

    set_css(name: string, val?: string | number) {
        if (this.last_textrun.css_styles![name] !== val) {
            this.clone_textrun()
            if (val === undefined) {
                delete this.last_textrun.css_styles![name]
            }
            else {
                this.last_textrun.css_styles![name] = val
            }
        }
    }

    set_flow_break() {
        this.last_par.flowbreak = true
    }

    set_hyperlink(val?: number) {
        if (val === 0) {
            val = undefined
        }
        if (val !== this.last_textrun.hyperlink) {
            this.clone_textrun()
            if (val) {
                this.last_textrun.hyperlink = val
            }
            else {
                delete this.last_textrun.hyperlink
            }
        }
    }

    set_style(style: string) {
        if (style !== this.last_textrun.style) {
            this.clone_textrun()
            this.last_textrun.style = style
        }
    }
}

export class GraphicsWindow extends WindowBase {
    draw: GraphicsWindowOperation[] = []
    height = 0
    type = 'graphics' as const
    typenum = wintype_Graphics
    uni_input?: boolean
    width = 0

    clear() {
        this.draw = this.draw.filter(op => op.special === 'setcolor').slice(-1)
        this.draw.push({special: 'fill'})
    }
}

interface GridLine {
    content: TextRun[]
    changed: boolean
}

export class GridWindow extends TextWindow {
    private current_styles = clone_textrun(BASE_TEXTRUN)
    height = 0
    lines: GridLine[] = []
    type = 'grid' as const
    typenum = wintype_TextGrid
    width = 0
    x = 0
    y = 0

    clear() {
        const height = this.height
        this.update_size(0, this.width)
        this.update_size(height, this.width)
    }

    put_string(str: string, style?: string) {
        const old_style = this.current_styles.style
        if (style) {
            this.set_style(style)
        }
        for (const ch of str) {
            if (this.x >= this.width) {
                this.x = 0
                this.y++
            }
            if (this.y >= this.height) {
                break
            }
            if (ch === '\n') {
                this.x = 0
                this.y++
                continue
            }
            const line = this.lines[this.y]
            line.changed = true
            line.content[this.x++] = clone_textrun(this.current_styles, ch)
        }
        if (style) {
            this.set_style(old_style)
        }
    }

    set_css(name: string, val?: string | number) {
        if (this.current_styles.css_styles![name] !== val) {
            this.current_styles = clone_textrun(this.current_styles)
            if (val === undefined) {
                delete this.current_styles.css_styles![name]
            }
            else {
                this.current_styles.css_styles![name] = val
            }
        }
    }

    set_hyperlink(val: number) {
        if (val) {
            this.current_styles.hyperlink = val
        }
        else {
            delete this.current_styles.hyperlink
        }
    }

    set_style(style: string) {
        this.current_styles.style = style
    }

    update_size(height: number, width: number) {
        const oldheight = this.height
        const oldwidth = this.width
        this.height = height
        this.width = width

        // Resize the lines array if necessary
        if (oldheight > height) {
            this.lines.length = height
        }
        else if (height > oldheight) {
            for (let i = oldheight; i < height; i++) {
                const new_line: TextRun[] = []
                for (let c = 0; c < width; c++) {
                    new_line.push(clone_textrun(BASE_TEXTRUN, ' '))
                }
                this.lines[i] = {
                    changed: true,
                    content: new_line,
                }
            }
        }
        // Fix the width of old rows
        const rows_to_fix = Math.min(height, oldheight)
        if (rows_to_fix && width !== oldwidth) {
            for (let i = 0; i < rows_to_fix; i++) {
                const line = this.lines[i]
                if (width < oldwidth) {
                    line.changed = true
                    line.content.length = width
                }
                else {
                    line.changed = true
                    for (let c = oldwidth; c < width; c++) {
                        line.content.push(clone_textrun(BASE_TEXTRUN, ' '))
                    }
                }
            }
        }
    }
}

export class PairWindow extends WindowBase {
    backward: boolean
    child1: Window | null = null
    child2: Window | null = null
    border: boolean
    dir: number
    fixed: boolean
    key: Window | null
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

const BASE_TEXTRUN: TextRun = {
    css_styles: {},
    style: 'normal',
    text: '',
}

/** Clone a text run */
function clone_textrun(tr: TextRun, new_text = '') {
    return Object.assign({}, tr, {
        css_styles: Object.assign({}, tr.css_styles),
        text: new_text,
    })
}