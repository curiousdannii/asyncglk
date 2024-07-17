/*

Common implementations
======================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import path from 'path-browserify-esm'

import type {Provider, DirBrowser, FileData, DirEntry} from './interface.js'

export class NullProvider implements Provider {
    next: Provider = this
    async browse(): Promise<DirBrowser> {
        return new CachingDirBrowser({}, this)
    }
    async delete(_path: string) {
        return null
    }
    async exists(_path: string) {
        return null
    }
    async read(_path: string) {
        return null
    }
    async write(_path: string, _data: Uint8Array) {
        return null
    }
}

interface NestableDirEntry extends DirEntry {
    children?: NestableDirEntry[]
    dir: boolean
    name: string
    meta?: FileData
}

/** A caching directory browser that receives the list of files once and remembers for as long as the dialog is open */
export class CachingDirBrowser implements DirBrowser {
    files: NestableDirEntry = {
        children: [],
        dir: true,
        full_path: '/usr',
        name: 'usr',
    }
    provider: Provider

    constructor(files: Record<string, FileData>, provider: Provider) {
        this.provider = provider
        for (const [file_path, meta] of Object.entries(files)) {
            if (file_path.startsWith('/usr/')) {
                const parsed_path = path.parse(file_path)
                const dirs = parsed_path.dir.substring(1).split('/')
                dirs.shift()
                // Find the directory for this file, creating it if necessary
                let dir_entry = this.files
                for (const subdir of dirs) {
                    let new_subdir = dir_entry.children!.find(child => child.name === subdir)
                    if (!new_subdir) {
                        new_subdir = {
                            children: [],
                            dir: true,
                            full_path: dir_entry.full_path + '/' + subdir,
                            name: subdir,
                        }
                        dir_entry.children!.push(new_subdir)
                    }
                    dir_entry = new_subdir
                }
                dir_entry.children!.push({
                    dir: false,
                    full_path: file_path,
                    name: parsed_path.base,
                    meta,
                })
            }
        }
    }

    async browse(dir_path: string): Promise<DirEntry[]> {
        if (!dir_path.startsWith('/usr')) {
            throw new Error('Can only browse /usr')
        }
        const parsed_path = path.parse(dir_path)
        const dirs = parsed_path.dir.substring(1).split('/')
        dirs.shift()
        let dir_entry = this.files
        for (const subdir of dirs) {
            dir_entry = dir_entry.children!.find(child => child.name === subdir)!
            if (!dir_entry) {
                throw new Error('Invalid directory state')
            }
        }
        return dir_entry.children!
    }
}