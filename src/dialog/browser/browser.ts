/*

Browser Dialog
==============

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {AsyncDialog, DialogDirectories, DialogOptions} from '../common/interface.js'
import {DownloadOptions, DownloadProvider, ProgressCallback} from './download.js'
import {Provider} from './interface.js'
import {WebStorageProvider} from './storage.js'

export class BrowserDialog implements AsyncDialog {
    'async' = true as const
    private dirs: DialogDirectories = {
        storyfile: '',
        system_cwd: '/usr',
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
            new WebStorageProvider('/', localStorage),
        ]

        for (const [i, provider] of this.providers.entries()) {
            const next = this.providers[i + 1]
            if (next) {
                provider.next = next
            }
        }
    }

    async download(url: string, progress_callback?: ProgressCallback): Promise<string> {
        return this.downloader!.download(url, progress_callback)
    }

    get_dirs(): DialogDirectories {
        return this.dirs
    }

    async prompt(extension: string, save: boolean): Promise<string | null> {
        return prompt('Filename')
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