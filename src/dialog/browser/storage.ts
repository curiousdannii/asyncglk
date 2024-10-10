/*

Web storage provider
====================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {decode as base32768_decode, encode as base32768_encode} from 'base32768'

import type {DialogDirectories} from '../common/interface.js'
import {NullProvider} from './common.js'
import type {BrowseableProvider, FilesMetadata} from './interface.js'

//type WebStorageFileMetadata = Pick<FileData, 'atime' | 'mtime'>

const METADATA_KEY = 'dialog_metadata'
const STORAGE_VERSION_KEY = 'dialog_storage_version'

const enum MetadataUpdateOperation {
    DELETE = 1,
    READ = 2,
    RENAME = 3,
    WRITE = 4,
}

export class WebStorageProvider implements BrowseableProvider {
    browseable: boolean
    private dirs: DialogDirectories
    next = new NullProvider()
    private prefix: string
    private store: Storage

    constructor(prefix: string, store: Storage, dirs: DialogDirectories, browseable?: boolean) {
        this.browseable = browseable ?? false
        this.dirs = dirs
        this.prefix = prefix
        this.store = store

        if (store === localStorage) {
            migrate_localStorage()
        }
    }

    async delete(path: string): Promise<void | null> {
        if (path.startsWith(this.prefix)) {
            this.store.removeItem(path)
            await this.update_metadata(path, MetadataUpdateOperation.DELETE)
        }
        else {
            return this.next.delete(path)
        }
    }

    async exists(path: string): Promise<boolean | null> {
        if (path.startsWith(this.prefix)) {
            return this.store.getItem(path) !== null
        }
        else {
            return this.next.exists(path)
        }
    }

    async metadata(): Promise<FilesMetadata> {
        const metadata: FilesMetadata = JSON.parse(this.store.getItem(METADATA_KEY) || '{}')
        // Add a fake .dir file to the working folder
        metadata[this.dirs.working + '/.dir'] = {atime: 0, mtime: 0}
        return metadata
    }

    async read(path: string): Promise<Uint8Array | null> {
        if (path.startsWith(this.prefix)) {
            const res = this.store.getItem(path)
            if (res !== null) {
                await this.update_metadata(path, MetadataUpdateOperation.READ)
                return base32768_decode(res)
            }
            return null
        }
        else {
            return this.next.read(path)
        }
    }

    async rename(dir: boolean, old_path: string, new_path: string): Promise<void> {
        if (dir) {
            const metadata = await this.metadata()
            for (const path of Object.keys(metadata)) {
                if (path.startsWith(old_path)) {
                    const new_file_path = path.replace(old_path, new_path)
                    await this.rename(false, path, new_file_path)
                }
            }
        }
        else {
            const data = await this.read(old_path)
            await this.write(new_path, data!)
            await this.update_metadata(new_path, MetadataUpdateOperation.RENAME, old_path)
            await this.delete(old_path)
        }
    }

    async write(path: string, data: Uint8Array): Promise<void | null> {
        if (path.startsWith(this.prefix)) {
            // TODO: detect out of space
            this.store.setItem(path, base32768_encode(data))
            await this.update_metadata(path, MetadataUpdateOperation.WRITE)
            return null
        }
        else {
            return this.next.write(path, data)
        }
    }

    private async update_metadata(path: string, op: MetadataUpdateOperation, old_path?: string) {
        const now = Date.now()
        const metadata: FilesMetadata = await this.metadata()
        switch (op) {
            case MetadataUpdateOperation.DELETE:
                delete metadata[path]
                break
            case MetadataUpdateOperation.READ:
                metadata[path].atime = now
                break
            case MetadataUpdateOperation.RENAME:
                metadata[path] = metadata[old_path!]
                delete metadata[old_path!]
                break
            case MetadataUpdateOperation.WRITE:
                if (!metadata[path]) {
                    metadata[path] = {
                        atime: now,
                        mtime: now,
                    }
                }
                metadata[path].mtime = now
        }
        // Remove the fake .dir file from the working folder
        delete metadata[this.dirs.working + '/.dir']
        this.store.setItem(METADATA_KEY, JSON.stringify(metadata))
    }
}

const DIALOG_V1_TYPES_TO_EXTS: Record<string, string> = {
    data: 'glkdata',
    save: 'glksave',
    transcript: 'txt',
}
export function migrate_localStorage() {
    const now = Date.now()
    const version = parseInt(localStorage.getItem(STORAGE_VERSION_KEY) || '', 10)
    if (version < 2) {
        console.log('Dialog: updating localStorage to version 2')
        const metadata: FilesMetadata = {}
        for (let [key, data] of Object.entries<string>(localStorage)) {
            if (key.startsWith('autosave:')) {
                // We're not keeping any old autosaves
                localStorage.removeItem(key)
            }
            if (key.startsWith('content:')) {
                const key_data = /^content:(\w+):(\w*):(.+)$/.exec(key)
                if (key_data) {
                    const path = `/usr/${key_data[3]}.${DIALOG_V1_TYPES_TO_EXTS[key_data[1]] || key_data[1]}`
                    if (data !== '' && version < 1) {
                        data = base32768_encode(/\[[,\d]*\]/.test(data) ? JSON.parse(data) : Uint8Array.from(data, ch => ch.charCodeAt(0)))
                    }
                    localStorage.setItem(path, data)
                    const dirent_key = 'dirent' + key.substring(7)
                    const dirent = localStorage.getItem(dirent_key) || ''
                    const dirent_data = /^created:\d+,modified:(\d+)$/.exec(dirent)
                    metadata[path] = {
                        atime: parseInt(dirent_data?.[1] || '', 10) || now,
                        mtime: parseInt(dirent_data?.[1] || '', 10) || now,
                    }
                    localStorage.removeItem(dirent_key)
                }
                localStorage.removeItem(key)
            }
        }
        localStorage.setItem(METADATA_KEY, JSON.stringify(metadata))
        localStorage.setItem(STORAGE_VERSION_KEY, '2')
    }
    if (version > 2) {
        throw new Error('dialog_storage_version is newer than this library supports')
    }
}