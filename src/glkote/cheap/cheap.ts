/*

Cheap console GlkOte implementation
===================================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as GlkOte from '../common/glkote'
import * as protocol from '../../common/protocol'

export class CheapGlkOte extends GlkOte.GlkOteBase implements GlkOte.GlkOte {
    private current_input_type: 'char' | 'line' | null = null
    private window: any

    cancel_inputs(windows: protocol.InputUpdate[]): void {
        throw new Error('not yet implemented')
    }

    disable(disable: boolean): void {
        this.disabled = disable
    }

    handle_specialinput(data: protocol.SpecialInput): void {
        throw new Error('not yet implemented')
    }

    async init(options: GlkOte.GlkOteOptions): Promise<void> {
        if (!options) {
            throw new Error('no options provided')
        }

        // Wrap glk_window_open so that only one window can be opened
        if (options.Glk) {
            const old_glk_window_open = options.Glk.glk_window_open
            options.Glk.glk_window_open = function(splitwin: any, method: any, size: any, wintype: any, rock: any) {
                if (splitwin) {
                    return null
                }
                return old_glk_window_open(splitwin, method, size, wintype, rock)
            }
        }

        if (process.stdout.isTTY) {
            this.current_metrics.height = process.stdout.rows
            this.current_metrics.width = process.stdout.columns
        }

        super.init(options)
    }

    save_allstate(): any {
        throw new Error('not yet implemented')
    }

    update_content(content: protocol.ContentUpdate[]): void {
        throw new Error('not yet implemented')
    }

    update_inputs(windows: protocol.InputUpdate[]): void {
        throw new Error('not yet implemented')
    }

    update_windows(windows: protocol.WindowUpdate[]): void {
        throw new Error('not yet implemented')
    }
}