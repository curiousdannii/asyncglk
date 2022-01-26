/*

Interchange File Format
=======================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

/** A DataView with support for getting and setting arrays and four character codes */
export class FileView extends DataView {
    constructor(array: Uint8Array);
    constructor(buffer: ArrayBuffer, byteOffset?: number, byteLength?: number);
    constructor(data: Uint8Array | ArrayBuffer, byteOffset?: number, byteLength?: number) {
        if (data instanceof Uint8Array) {
            super(data.buffer, data.byteOffset, data.byteLength)
        }
        else {
            super(data, byteOffset, byteLength)
        }
    }

    getFourCC(index: number) {
        return String.fromCharCode(this.getUint8(index), this.getUint8(index + 1), this.getUint8(index + 2), this.getUint8(index + 3))
    }

    getUint8Subarray(index?: number, length?: number): Uint8Array {
        return new Uint8Array(this.buffer, this.byteOffset + (index || 0), length)
    }

    setFourCC(index: number, text: string) {
        this.setUint8(index, text.charCodeAt(0) )
        this.setUint8(index + 1, text.charCodeAt(1))
        this.setUint8(index + 2, text.charCodeAt(2))
        this.setUint8(index + 3, text.charCodeAt(3))
    }

    setUint8Array(index: number, data: Uint8Array) {
        const subarray = this.getUint8Subarray(index, data.length)
        subarray.set(data)
    }
}

export interface IFFChunk {
    data: Uint8Array,
    offset: number,
    type: string,
}

/** An Interchange File Format reader and writer */
export class IFF {
    type = ''
    chunks: IFFChunk[] = []

    parse(data: Uint8Array) {
        const view = new FileView(data)

        // Check this is actually an IFF file
        if (view.getFourCC(0) !== 'FORM') {
            throw new Error('Not an IFF file')
        }

        // Parse the file
        this.type = view.getFourCC(8)
        let i = 12
        const length = view.getUint32(4) + 8
        while (i < length) {
            const chunk_length = view.getUint32(i + 4)
            if (chunk_length < 0 || (chunk_length + i) > length) {
                throw new Error('IFF chunk out of range')
            }
            this.chunks.push({
                data: view.getUint8Subarray(i + 8, chunk_length),
                offset: i,
                type: view.getFourCC(i),
            })
            i += 8 + chunk_length
            if (i % 2) {
                i++
            }
        }
    }

    write(): Uint8Array {
        // First calculate the required buffer length
        let buffer_length = 12
        for (const chunk of this.chunks) {
            buffer_length += 8 + chunk.data.length
            if (buffer_length % 2) {
                buffer_length++
            }
        }

        // Now make the IFF file and return it
        const view = new FileView(new ArrayBuffer(buffer_length))
        view.setFourCC(0, 'FORM')
        view.setUint32(4, buffer_length - 8)
        view.setFourCC(8, this.type)
        let i = 12
        for (const chunk of this.chunks) {
            view.setFourCC(i, chunk.type)
            view.setUint32(i + 4, chunk.data.length)
            view.setUint8Array(i + 8, chunk.data)
            i += 8 + chunk.data.length
            if (i % 2) {
                i++
            }
        }
        return view.getUint8Subarray()
    }
}