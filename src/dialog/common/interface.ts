/*

Dialog interfaces
=================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {GlkOte} from '../../glkote/common/glkote.js'

export type Dialog = ClassicSyncDialog | ClassicStreamingDialog

export type AutosaveData = {
    ram?: Array<number> | Uint8Array,
}

/** A file reference object */
export type FileRef = {
    content?: string,
    dirent?: string,
    filename: string,
    gameid?: string,
    usage?: string,
}

export interface DialogOptions {
    dom_prefix?: string,
    GlkOte: GlkOte,
}

interface ClassicDialogBase {
    /** Read an autosave */
    autosave_read(signature: string): AutosaveData | null,
    /** Save or delete an autosave */
    autosave_write(signature: string, snapshot: AutosaveData | null): void,
    /** Name of this Dialog instance */
    classname: string,
    /** Clean a filename into one that can be used */
    file_clean_fixed_name(filename: string, usage: number): string,
    /** Construct a file ref */
    file_construct_ref(filename?: string, usage?: string, gameid?: string): FileRef,
    /** Construct a file ref for a temporary file */
    file_construct_temp_ref(usage: string): FileRef,
    /** Does the file for a file ref actually exist? */
    file_ref_exists(fref: FileRef): boolean,
    /** Delete a file */
    file_remove_ref(fref: FileRef): void,
    /** Returns libraries this instance has been given */
    getlibrary(name: string): GlkOte | null;
    /** Has this Dialog instance been init()ed? */
    inited(): boolean,
    /** Open a file choosing dialog */
    open(save: boolean, usage: string | null, gameid: string | null | undefined, callback: (fref: FileRef) => void): void,
    /** Whether or not this Dialog instance uses the streaming API */
    streaming: boolean,
}

/** Synchronous Dialog library for browsers */
export interface ClassicSyncDialog extends ClassicDialogBase {
    /** Read a file */
    file_read(fref: FileRef, parse_json: boolean): string | any | null,
    /** Write a file */
    file_write(fref: FileRef, content: string | any, raw_string: boolean): boolean,
    /** Initialise the library */
    init(options: DialogOptions): void,
    streaming: false,
}

/** Streaming Dialog library for Node/Electron */
export interface ClassicStreamingDialog extends ClassicDialogBase {
    /** Open a file */
    file_fopen(fmode: number, fref: FileRef): FileStream | null,
    /** Initialise the library */
    init_async(options: DialogOptions, callback: () => void): void,
    streaming: true,
}

/** A file stream */
export interface FileStream {
    /** Close this stream */
    fclose(): void,
    /** Flush the stream */
    fflush(): void,
    /** Read bytes from a file */
    fread(buf: Buffer, len: number): number,
    /** Seek to position */
    fseek(pos: number, seekmode: number): void
    /** Get the current stream position */
    ftell(): number,
    /** Write bytes to a file */
    fwrite(buf: Buffer, len: number): number,
}