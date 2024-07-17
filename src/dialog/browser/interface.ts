/*

Dialog interfaces for the browser
=================================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

/** A provider handles part of the filesystem, and can cascade down to another provider for files it doesn't handle */
export interface Provider {
    /** A link to the next provider */
    next: Provider
    /** Get a `DirBrowser` instance for browsing */
    browse(): Promise<DirBrowser>
    /** Delete a file */
    delete(path: string): Promise<void | null>
    /** Check if a file exists */
    exists(path: string): Promise<boolean | null>
    /** Read a file */
    read(path: string): Promise<Uint8Array | null>
    /** Write a file */
    write(path: string, data: Uint8Array): Promise<void | null>
}

/** Browse a directory; may cache all the files or request each time you change directory */
export interface DirBrowser {
    browse(path: string, filter?: string[]): Promise<DirEntry[]>
}

export interface DirEntry {
    dir: boolean
    full_path: string
    name: string
    meta?: FileData
}

export interface FileData {
    atime: number
    etag?: string
    'last-modified'?: string
    mtime: number
    path_prefix?: string
    story_id?: string
}