/*

The GlkOte protocol
===================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

/** The GlkOte protocol has two parts:
 * 1. GlkOte sends events to GlkApi/RemGlk
 * 2. GlkApi/RemGlk send content updates to GlkOte
*/

/** GlkOte->GlkApi/RemGlk input events */
export type Event = ArrangeEvent | CharEvent | DebugEvent | ExternalEvent | HyperlinkEvent |
    InitEvent | LineEvent | MouseEvent | RedrawEvent | RefreshEvent | SpecialEvent | TimerEvent

export interface ArrangeEvent {
    /** Event code */
    type: 'arrange',
    /** Generation number */
    gen: number,
    metrics: Metrics,
}

/** Character (single key) event */
export interface CharEvent {
    /** Event code */
    type: 'char',
    /** Generation number */
    gen: number,
    /** Character that was received */
    value: string,
    /** Window ID */
    window: number,
}

export interface DebugEvent {
    /** Event code */
    type: 'debug',
    /** Generation number */
    gen: number,
    value: string,
}

export interface ExternalEvent {
    /** Event code */
    type: 'external',
    /** Generation number */
    gen: number,
    value: any,
}

export interface HyperlinkEvent {
    /** Event code */
    type: 'hyperlink',
    /** Generation number */
    gen: number,
    value: number,
    /** Window ID */
    window: number,
}

/** Initilisation event */
export interface InitEvent {
    /** Event code */
    type: 'init',
    /** Generation number */
    gen: 0,
    metrics: Metrics,
    /** Capabilities list */
    support: string[],
}

/** Line (text) event */
export interface LineEvent {
    /** Event code */
    type: 'line',
    /** Generation number */
    gen: number,
    /** Terminator key */
    terminator?: string,
    /** Line input */
    value: string,
    /** Window ID */
    window: number,
}

export interface MouseEvent {
    /** Event code */
    type: 'mouse',
    /** Generation number */
    gen: number,
    /** Window ID */
    window: number,
    /** Mouse click X */
    x: number,
    /** Mouse click Y */
    y: number,
}

export interface RedrawEvent {
    /** Event code */
    type: 'redraw',
    /** Generation number */
    gen: number,
    /** Window ID */
    window: number,
}

export interface RefreshEvent {
    /** Event code */
    type: 'refresh',
    /** Generation number */
    gen: number,
}

export interface SpecialEvent {
    /** Event code */
    type: 'specialresponse',
    /** Generation number */
    gen: number,
    /** Response type */
    response: 'fileref_prompt',
    /** Event value (file reference from Dialog) */
    value: FileRef,
}

/** File reference from Dialog */
export type FileRef = any

export interface TimerEvent {
    /** Event code */
    type: 'timer',
    /** Generation number */
    gen: number,
}

/** Screen and font metrics */
export interface Metrics {
    /** Buffer character height */
    buffercharheight?: number,
    /** Buffer character width */
    buffercharwidth?: number,
    /** Buffer window margin */
    buffermargin?: number,
    /** Buffer window margin X */
    buffermarginx?: number,
    /** Buffer window margin Y */
    buffermarginy?: number,
    /** Character height (for both buffer and grid windows) */
    charheight?: number,
    /** Character width (for both buffer and grid windows) */
    charwidth?: number,
    /** Graphics window margin */
    graphicsmargin?: number,
    /** Graphics window margin X */
    graphicsmarginx?: number,
    /** Graphics window margin Y */
    graphicsmarginy?: number,
    /** Grid character height */
    gridcharheight?: number,
    /** Grid character width */
    gridcharwidth?: number,
    /** Grid window margin */
    gridmargin?: number,
    /** Grid window margin X */
    gridmarginx?: number,
    /** Grid window margin Y */
    gridmarginy?: number,
    height: number,
    /** Inspacing */
    inspacing?: number,
    /** Inspacing X */
    inspacingx?: number,
    /** Inspacing Y */
    inspacingy?: number,
    /** Margin for all window types */
    margin?: number,
    /** Margin X for all window types */
    marginx?: number,
    /** Margin Y for all window types */
    marginy?: number,
    /** Outspacing */
    outspacing?: number,
    /** Outspacing X */
    outspacingx?: number,
    /** Outspacing Y */
    outspacingy?: number,
    /** Spacing */
    spacing?: number,
    /** Spacing X */
    spacingx?: number,
    /** Spacing Y */
    spacingy?: number,
    width: number,
}

/** GlkApi/RemGlk->GlkOte content updates */
export type Update = ErrorUpdate | PassUpdate | RetryUpdate | StateUpdate

