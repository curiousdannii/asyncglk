/*

Web GlkOte Sound Channels
=========================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {fetch_resource, parse_base64} from '../../common/file/browser.js'
import * as protocol from '../../common/protocol.js'
import WebGlkOte from './web.js'

import GlkAudio_init, {decode as GlkAudio_decode, wasm as GlkAudio_is_ready} from 'glkaudio'

// From https://github.com/compulim/web-speech-cognitive-services/issues/34
const priming_mp3 = 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU3LjU2LjEwMQAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU3LjY0AAAAAAAAAAAAAAAAJAUHAAAAAAAAAYYoRBqpAAAAAAD/+xDEAAPAAAGkAAAAIAAANIAAAARMQU1FMy45OS41VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7EMQpg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV'

export class SoundChannelManager extends Map<number, SoundChannel> {
    private context: AudioContext
    private glkote: WebGlkOte

    constructor(glkote: WebGlkOte) {
        super()
        this.glkote = glkote
        this.context = new AudioContext()

        // Try to prime the audio system so that sounds starting after a timer will work
        this.prime()
    }

    async update(schannels: protocol.SoundChannelUpdate[]) {
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

    private async prime() {
        const context = this.context

        const source = this.context.createBufferSource()
        const data = await parse_base64(priming_mp3)
        source.buffer = await context.decodeAudioData(data.buffer)

        source.connect(context.destination)
        source.start()
        setTimeout(() => {
            source.disconnect()
            source.stop()
        }, 10)
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
                        // Load the glkaudio library if it hasn't been yet
                        if (!GlkAudio_is_ready) {
                            await GlkAudio_init({module_or_path: fetch_resource(this.glkote.options, 'glkaudio_bg.wasm')})
                        }
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