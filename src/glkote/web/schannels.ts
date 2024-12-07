/*

Web GlkOte Sound Channels
=========================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as protocol from '../../common/protocol.js'
import WebGlkOte from './web.js'

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
    private context: AudioContext
    private gain: GainNode
    private glkote: WebGlkOte
    private notify = 0
    private source: AudioBufferSourceNode | null = null

    constructor(glkote: WebGlkOte, context: AudioContext) {
        this.context = context
        this.glkote = glkote
        this.gain = context.createGain()
        this.gain.connect(context.destination)
    }

    delete() {
        this.gain.disconnect()
    }

    async do_ops(ops: protocol.SoundChannelOperation[]) {
        for (const op of ops) {
            switch (op.op) {
                case 'pause':
                    break

                case 'play': {
                    this.stop()

                    // Get the data from Blorb
                    const chunk = this.glkote.Blorb!.get_chunk('sound', op.snd)
                    if (!chunk) {
                        continue
                    }
                    // Decode
                    const buffer = await this.context.decodeAudioData(chunk.content!.slice().buffer)
                    const source = this.context.createBufferSource()
                    source.buffer = buffer

                    if (op.repeats && op.repeats !== 1) {
                        source.loop = true
                        if (op.repeats > 0) {
                            source.stop(this.context.currentTime + buffer.duration * op.repeats)
                        }
                    }

                    if (op.notify) {
                        this.notify = op.notify
                        source.addEventListener('ended', this.on_stop)
                    }

                    // Play!
                    source.connect(this.gain)
                    source.start()
                    this.source = source

                    break
                }

                case 'stop':
                    this.stop()
                    break

                case 'unpause':
                    break

                case 'volume':{
                    const gain = this.gain.gain
                    const notify = () => {
                        this.glkote.send_event({
                            type: 'volume',
                            notify: op.notify,
                        })
                    }

                    if (op.dur) {
                        const currentTime = this.context.currentTime
                        gain.setValueAtTime(gain.value || 0.0001, currentTime)
                        gain.exponentialRampToValueAtTime(op.vol || 0.0001, currentTime + (op.dur) / 1000)
                        if (op.notify) {
                            setTimeout(notify, op.dur)
                        }
                    }
                    else {
                        gain.value = op.vol
                        if (op.notify) {
                            notify()
                        }
                    }
                    break
                }
            }
        }
    }

    // Only for sound finished events, not volume
    private on_stop = () => {
        this.glkote.send_event({
            type: 'sound',
            notify: this.notify,
        })
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