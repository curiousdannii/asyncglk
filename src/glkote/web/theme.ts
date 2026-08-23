/*

Theme table for glk_style_measure
=================================

Copyright (c) 2026 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {style_NUMSTYLES} from '../../glkapi/constants.js'
import {STYLE_NAMES} from '../../glkapi/lib_constants.js'
import type {StyleEntry, StyleTable, Theme} from '../../common/protocol.js'

const STYLE_KEYS = ['fg', 'bg', 'weight', 'oblique', 'proportional', 'reverse', 'size'] as const

/** Convert a CSS colour string to a Glk 0xRRGGBB code */
export function css_color_to_glk(color: string, fallback: number): number {
    if (!color || color === 'transparent') {
        return fallback
    }
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) {
        return fallback
    }
    ctx.fillStyle = color
    const normalised = ctx.fillStyle
    if (typeof normalised !== 'string') {
        return fallback
    }
    if (normalised.startsWith('#')) {
        const hex = normalised.length === 4
            ? normalised.slice(1).split('').map(c => c + c).join('')
            : normalised.slice(1, 7)
        return parseInt(hex, 16)
    }
    const match = normalised.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
        return (parseInt(match[1], 10) << 16)
            | (parseInt(match[2], 10) << 8)
            | parseInt(match[3], 10)
    }
    return fallback
}

function glk_font_weight(weight: string): -1 | 0 | 1 {
    if (weight === 'lighter') {
        return -1
    }
    if (weight === 'bold' || weight === 'bolder') {
        return 1
    }
    const num = parseInt(weight, 10)
    if (!Number.isNaN(num)) {
        if (num < 400) {
            return -1
        }
        if (num >= 600) {
            return 1
        }
    }
    return 0
}

function is_oblique(style: string): 0 | 1 {
    return (style === 'italic' || style === 'oblique') ? 1 : 0
}

function is_proportional(font_family: string, mono_family: string): 0 | 1 {
    const first = font_family.split(',')[0].trim().replace(/['"]/g, '').toLowerCase()
    const mono_first = mono_family.split(',')[0].trim().replace(/['"]/g, '').toLowerCase()
    return first === mono_first ? 0 : 1
}

/** Fully measured attributes for one style (all fields present) */
export type MeasuredStyleEntry = Required<StyleEntry>

/** Read one style's theme attributes from a rendered element */
export function measure_style_entry(el: HTMLElement, window_bg: number): MeasuredStyleEntry {
    const computed = getComputedStyle(el)
    const fg = css_color_to_glk(computed.color, 0)
    let bg = css_color_to_glk(computed.backgroundColor, window_bg)
    if (bg === 0 && computed.backgroundColor === 'rgba(0, 0, 0, 0)') {
        bg = window_bg
    }
    const root = el.ownerDocument.documentElement
    const mono_family = getComputedStyle(root).getPropertyValue('--glkote-mono-family')
        || getComputedStyle(root).getPropertyValue('--glkote-grid-mono-family')
        || 'monospace'
    return {
        fg,
        bg,
        weight: glk_font_weight(computed.fontWeight),
        oblique: is_oblique(computed.fontStyle),
        proportional: is_proportional(computed.fontFamily, mono_family),
        reverse: 0,
        // parseFloat strips "px" from the end of the string
        size: Math.round(parseFloat(computed.fontSize)),
    }
}

/** Properties that differ from `base`; null if identical */
function sparse_diff(entry: MeasuredStyleEntry, base: MeasuredStyleEntry): StyleEntry | null {
    const diff: StyleEntry = {}
    let any = false
    for (const key of STYLE_KEYS) {
        if (entry[key] !== base[key]) {
            ;(diff as Record<string, number>)[key] = entry[key]
            any = true
        }
    }
    return any ? diff : null
}

function sparse_style_table(styles: MeasuredStyleEntry[]): StyleTable {
    const table: StyleTable = {}
    const normal = styles[0]
    table.normal = {...normal}
    for (let i = 1; i < style_NUMSTYLES; i++) {
        const diff = sparse_diff(styles[i], normal)
        if (diff) {
            table[STYLE_NAMES[i]] = diff
        }
    }
    return table
}

/** Build the sparse theme table from hidden measurement elements */
export function build_theme_table(
    buffer_styles: HTMLElement[],
    grid_styles: HTMLElement[],
    honor_game_styles: boolean,
): Theme {
    const buffer_window = buffer_styles[0]?.closest('.BufferWindow') as HTMLElement | null
    const grid_window = grid_styles[0]?.closest('.GridWindow') as HTMLElement | null
    const buffer_bg = buffer_window
        ? css_color_to_glk(getComputedStyle(buffer_window).backgroundColor, 0xFFFFFF)
        : 0xFFFFFF
    const grid_bg = grid_window
        ? css_color_to_glk(getComputedStyle(grid_window).backgroundColor, 0xFFFFFF)
        : 0xFFFFFF

    const buffer_measured: MeasuredStyleEntry[] = []
    const grid_measured: MeasuredStyleEntry[] = []
    for (let i = 0; i < style_NUMSTYLES; i++) {
        buffer_measured.push(measure_style_entry(buffer_styles[i], buffer_bg))
        grid_measured.push(measure_style_entry(grid_styles[i], grid_bg))
    }
    return {
        honor_game_styles,
        buffer: sparse_style_table(buffer_measured),
        grid: sparse_style_table(grid_measured),
    }
}

/** Append measurement spans for each Glk style into buffer and grid test windows */
export function append_style_measurement_spans(
    buffer_inner: JQuery<HTMLElement>,
    grid_win: JQuery<HTMLElement>,
): {buffer: HTMLElement[], grid: HTMLElement[]} {
    const buffer: HTMLElement[] = []
    const grid: HTMLElement[] = []
    for (let i = 0; i < style_NUMSTYLES; i++) {
        const name = STYLE_NAMES[i]
        const bufspan = document.createElement('span')
        bufspan.className = `Style_${name}`
        bufspan.textContent = 'M'
        buffer_inner[0].appendChild(bufspan)
        buffer.push(bufspan)

        const gridspan = document.createElement('span')
        gridspan.className = `Style_${name}`
        gridspan.textContent = 'M'
        grid_win[0].appendChild(gridspan)
        grid.push(gridspan)
    }
    return {buffer, grid}
}

export function themes_equal(a: Theme, b: Theme): boolean {
    if (a.honor_game_styles !== b.honor_game_styles) {
        return false
    }
    return style_tables_equal(a.buffer, b.buffer) && style_tables_equal(a.grid, b.grid)
}

function style_tables_equal(a: StyleTable, b: StyleTable): boolean {
    const keys_a = Object.keys(a)
    const keys_b = Object.keys(b)
    if (keys_a.length !== keys_b.length) {
        return false
    }
    for (const key of keys_a) {
        if (!style_entries_equal(a[key], b[key])) {
            return false
        }
    }
    return true
}

function style_entries_equal(a: StyleEntry | undefined, b: StyleEntry | undefined): boolean {
    if (!a || !b) {
        return a === b
    }
    for (const key of STYLE_KEYS) {
        if (a[key] !== b[key]) {
            return false
        }
    }
    return true
}
