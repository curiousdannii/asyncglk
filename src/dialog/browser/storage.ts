/*

Web storage provider
====================

Copyright (c) 2026 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {decode as base32768_decode, encode as base32768_encode} from 'base32768'
import {gunzipSync, gzipSync} from 'fflate'

import type {DialogDirectories} from '../common/interface.js'
import {NullProvider, show_alert} from './common.js'
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
    private id_prefix: string
    private _metadata: FilesMetadata = {}
    next = new NullProvider()
    private path_prefix: string
    private store: Storage
    /** Whether or not we are doing multiple operations in one transaction */
    private transaction: boolean = false

    constructor(path_prefix: string, store: Storage, dirs: DialogDirectories, browseable?: boolean, id_prefix?: string) {
        this.browseable = browseable ?? false
        this.dirs = dirs
        this.id_prefix = id_prefix ? id_prefix + '-' : ''
        this.path_prefix = path_prefix
        this.store = store

        if (store === localStorage) {
            this.migrate()
        }
    }

    async delete(path: string) {
        if (path.startsWith(this.path_prefix)) {
            this.storage_delete(path)
            await this.update_metadata(path, MetadataUpdateOperation.DELETE)
        }
        else {
            return this.next.delete(path)
        }
    }

    async exists(path: string): Promise<boolean | null> {
        if (path.startsWith(this.path_prefix)) {
            return this.storage_read(path) !== null
        }
        else {
            return this.next.exists(path)
        }
    }

    async metadata(): Promise<FilesMetadata> {
        this._metadata = JSON.parse(this.storage_read(METADATA_KEY) || '{}') as FilesMetadata
        // Add a fake .dir file to the working folder
        this._metadata[this.dirs.working + '/.dir'] = {atime: 0, mtime: 0}
        return this._metadata
    }

    // Migrate versions of our file system
    // See docs/dialog-localstorage.md
    private migrate() {
        const now = Date.now()
        let version = parseInt(this.storage_read(STORAGE_VERSION_KEY) || '0', 10)
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
                        this.storage_write(path, data)
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
            this.storage_write(METADATA_KEY, JSON.stringify(metadata))
            this.storage_write(STORAGE_VERSION_KEY, '2')
            version = 2
        }
        if (version === 2) {
            console.log('Dialog: updating localStorage to version 3')
            // Compress all files
            const metadata = JSON.parse(this.storage_read(METADATA_KEY) || '{}') as FilesMetadata
            for (const path of Object.keys(metadata)) {
                const data = base32768_decode(this.storage_read(path)!)
                this.storage_write(path, base32768_encode(gzipSync(data)))
            }
            this.storage_write(STORAGE_VERSION_KEY, '3')
        }
        if (version > 3) {
            throw new Error('dialog_storage_version is newer than this library supports')
        }
    }

    async read(path: string): Promise<Uint8Array<ArrayBuffer> | null> {
        if (path.startsWith(this.path_prefix)) {
            const res = this.storage_read(path)
            if (res !== null) {
                await this.update_metadata(path, MetadataUpdateOperation.READ)
                return gunzipSync(base32768_decode(res))
            }
            return null
        }
        else {
            return this.next.read(path)
        }
    }

    async rename(dir: boolean, old_path: string, new_path: string): Promise<void> {
        await this.transaction_start()
        if (dir) {
            for (const path of Object.keys(this._metadata)) {
                if (path.startsWith(old_path)) {
                    const new_file_path = path.replace(old_path, new_path)
                    await this.rename_file(path, new_file_path)
                }
            }
        }
        else {
            await this.rename_file(old_path, new_path)
        }
        this.transaction_end()
    }

    private async rename_file(old_path: string, new_path: string) {
        const data = await this.read(old_path)
        await this.write({new_path: data!})
        await this.update_metadata(new_path, MetadataUpdateOperation.RENAME, old_path)
        await this.delete(old_path)
    }

    /** Delete from this storage, accounting for an optional ID prefix */
    private storage_delete(key: string) {
        this.store.removeItem(this.id_prefix + key)
    }

    /** Read this storage, accounting for an optional ID prefix */
    private storage_read(key: string) {
        return this.store.getItem(this.id_prefix + key)
    }

    /** Write to this storage, accounting for an optional ID prefix */
    private storage_write(key: string, value: string) {
        this.store.setItem(this.id_prefix + key, value)
    }

    private async transaction_start() {
        const old_transaction = this.transaction
        this.transaction = true
        if (!old_transaction) {
            await this.metadata()
        }
        return old_transaction
    }

    private transaction_end() {
        this.transaction = false
        // Remove the fake .dir file from the working folder
        delete this._metadata![this.dirs.working + '/.dir']
        this.storage_write(METADATA_KEY, JSON.stringify(this._metadata))
    }

    private async update_metadata(path: string, op: MetadataUpdateOperation, old_path?: string) {
        const now = Date.now()
        if (!this.transaction) {
            await this.metadata()
        }
        switch (op) {
            case MetadataUpdateOperation.DELETE:
                delete this._metadata![path]
                break
            case MetadataUpdateOperation.READ:
                this._metadata![path].atime = now
                break
            case MetadataUpdateOperation.RENAME:
                this._metadata![path] = this._metadata![old_path!]
                delete this._metadata![old_path!]
                break
            case MetadataUpdateOperation.WRITE:
                if (!this._metadata![path]) {
                    this._metadata![path] = {
                        atime: now,
                        mtime: now,
                    }
                }
                this._metadata![path].mtime = now
        }
        if (!this.transaction) {
            // Write the metadata via transaction_end
            this.transaction_end()
        }
    }

    // Emglken accidentally sends us Int8Arrays, so we must account for that
    async write(files: Record<string, Int8Array | Uint8Array>) {
        const was_already_in_transaction = await this.transaction_start()
        let wrote_files = false, next_files = false
        for (let [path, data] of Object.entries(files)) {
            if (path.startsWith(this.path_prefix)) {
                wrote_files = true
                try {
                    // Ensure we have a Uint8Array
                    data = new Uint8Array(data.buffer, data.byteOffset, data.length)
                    this.storage_write(path, base32768_encode(gzipSync(data)))
                    this.update_metadata(path, MetadataUpdateOperation.WRITE)
                }
                catch {
                    // TODO: remove autosaves first
                    show_alert('localStorage full', `The file ${path.replace(/\//g, '/\u200b')} could not be written as your browser's localStorage is full! Please delete some files, and then try again.`)
                }
                delete files[path]
            }
            else {
                next_files = true
            }
        }
        if (!was_already_in_transaction) {
            this.transaction = false
            if (wrote_files) {
                this.transaction_end()
            }
        }
        if (next_files) {
            this.next.write(files)
        }
    }
}

const DIALOG_V1_TYPES_TO_EXTS: Record<string, string> = {
    data: 'glkdata',
    save: 'glksave',
    transcript: 'txt',
}