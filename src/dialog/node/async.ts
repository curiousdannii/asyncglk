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

import {AsyncDialog, DialogDirectories, DialogOptions} from '../common/interface.js'
import {get_stdio, HackableReadline} from '../../glkote/cheap/stdio.js'

export class CheapAsyncDialog implements AsyncDialog {
    'async' = true as const
    private dirs: DialogDirectories
    private rl: HackableReadline
    private stdout: MuteStream

    constructor() {
        const cwd = process.cwd()
        this.dirs = {
            storyfile: cwd,
            temp: os.tmpdir(),
            working: cwd,
        }

        const cheap_stdio = get_stdio()
        this.rl = cheap_stdio.rl
        this.stdout = cheap_stdio.stdout
    }

    async init(_options: DialogOptions) {
        // Anything to do here?
    }

    delete(path: string) {
        try {
            fs.unlinkSync(path)
        }
        catch (_) {}
    }

    async exists(path: string) {
        try {
            await fs_async.access(path, fs.constants.F_OK)
            return true
        }
        catch (ex) {
            return false
        }
    }

    get_dirs() {
        return this.dirs
    }

    prompt(extension: string, _save: boolean): Promise<string | null> {
        this.stdout.write('\n')
        return new Promise(resolve => {
            this.rl.question('Please enter a file name (without an extension): ', path => {
                resolve(path ? `${path}.${extension}` : null)
            })
        })
    }

    async read(path: string): Promise<Uint8Array | null> {
        try {
            return fs_async.readFile(path)
        }
        catch (ex) {
            return null
        }
    }

    set_storyfile_dir(path: string) {
        this.dirs.storyfile = path
        this.dirs.working = path
        return this.dirs
    }

    write(path: string, data: Uint8Array) {
        fs.writeFileSync(path, data, {flush: true})
    }
}