/*

Miscellaneous common things
===========================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

export type GlkTypedArray = Uint8Array | Uint32Array
export type GlkTypedArrayConstructor = Uint8ArrayConstructor | Uint32ArrayConstructor

/** Write a Uint32Array as a big-endian Uint8Array */
export function Array_to_BEBuffer(arr: Uint32Array) {
    const buf = new Uint8Array(arr.length * 4)
    const dv = new DataView(buf)
    for (let i = 0; i < arr.length; i++) {
        dv.setUint32(i * 4, arr[i])
    }
    return buf
}

/** Read a big-endian Uint8Array into a Uint32Array */
export function BEBuffer_to_Array(buf: Uint8Array) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.length)
    const arr = new Uint32Array(buf.length / 4)
    for (let i = 0; i < buf.length; i += 4) {
        arr[i / 4] = dv.getUint32(i)
    }
    return arr
}

export function is_unicode_array(arr: GlkTypedArray) {
    return arr.BYTES_PER_ELEMENT === 4
}

export const utf8decoder = new TextDecoder()
export const utf8encoder = new TextEncoder()