export interface ErrorUpdate {
    /** Update type */
    type: 'error',
    /** Error message */
    message: string,
}

export interface PassUpdate {
    /** Update type */
    type: 'pass',
}

export interface RetryUpdate {
    /** Update type */
    type: 'retry',
}

export interface StateUpdate {
    /** Update type */
    type: 'update',
    /** Content data */
    content?: ContentUpdate[],
    /** Debug output */
    debugoutput?: string[],
    disable?: boolean,
    /** Generation number */
    gen: number,
    /** Windows with active input */
    input?: InputUpdate[],
    /** Special input */
    specialinput?: {
        /** Special input type */
        type: 'fileref_prompt',
        /** File mode */
        filemode: 'read' | 'readwrite' | 'write' | 'writeappend',
        /** File type */
        filetype: 'command' | 'data' | 'save' | 'transcript',
        /** Game ID */
        gameid?: string,
    },
    timer: number | null | undefined,
    /** Updates to window (new windows, or changes to their arrangements) */
    windows?: WindowUpdate[],
}

// Update structures

/** Content update */
export type ContentUpdate = BufferWindowContentUpdate | GraphicsWindowContentUpdate | GridWindowContentUpdate

/** Buffer window content update */
export interface BufferWindowContentUpdate {
    /** Window ID */
    id: number,
    /** Clear the window */
    clear?: boolean,
    /** text data */
    text: {
        /** Append to last input */
        append?: boolean,
        /** Line data */
        content: LineData[],
        /** Paragraph breaks after floating images */
        flowbreak?: boolean,
    }[],
}

/** Graphics window content update */
export interface GraphicsWindowContentUpdate {
    /** Window ID */
    id: number,
    /** Operations */
    draw: GraphicsWindowOperation[],
}

/** Graphics window operation */
export type GraphicsWindowOperation = FillOperation | ImageOperation | SetcolorOperation

/** Fill operation */
export interface FillOperation {
    /** Operation code */
    special: 'fill',
    /** CSS color */
    color?: string,
    height?: number,
    width?: number,
    /** X coordinate */
    x?: number,
    /** Y coordinate */
    y?: number,
}

/** Image operation */
export interface ImageOperation {
    /** Operation code */
    special: 'image',
    height: number,
    /** Image number (from Blorb or similar) */
    image?: number,
    width: number,
    /** Image URL */
    url?: string,
    /** X position */
    x: number,
    /** Y position */
    y: number,
}

/** Setcolor operation */
export interface SetcolorOperation {
    /** Operation code */
    special: 'setcolor',
    /** CSS color */
    color: string,
}

/** Grid window content update */
export interface GridWindowContentUpdate {
    /** Window ID */
    id: number,
    /** Lines data */
    lines: {
        /** Line data */
        content: LineData[],
        /** Line number to update */
        line: number,
    }[],
}

/** Line data */
export type LineData = string | BufferWindowImage | TextRun

/** Buffer window image */
export interface BufferWindowImage {
    /** Run code */
    special: 'image',
    /** Image alignment */
    alignment: 'inlinecenter' | 'inlinedown' | 'inlineup' | 'marginleft' | 'marginright' | undefined,
    /** Image alt text */
    altext?: string,
    height: number,
    /** Hyperlink value */
    hyperlink?: number,
    /** Image number */
    image?: number,
    width: number,
    /** Image URL */
    url?: string,
}

/** Text run */
export interface TextRun {
    /** Hyperlink value */
    hyperlink?: number,
    /** Run style */
    style: string,
    /** Run content */
    text: string,
}

/** Windows with active input */
export interface InputUpdate {
    /** Generation number, for when the textual input was first requested */
    gen?: number,
    /** Hyperlink requested */
    hyperlink?: boolean,
    /** Window ID */
    id: number,
    /** Preloaded line input */
    initial?: string,
    /** Maximum line input length */
    maxlen?: number,
    /** Mouse input requested */
    mouse?: boolean,
    /** Line input terminators */
    terminators?: string[],
    /** Textual input type */
    type: 'char' | 'line' | undefined,
}

/** Updates to window (new windows, or changes to their arrangements) */
export interface WindowUpdate {
    height: number,
    /** Graphics height (pixels) */
    graphicsheight?: number,
    /** Graphics width (pixels) */
    graphicswidth?: number,
    /** Grid height (chars) */
    gridheight?: number,
    /** Grid width (chars) */
    gridwidth?: number,
    /** Window ID */
    id: number,
    /** Left position */
    left: number,
    /** Rock value */
    rock: number,
    /** Top position */
    top: number,
    /** Type */
    type: 'buffer' | 'graphics' | 'grid',
    width: number,
}