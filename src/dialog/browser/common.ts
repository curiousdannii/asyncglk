/*

Common implementations
======================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import path from 'path-browserify-esm'
import {saveAs as filesave_saveAs} from 'file-saver'

import type {DirEntry, FileData, FilesMetadata, Provider} from './interface.js'

export class NullProvider implements Provider {
    next: Provider = this
    async browse(): Promise<DirBrowser> {
        throw new Error('A NullProvider should not be browsed')
    }
    async delete(_path: string) {
        return null
    }
    async exists(_path: string) {
        return null
    }
    metadata(): Promise<FilesMetadata> {
        throw new Error('Cannot get metadata from NullProvider')
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
export class DirBrowser {
    files!: NestableDirEntry
    provider: Provider

    constructor(files: FilesMetadata, provider: Provider) {
        this.provider = provider
        this.update(files)
    }

    async add_files(files: Record<string, Uint8Array>) {
        for (const [path, data] of Object.entries(files)) {
            await this.provider.write(path, data)
        }
        this.update(await this.provider.metadata())
    }

    browse(dir_path: string): DirEntry[] {
        if (!dir_path.startsWith('/usr')) {
            throw new Error('Can only browse /usr')
        }
        return this.cd(dir_path).children!
    }

    private cd(path: string): NestableDirEntry {
        const dirs = path.substring(1).split('/')
        dirs.shift()
        let dir_entry = this.files
        for (const subdir of dirs) {
            let new_subdir = dir_entry.children!.find(child => child.name === subdir)!
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
        return dir_entry
    }

    async delete(file: DirEntry) {
        await this.provider.delete(file.full_path)
        this.update(await this.provider.metadata())
    }

    async download(file: DirEntry) {
        const data = (await this.provider.read(file.full_path))!
        filesave_saveAs(new Blob([data]), file.name)
    }

    private update(metadata: FilesMetadata) {
        this.files = {
            children: [],
            dir: true,
            full_path: '/usr',
            name: 'usr',
        }
        for (const [file_path, meta] of Object.entries(metadata)) {
            if (file_path.startsWith('/usr/')) {
                const parsed_path = path.parse(file_path)
                const dir_entry = this.cd(parsed_path.dir)
                dir_entry.children!.push({
                    dir: false,
                    full_path: file_path,
                    name: parsed_path.base,
                    meta,
                })
            }
        }
    }
}