/*

Web GlkOte Sound Channels
=========================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as protocol from '../../common/protocol.js'
import WebGlkOte from './web.js'

import GlkAudio_init, {decode as GlkAudio_decode} from 'glkaudio'

export class SoundChannelManager extends Map<number, SoundChannel> {
    private context: AudioContext
    private glkote: WebGlkOte

    constructor(glkote: WebGlkOte) {
        super()
        this.glkote = glkote
        this.context = new AudioContext()
    }

    update(schannels: protocol.SoundChannelUpdate[]) {
        const wanted_schannels = []
        for (const schannel of schannels) {
            const {id, ops} = schannel
            wanted_schannels.push(id)

            // Add new channels
            if (!this.has(id)) {
                this.set(id, new SoundChannel(this.glkote, this.context))
            }

            // Do operations
            if (ops) {
                this.get(id)!.do_ops(ops)
            }
        }

        // Remove unwanted channels
        for (const [id, schannel] of this) {
            if (!wanted_schannels.includes(id)) {
                schannel.delete()
                this.delete(id)
            }
        }
    }
}

export class SoundChannel {
    private buffer: AudioBuffer | null = null
    private context: AudioContext
    private gain: GainNode
    private glkote: WebGlkOte
    private notify = 0
    private paused = false
    private paused_time = 0
    private repeats = 0
    private snd = 0
    private source: AudioBufferSourceNode | null = null
    private start_time = 0
    private vol_timer = 0

    constructor(glkote: WebGlkOte, context: AudioContext) {
        this.context = context
        this.glkote = glkote
        this.gain = context.createGain()
        this.gain.connect(context.destination)
    }

    delete() {
        this.stop()
        if (this.vol_timer) {
            clearTimeout(this.vol_timer)
        }
        this.gain.disconnect()
    }

    async do_ops(ops: protocol.SoundChannelOperation[]) {
        const context = this.context
        for (const op of ops) {
            switch (op.op) {
                case 'pause':
                    if (!this.paused) {
                        this.paused = true
                        this.paused_time = context.currentTime - this.start_time
                        this.stop()
                    }
                    break

                case 'play': {
                    this.stop()

                    this.notify = op.notify ?? 0
                    this.paused_time = 0
                    this.repeats = op.repeats ?? 1
                    this.snd = op.snd

                    // Get the data from Blorb
                    const chunk = this.glkote.Blorb!.get_chunk('sound', op.snd)
                    if (!chunk) {
                        continue
                    }

                    // Decode
                    // TODO: cache decoded, or try streaming
                    try {
                        this.buffer = await context.decodeAudioData(chunk.content!.slice().buffer)
                    }
                    catch {
                        await GlkAudio_init()
                        const decoded = GlkAudio_decode(chunk.content!)
                        this.buffer = await context.decodeAudioData(decoded.buffer)
                    }

                    if (!this.paused) {
                        this.play()
                    }

                    break
                }

                case 'stop':
                    this.stop()
                    this.buffer = null
                    break

                case 'unpause':
                    if (this.paused) {
                        if (this.buffer) {
                            this.play()
                        }
                        else {
                            this.paused = false
                        }
                    }
                    break

                case 'volume': {
                    const currentTime = context.currentTime
                    const gain = this.gain.gain

                    // Cancel any current gain changes
                    const current_value = gain.value
                    gain.cancelScheduledValues(currentTime)
                    gain.value = current_value
                    if (this.vol_timer) {
                        clearTimeout(this.vol_timer)
                    }

                    const notify = () => {
                        this.glkote.send_event({
                            type: 'volume',
                            notify: op.notify,
                        })
                    }

                    if (op.dur) {
                        gain.setValueAtTime(current_value || 0.0001, currentTime)
                        gain.exponentialRampToValueAtTime(op.vol || 0.0001, currentTime + (op.dur) / 1000)
                        if (op.notify) {
                            // Handle Typescript thinking this is the Node version, which doesn't return a number
                            this.vol_timer = setTimeout(notify, op.dur) as any as number
                        }
                    }
                    else {
                        gain.value = op.vol
                        if (op.notify) {
                            notify()
                        }
                        this.vol_timer = 0
                    }
                    break
                }
            }
        }
    }

    private on_stop = () => {
        this.stop()

        // Repeat
        if (this.repeats !== 0) {
            this.play()
        }
        else if (this.notify) {
            this.glkote.send_event({
                type: 'sound',
                notify: this.notify,
                snd: this.snd,
            })
        }
    }

    private play() {
        // Create a new audio node
        const source = this.context.createBufferSource()
        this.source = source
        source.addEventListener('ended', this.on_stop)
        source.buffer = this.buffer!
        source.connect(this.gain)
        // Do we need to do source.loop=true for seamless repeats?

        // Handle unpausing
        this.start_time = this.context.currentTime - this.paused_time
        source.start(0, this.paused_time)
        if (this.paused) {
            this.paused = false
            this.paused_time = 0
        }
        else if (this.repeats > 0) {
            this.repeats--
        }
    }

    private stop() {
        const source = this.source
        if (source) {
            source.removeEventListener('ended', this.on_stop)
            source.stop()
            source.disconnect()
            this.source = null
        }
    }
}