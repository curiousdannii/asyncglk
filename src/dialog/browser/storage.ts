/*

Web storage provider
====================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {decode as base32768_decode, encode as base32768_encode} from 'base32768'

import {DirBrowser, NullProvider} from './common.js'
import type {FilesMetadata, Provider} from './interface.js'

//type WebStorageFileMetadata = Pick<FileData, 'atime' | 'mtime'>

const METADATA_KEY = 'dialog_metadata'
const STORAGE_VERSION_KEY = 'dialog_storage_version'

const enum MetadataUpdateOperation {
    DELETE = 1,
    READ = 2,
    WRITE = 3,
}

export class WebStorageProvider implements Provider {
    private browseable: boolean
    next = new NullProvider()
    private prefix: string
    private store: Storage

    constructor(prefix: string, store: Storage, browseable?: boolean) {
        this.browseable = browseable ?? false
        this.prefix = prefix
        this.store = store

        if (store === localStorage) {
            migrate_localStorage()
        }
    }

    async browse(): Promise<DirBrowser> {
        if (this.browseable) {
            const metadata = this.metadata()
            return new DirBrowser(metadata, this)
        }
        else {
            return this.next.browse()
        }
    }

    async delete(path: string): Promise<void | null> {
        if (path.startsWith(this.prefix)) {
            this.store.removeItem(path)
            this.update_metadata(path, MetadataUpdateOperation.DELETE)
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

    metadata() {
        return JSON.parse(this.store.getItem(METADATA_KEY) || '{}')
    }

    async read(path: string): Promise<Uint8Array | null> {
        if (path.startsWith(this.prefix)) {
            const res = this.store.getItem(path)
            if (res !== null) {
                this.update_metadata(path, MetadataUpdateOperation.READ)
                return base32768_decode(res)
            }
            return null
        }
        else {
            return this.next.read(path)
        }
    }

    async write(path: string, data: Uint8Array): Promise<void | null> {
        if (path.startsWith(this.prefix)) {
            // TODO: detect out of space
            this.store.setItem(path, base32768_encode(data))
            this.update_metadata(path, MetadataUpdateOperation.WRITE)
            return null
        }
        else {
            return this.next.write(path, data)
        }
    }

    private update_metadata(path: string, op: MetadataUpdateOperation) {
        const now = Date.now()
        const metadata: FilesMetadata = this.metadata()
        switch (op) {
            case MetadataUpdateOperation.DELETE:
                delete metadata[path]
                break
            case MetadataUpdateOperation.READ:
                metadata[path].atime = now
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