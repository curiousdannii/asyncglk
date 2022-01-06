import { timingSafeEqual } from 'crypto'
/*

Generic GlkOte implementation
=============================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as Constants from '../../common/constants'
import * as protocol from '../../common/protocol'

export interface GlkOte {
    classname: string,
    error(msg: string): void,
    extevent(val: any): void,
    getdomcontext(): string,
    getdomid(name: string): string,
    getinterface(): GlkOteOptions,
    getlibrary(name: string): any,
    init(options: GlkOteOptions): void,
    inited(): boolean,
    log(msg: string): void,
    save_allstate(): any,
    setdomcontext(val: string): void,
    update(data: protocol.Update): void,
    version: string,
    warning(msg: string): void,
}

export interface GlkOteOptions {
    accept(event: protocol.Event): void,
    Blorb?: any,
    debug_commands?: boolean,
    detect_external_links?: string | boolean,
    Dialog?: any,
    dialog_dom_prefix?: string,
    dom_prefix?: string,
    errorcontent?: string,
    errorpane?: string,
    gameport?: string,
    Glk?: any,
    loadingpane?: string,
    max_buffer_length?: number,
    recording_format?: string,
    recording_handler?: Function,
    recording_label?: string,
    recording_url?: string,
    regex_external_links?: RegExp,
    windowport?: string,
}

export abstract class GlkOteBase implements GlkOte {
    classname = 'GlkOte'
    version = Constants.PACKAGE_VERSION

    protected accept_func: (event: protocol.Event) => void = () => {}
    protected Blorb?: any
    protected current_metrics = Object.assign({}, Constants.DEFAULT_METRICS)
    protected Dialog?: any
    protected disabled = false
    protected generation = 0
    protected is_inited = false
    protected options: GlkOteOptions = {} as GlkOteOptions

    error(msg: string): void {
        throw new Error(msg)
    }

    extevent(val: any): void {
        this.send_event({
            type: 'external',
            gen: this.generation,
            value: val,
        })
    }

    getdomcontext(): string {
        throw new Error('getdomcontext is not applicable to this GlkOte library')
    }

    getdomid(name: string): string {
        throw new Error('getdomid is not applicable to this GlkOte library')
    }

    getinterface(): GlkOteOptions {
        return this.options
    }

    getlibrary(name: string): any {
        switch (name) {
            case 'Blorb': return this.Blorb
            case 'Dialog': return this.Dialog
            default: return null
        }
    }

    async init(options: GlkOteOptions): Promise<void> {
        if (!options) {
            throw new Error('no options provided')
        }
        if (!options.accept) {
            throw new Error('an accept function was not given to GlkOte')
        }

        this.options = options
        this.accept_func = options.accept

        if (options.Blorb) {
            this.Blorb = options.Blorb
        }
        if (options.Dialog) {
            this.Dialog = options.Dialog
        }

        this.is_inited = true

        // Send an init event, which if is received by GlkApi, will then result in VM.start() being called
        this.send_event({
            type: 'init',
            gen: 0,
            metrics: this.current_metrics,
            support: this.capabilities(),
        })
    }

    inited(): boolean {
        return this.is_inited
    }

    log(msg: string): void {
        console.log(msg)
    }

    setdomcontext(val: string): void {
        throw new Error('setdomcontext is not applicable to this GlkOte library')
    }

    update(data: protocol.Update): void {
        if (data.type === 'error') {
            return this.error(data.message)
        }
        if (data.type === 'exit') {
            return this.exit()
        }
        if (data.type === 'pass') {
            return
        }
        if (data.type === 'retry') {
            setTimeout(() => {
                this.send_event({
                    type: 'refresh',
                    gen: this.generation,
                })
            }, 2000)
            return
        }
        if (data.type !== 'update') {
            return this.error(`Unknown update type: ${(data as any).type}`)
        }

        if (data.gen === this.generation) {
            this.log(`Ignoring repeated generation number: ${data.gen}`)
            return
        }
        this.generation = data.gen

        if (this.disabled) {
            this.disable(false)
        }

        // Now handle all the state updates
        if (data.input) {
            this.cancel_inputs(data.input)
        }
        if (data.windows) {
            this.update_windows(data.windows)
        }
        if (data.content) {
            this.update_content(data.content)
        }
        if (data.input) {
            this.update_inputs(data.input)
        }

        // Disable everything if requested
        this.disabled = false
        if (data.disable || data.specialinput) {
            this.disable(true)
        }

        if (data.specialinput) {
            this.handle_specialinput(data.specialinput)
        }
    }

    warning(msg: string): void {
        console.warn(msg)
    }

    // AsyncGlk specific implementation methods
    protected capabilities(): string[] {
        return []
    }

    protected exit(): void {}

    protected send_event(event: protocol.Event): void {
        this.accept_func(event)
    }

    // Functions to be implemented in a subclass
    abstract save_allstate(): any

    protected abstract cancel_inputs(windows: protocol.InputUpdate[]): void
    protected abstract disable(disable: boolean): void
    protected abstract handle_specialinput(data: protocol.SpecialInput): void
    protected abstract update_content(content: protocol.ContentUpdate[]): void
    protected abstract update_inputs(windows: protocol.InputUpdate[]): void
    protected abstract update_windows(windows: protocol.WindowUpdate[]): void
}