/*

Browser Dialog
==============

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import path from 'path-browserify-esm'

import type {AsyncDialog, DialogDirectories, DialogOptions} from '../common/interface.js'
import {type DownloadOptions, DownloadProvider, type ProgressCallback} from './download.js'
import type {Provider} from './interface.js'
import {WebStorageProvider} from './storage.js'
import DialogUI from './ui/Dialog.svelte'

export class BrowserDialog implements AsyncDialog {
    'async' = true as const
    private dialog: DialogUI | undefined
    private dirs: DialogDirectories = {
        storyfile: '',
        system_cwd: '/',
        temp: '/tmp',
        working: '/usr',
    }
    private downloader: DownloadProvider | undefined
    private providers: Provider[] = []

    async init(options: DialogOptions & DownloadOptions): Promise<void> {
        this.downloader = new DownloadProvider(options)
        // TODO: ensure that localStorage is wrapped in a try/catch in case it's disabled
        this.providers = [
            this.downloader,
            new WebStorageProvider('/tmp', sessionStorage),
            new WebStorageProvider('/', localStorage, true),
        ]

        for (const [i, provider] of this.providers.entries()) {
            const next = this.providers[i + 1]
            if (next) {
                provider.next = next
            }
        }

        // Set up the Svelte UI
        const dir_browser = await this.providers[0].browse()
        this.dialog = new DialogUI({
            target: document.body,
            props: {
                dir_browser,
            },
        })
    }

    async download(url: string, progress_callback?: ProgressCallback): Promise<string> {
        const file_path = await this.downloader!.download(url, progress_callback)
        const parsed_path = path.parse(file_path)
        this.dirs.storyfile = parsed_path.dir
        this.dirs.working = '/usr/' + parsed_path.name.toLowerCase().trim()
        await this.dialog!.update_direntry(this.dirs.working)
        return file_path
    }

    get_dirs(): DialogDirectories {
        return this.dirs
    }

    async prompt(extension: string, save: boolean): Promise<string | null> {
        return this.dialog!.prompt({
            dir_browser: await this.providers[0].browse(),
            filter: extension_to_filter(extension),
            save,
            submit_label: save ? 'Save' : 'Restore',
            title: 'Filename',
        })
    }

    set_storyfile_dir(path: string): Partial<DialogDirectories> {
        throw new Error('Method not implemented.')
    }

    delete(path: string): void {
        this.providers[0].delete(path)
    }

    async exists(path: string): Promise<boolean> {
        return !!(await this.providers[0].exists(path))
    }

    async read(path: string): Promise<Uint8Array | null> {
        return this.providers[0].read(path)
    }

    write(path: string, data: Uint8Array): void {
        this.providers[0].write(path, data)
    }
}

export interface Filter {
    extensions: string[]
    label?: string
}

function extension_to_filter(extension: string): Filter | undefined {
    switch (extension) {
        case '.glkdata':
            return {
                extensions: ['.glkdata'],
                label: 'Data file',
            }
        case '.glksave':
            return {
                extensions: ['.glksave', '.sav'],
                label: 'Save file',
            }
        case '.txt':
            return {
                extensions: ['.txt'],
                label: 'Transcript or log',
            }
    }
}