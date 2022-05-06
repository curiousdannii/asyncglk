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

interface EventBase {
    /** Event code */
    type: string,
    /** Generation number */
    gen: number,
    /** Partial line input values */
    partial?: Record<number, string>,
}

export interface ArrangeEvent extends EventBase {
    /** Event code */
    type: 'arrange',
    metrics: Metrics,
}

/** Character (single key) event */
export interface CharEvent extends EventBase {
    /** Event code */
    type: 'char',
    /** Character that was received */
    value: SpecialKeyCode | string,
    /** Window ID */
    window: number,
}

export type SpecialKeyCode = 'delete' | 'down' | 'end' | 'escape' | 'func1' | 'func2' | 'func3'
    | 'func4' | 'func5' | 'func6' | 'func7' | 'func8' | 'func9' | 'func10' | 'func11' | 'func12'
    | 'home' | 'left' | 'pagedown' | 'pageup' | 'return' | 'right' | 'tab' | 'up'

export interface DebugEvent extends EventBase {
    /** Event code */
    type: 'debug',
    value: string,
}

export interface ExternalEvent extends EventBase {
    /** Event code */
    type: 'external',
    value: any,
}

export interface HyperlinkEvent extends EventBase {
    /** Event code */
    type: 'hyperlink',
    value: number,
    /** Window ID */
    window: number,
}

/** Initilisation event */
export interface InitEvent extends EventBase {
    /** Event code */
    type: 'init',
    /** Generation number */
    gen: 0,
    metrics: Metrics,
    /** Capabilities list */
    support: string[],
}

/** Line (text) event */
export interface LineEvent extends EventBase {
    /** Event code */
    type: 'line',
    /** Terminator key */
    terminator?: TerminatorCode,
    /** Line input */
    value: string,
    /** Window ID */
    window: number,
}

export interface MouseEvent extends EventBase {
    /** Event code */
    type: 'mouse',
    /** Window ID */
    window: number,
    /** Mouse click X */
    x: number,
    /** Mouse click Y */
    y: number,
}

export interface RedrawEvent extends EventBase {
    /** Event code */
    type: 'redraw',
    /** Window ID */
    window?: number,
}

export interface RefreshEvent extends EventBase {
    /** Event code */
    type: 'refresh',
}

export interface SpecialEvent extends EventBase {
    /** Event code */
    type: 'specialresponse',
    /** Response type */
    response: 'fileref_prompt',
    /** Event value (file reference from Dialog) */
    value: FileRef,
}

/** File reference from Dialog */
export type FileRef = any

export interface TimerEvent extends EventBase {
    /** Event code */
    type: 'timer',
}

/** Screen and font metrics - all potential options */
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

/** Normalised screen and font metrics */
export interface NormalisedMetrics {
    /** Buffer character height */
    buffercharheight: number,
    /** Buffer character width */
    buffercharwidth: number,
    /** Buffer window margin X */
    buffermarginx: number,
    /** Buffer window margin Y */
    buffermarginy: number,
    /** Graphics window margin X */
    graphicsmarginx: number,
    /** Graphics window margin Y */
    graphicsmarginy: number,
    /** Grid character height */
    gridcharheight: number,
    /** Grid character width */
    gridcharwidth: number,
    /** Grid window margin X */
    gridmarginx: number,
    /** Grid window margin Y */
    gridmarginy: number,
    height: number,
    /** Inspacing X */
    inspacingx: number,
    /** Inspacing Y */
    inspacingy: number,
    /** Outspacing X */
    outspacingx: number,
    /** Outspacing Y */
    outspacingy: number,
    width: number,
}

/** GlkApi/RemGlk->GlkOte content updates */
export type Update = ErrorUpdate | ExitUpdate | PassUpdate | RetryUpdate | StateUpdate

export interface ErrorUpdate {
    /** Update type */
    type: 'error',
    /** Error message */
    message: string,
}

export interface ExitUpdate {
    /** Update type */
    type: 'exit',
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
    /** Library specific autorestore data */
    autorestore?: any,
    /** Content data */
    content?: ContentUpdate[],
    /** Debug output */
    debugoutput?: string[],
    disable?: boolean,
    /** Generation number */
    gen: number,
    /** Windows with active input */
    input?: InputUpdate[],
    /** Specify a colour to set the page to (outside of the gameport!) */
    page_bg?: string,
    /** Special input */
    specialinput?: SpecialInput,
    timer: number | null | undefined,
    /** Updates to window (new windows, or changes to their arrangements) */
    windows?: WindowUpdate[],
}

// Update structures

/** Content update */
export type ContentUpdate = BufferWindowContentUpdate | GraphicsWindowContentUpdate | GridWindowContentUpdate

interface TextualWindowUpdate {
    /** Background colour after clearing */
    bg?: string,
    /** Background colour after clearing */
    fg?: string,
    /** Window ID */
    id: number,
    /** Clear the window */
    clear?: boolean,
}

/** Buffer window content update */
export interface BufferWindowContentUpdate extends TextualWindowUpdate {
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
export interface GridWindowContentUpdate extends TextualWindowUpdate {
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
    alttext?: string,
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
    /** Background colour */
    bg?: string,
    /** Foreground colour */
    fg?: string,
    /** Hyperlink value */
    hyperlink?: number,
    /** Reverse style */
    reverse?: boolean,
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
    terminators?: TerminatorCode[],
    /** Textual input type */
    type: 'char' | 'line' | undefined,
    /** Grid window coordinate X */
    xpos?: number,
    /** Grid window coordinate Y */
    ypos?: number,
}

export type TerminatorCode = 'escape' | 'func1' | 'func2' | 'func3' | 'func4' | 'func5' | 'func6'
    | 'func7' | 'func8' | 'func9' | 'func10' | 'func11' | 'func12'

export interface SpecialInput {
    /** Special input type */
    type: 'fileref_prompt',
    /** File mode */
    filemode: 'read' | 'readwrite' | 'write' | 'writeappend',
    /** File type */
    filetype: 'command' | 'data' | 'save' | 'transcript',
    /** Game ID */
    gameid?: string,
}

/** Updates to window (new windows, or changes to their arrangements) */
export interface WindowUpdate {
    /** Background colour after autorestoring */
    bg?: string,
    /** Background colour after autorestoring */
    fg?: string,
    /** Graphics height (pixels) */
    graphheight?: number,
    /** Graphics width (pixels) */
    graphwidth?: number,
    /** Grid height (chars) */
    gridheight?: number,
    /** Grid width (chars) */
    gridwidth?: number,
    height: number,
    /** Window ID */
    id: number,
    /** Left position */
    left: number,
    /** Rock value */
    rock: number,
    /** CSS styles */
    stylehints?: StyleHints,
    /** Top position */
    top: number,
    /** Type */
    type: 'buffer' | 'graphics' | 'grid',
    width: number,
}

export type StyleHints = Record<number, Record<string, any>>