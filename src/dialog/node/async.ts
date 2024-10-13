/*

Cheap implementation of AsyncDialog
===================================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import fs from 'fs'
import fs_async from 'fs/promises'
import MuteStream from 'mute-stream'
import os from 'os'

import {path_native_to_posix, path_posix_to_native} from '../common/common.js'
import type {AsyncDialog, DialogOptions} from '../common/interface.js'
import {get_stdio, type HackableReadline} from '../../glkote/cheap/stdio.js'

export class CheapAsyncDialog implements AsyncDialog {
    'async' = true as const
    private rl: HackableReadline
    private stdout: MuteStream

    constructor() {
        const cheap_stdio = get_stdio()
        this.rl = cheap_stdio.rl
        this.stdout = cheap_stdio.stdout
    }

    async init(_options: DialogOptions) {
        // Anything to do here?
    }

    async delete(path: string) {
        try {
            fs.unlinkSync(path_posix_to_native(path))
        }
        catch {}
    }

    async exists(path: string) {
        try {
            await fs_async.access(path_posix_to_native(path), fs.constants.F_OK)
            return true
        }
        catch {
            return false
        }
    }

    get_dirs() {
        const cwd = path_native_to_posix(process.cwd())
        return {
            storyfile: cwd,
            system_cwd: cwd,
            temp: path_native_to_posix(os.tmpdir()),
            working: cwd,
        }
    }

    prompt(extension: string, _save: boolean): Promise<string | null> {
        this.stdout.write('\n')
        return new Promise(resolve => {
            this.rl.question('Please enter a file name (without an extension): ', path => {
                resolve(path ? `${path}.${extension}` : null)
            })
        })
    }

    read(path: string): Promise<Uint8Array | null> {
        return fs_async.readFile(path_posix_to_native(path))
            .catch(() => null)
    }

    set_storyfile_dir(path: string) {
        return {
            storyfile: path,
            working: path,
        }
    }

    async write(files: Record<string, Uint8Array>) {
        for (const [path, data] of Object.entries(files)) {
            fs.writeFileSync(path_posix_to_native(path), data, {flush: true})
        }
    }
}