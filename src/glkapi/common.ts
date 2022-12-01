/*

Common GlkApi things
====================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

export type GlkTypedArray = Uint8Array | Uint32Array
export type GlkTypedArrayConstructor = Uint8ArrayConstructor | Uint32ArrayConstructor

export function copy_array(source: GlkTypedArray, target: number[], length: number) {
    const copy_length = Math.min(length, target.length)
    for (let i = 0; i < copy_length; i++) {
        target[i] = source[i]
    }
}

export function is_unicode_array(arr: GlkTypedArray) {
    return arr.BYTES_PER_ELEMENT === 4
}

export function Uint8Array_to_Uint32Array(arr: Uint8Array) {
    return new Uint32Array(arr.buffer, arr.byteOffset, arr.byteLength / 4)
}