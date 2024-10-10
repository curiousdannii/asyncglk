/*

Common implementations
======================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import type {Provider} from './interface.js'
import AlertDialog from './ui/AlertDialog.svelte'

const ALERT_MODE_ALERT = 0

export class NullProvider implements Provider {
    browseable = false
    next: Provider = this
    async delete(_path: string) {}
    async exists(_path: string) {
        return null
    }
    async read(_path: string) {
        return null
    }
    async write(_path: string, _data: Uint8Array) {}
}

export async function show_alert(title: string, message: string) {
    const alert = new AlertDialog({
        target: document.body,
        props: {
            message,
            mode: ALERT_MODE_ALERT,
            title,
        },
    })
    await alert.open()
    alert.$destroy()
}