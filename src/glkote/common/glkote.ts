/*

Generic GlkOte implementation
=============================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as Constants from '../../common/constants.js'
import * as protocol from '../../common/protocol.js'

export interface GlkOte {
    classname: string,
    error(msg: any): void,
    extevent(val: any): void,
    getdomcontext(): HTMLElement | undefined,
    getdomid(name: string): string,
    getinterface(): GlkOteOptions,
    getlibrary(name: string): any,
    init(options: GlkOteOptions): void,
    inited(): boolean,
    log(msg: string): void,
    save_allstate(): any,
    setdomcontext(val: HTMLElement): void,
    update(data: protocol.Update): void,
    version: string,
    warning(msg: any): void,
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
    recording_handler?: any,
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
    current_metrics = Object.assign({}, Constants.DEFAULT_METRICS)
    protected Dialog?: any
    disabled = false
    protected generation = 0
    protected is_inited = false
    protected options: GlkOteOptions = {} as GlkOteOptions
    protected timer: ReturnType<typeof setTimeout> | null = null

    async init(options: GlkOteOptions) {
        if (!options) {
            return this.error('no options provided')
        }
        if (!options.accept) {
            return this.error('an accept function was not given to GlkOte')
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
        this.send_event({type: 'init'})
    }

    error(error: Error | string) {
        throw (typeof error === 'string' ? new Error(error) : error)
    }

    extevent(value: any) {
        this.send_event({
            type: 'external',
            value,
        })
    }

    getdomcontext(): HTMLElement | undefined {
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

    inited(): boolean {
        return this.is_inited
    }

    log(msg: string) {
        console.log(msg)
    }

    setdomcontext(val: HTMLElement) {
        throw new Error('setdomcontext is not applicable to this GlkOte library')
    }

    update(data: protocol.Update) {
        try {
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
                setTimeout(() => this.send_event({type: 'refresh'}), 2000)
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

            if (data.timer !== undefined) {
                if (this.timer) {
                    clearInterval(this.timer)
                    this.timer = null
                }
                if (data.timer) {
                    this.timer = setInterval(() => this.ontimer(), data.timer)
                }
            }

            if (data.specialinput) {
                this.handle_specialinput(data.specialinput)
            }

            // Disable everything if requested
            this.disabled = false
            if (data.disable || data.specialinput) {
                this.disable(true)
            }

            if (data.autorestore) {
                this.autorestore(data.autorestore)
            }

            // Page background colour
            if (typeof data.page_bg !== 'undefined') {
                this.set_page_bg(data.page_bg)
            }
        }
        catch (err) {
            this.error(err as Error)
        }
    }

    warning(msg: any) {
        console.warn(msg)
    }

    // AsyncGlk specific implementation methods
    protected autorestore(data: any) {}

    protected capabilities(): string[] {
        return ['timer']
    }

    protected exit() {}

    protected handle_specialinput(data: protocol.SpecialInput) {
        if (data.type === 'fileref_prompt') {
            const replyfunc = (ref: any) => this.send_event({
                type: 'specialresponse',
                response: 'fileref_prompt',
                value: ref,
            })

            try {
                if (!this.Dialog) {
                    setTimeout(() => replyfunc(null), 0)
                }
                else {
                    this.Dialog.open(data.filemode !== 'read', data.filetype, data.gameid, replyfunc)
                }
            }
            catch (ex) {
                this.log(`Unable to open file dialog: ${ex}`)
                /* Return a failure. But we don't want to call send_response before
                glkote_update has finished, so we defer the reply slightly. */
                setTimeout(() => replyfunc(null), 0)
            }
        }
        else {
            this.error( `Request for unknown special input type: ${data.type}` )
        }
    }

    protected ontimer() {
        if (!this.disabled) {
            this.send_event({type: 'timer'})
        }
    }

    save_allstate(): any {}

    send_event(ev: Partial<protocol.Event>) {
        if (this.disabled && ev.type !== 'specialresponse') {
            return
        }
        ev.gen = this.generation
        switch (ev.type) {
            case 'arrange':
                ev.metrics = this.current_metrics
                break
            case 'init':
                ev.metrics = this.current_metrics
                ev.support = this.capabilities()
                break
            case 'specialresponse':
                ev.response = 'fileref_prompt'
                break
        }
        this.accept_func(ev as Required<protocol.Event>)
    }

    protected set_page_bg(colour: string) {}

    // Functions to be implemented in a subclass
    protected abstract cancel_inputs(windows: protocol.InputUpdate[]): void
    protected abstract disable(disable: boolean): void
    protected abstract update_content(content: protocol.ContentUpdate[]): void
    protected abstract update_inputs(windows: protocol.InputUpdate[]): void
    protected abstract update_windows(windows: protocol.WindowUpdate[]): void
}