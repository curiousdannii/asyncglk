/*

RemGlk mode GlkOte implementation
===================================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as TTY from 'tty'

import * as Constants from '../../common/constants'
import * as GlkOte from '../common/glkote'
import * as protocol from '../../common/protocol'

export class RemGlk extends GlkOte.GlkOteBase implements GlkOte.GlkOte {
    private stdin: TTY.ReadStream
    private stdout: TTY.WriteStream

    constructor(options: any) {
        super()

        this.stdin = options.stdin
        this.stdout = options.stdout

        if (this.stdin.isTTY) {
            this.stdin.setRawMode(true)
        }
    }

    async init(options: GlkOte.GlkOteOptions): Promise<void> {
        if (!options) {
            throw new Error('no options provided')
        }
        if (!options.accept) {
            throw new Error('an accept function was not given to GlkOte')
        }

        this.options = options
        this.accept_func = options.accept

        let buffer = ''

        this.stdin.on('data', chunk => {
            buffer += chunk.toString().trim()
            if (buffer.endsWith('}')) {
                try {
                    const event: protocol.Event = JSON.parse(buffer)
                    buffer = ''
                    if (event.type === 'init') {
                        // Fill out the metrics
                        event.metrics = Object.assign({}, Constants.DEFAULT_METRICS, event.metrics)
                    }
                    if (event.type === 'specialresponse' && typeof event.value === 'string') {
                        event.value = {filename: event.value}
                    }
                    this.accept_func(event)
                }
                catch (e) {
                    // Not a full JSON response yet
                }
            }
        })

        this.is_inited = true
    }

    update(data: protocol.Update): void {
        this.stdout.write(`${JSON.stringify(data)}\n\n`)
    }

    cancel_inputs(windows: protocol.InputUpdate[]): void {
        throw new Error('method should not be called in RemGlk mode')
    }

    disable(disable: boolean): void {
        throw new Error('method should not be called in RemGlk mode')
    }

    handle_specialinput(data: protocol.SpecialInput): void {
        throw new Error('method should not be called in RemGlk mode')
    }

    save_allstate(): any {
        throw new Error('method should not be called in RemGlk mode')
    }

    update_content(content: protocol.ContentUpdate[]): void {
        throw new Error('method should not be called in RemGlk mode')
    }

    update_inputs(windows: protocol.InputUpdate[]): void {
        throw new Error('method should not be called in RemGlk mode')
    }

    update_windows(windows: protocol.WindowUpdate[]): void {
        throw new Error('method should not be called in RemGlk mode')
    }
}