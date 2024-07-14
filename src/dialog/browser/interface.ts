/*

Dialog interfaces for the browser
=================================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

/** A provider handles part of the filesystem, and can cascade down to another provider for files it doesn't handle */
// Inspired by Koa
export interface Provider {
    /** A link to the next provider */
    next: Provider
    /** Delete a file */
    delete(path: string): Promise<void | null>
    /** Check if a file exists */
    exists(path: string): Promise<boolean | null>
    /** Directory listing */
    list(path: string): Promise<DirEntry[] | null>
    /** Read a file */
    read(path: string): Promise<Uint8Array | null>
    /** Write a file */
    write(path: string, data: Uint8Array): Promise<void | null>
}

export interface DirEntry {
    dir: boolean
    name: string
}

export interface FileData {
    accessed: number
    created: number
    etag?: string
    data: Uint8Array
    'last-modified'?: string
    modified: number
    path_prefix: string
    story_id?: string
}

export class NullProvider implements Provider {
    next: Provider = this
    async delete(_path: string) {
        return null
    }
    async exists(_path: string) {
        return null
    }
    async list(_path: string) {
        return null
    }
    async read(_path: string) {
        return null
    }
    async write(_path: string, _data: Uint8Array) {
        return null
    }
}