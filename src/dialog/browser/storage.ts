/*

Web storage provider
====================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {decode as base32768_decode, encode as base32768_encode} from 'base32768'

import {CachingDirBrowser, NullProvider} from './common.js'
import type {DirBrowser, FileData, Provider} from './interface.js'

type WebStorageFileMetadata = Pick<FileData, 'atime' | 'mtime'>

const METADATA_KEY = 'dialog_metadata'

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

        // TODO: upgrade storage
    }

    async browse(): Promise<DirBrowser> {
        if (this.browseable) {
            const metadata = this.get_metadata()
            return new CachingDirBrowser(metadata, this)
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

    private get_metadata(): Record<string, WebStorageFileMetadata> {
        return JSON.parse(this.store.getItem(METADATA_KEY) || '{}')
    }

    private update_metadata(path: string, op: MetadataUpdateOperation) {
        const now = Date.now()
        const metadata = this.get_metadata()
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