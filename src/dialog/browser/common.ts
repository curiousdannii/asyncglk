/*

Common implementations
======================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import type {Provider} from './interface.js'

export class NullProvider implements Provider {
    browseable = false
    next: Provider = this
    async delete(_path: string) {
        return null
    }
    async exists(_path: string) {
        return null
    }
    async read(_path: string) {
        return null
    }
    async write(_path: string, _data: Uint8Array) {
        return null
    }
}