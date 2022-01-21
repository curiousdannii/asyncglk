/*

Blorb Files and functions
=========================

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {FileView, IFF} from "./iff.js"

export interface ImageSize {
    height: number,
    width: number,
}

export interface BlorbChunk {
    /** Resource descriptions */
    alttext?: string,
    /** Whether a data chunk is binary */
    binary?: boolean,
    /** The original Chunk ID FourCC */
    blorbtype: string,
    content: Uint8Array,
    /** Cached image dimensions */
    imagesize?: ImageSize,
    /** Image type */
    type?: string,
    /** External URL for image */
    url?: string,
    /** Resource usage */
    usage: 'data' | 'exec' | 'pict' | 'sound',
}

export interface ImageInfo extends BlorbChunk {
    height?: number,
    /** The resource number */
    image: number,
    width?: number,
}

export interface BlorbDataChunk {
    binary: boolean,
    data: Uint8Array,
}

const BLORB_RESOURCE_INDEX_USAGES: Record<string, string> = {
    Data: 'data',
    Exec: 'exec',
    Pict: 'pict',
    'Snd ': 'sound',
}

const UNKNOWN_IMAGE_TYPE = '????'

const utf8decoder = new TextDecoder()

export default class Blorb {
    classname = 'Blorb'
    /** Chunks are indexed with "USE:NUMBER" keys */
    chunks: Record<string, BlorbChunk> = {}
    private coverimagenum?: number
    private debugdata?: Uint8Array
    private is_inited = false

    init(data: Uint8Array): void;
    init(data: Uint8Array) {
        if (data instanceof Uint8Array) {
            const iff = new IFF()
            iff.parse(data)
            if (iff.type !== 'IFRS') {
                throw new Error('Not a Blorb file')
            }
            if (iff.chunks[0].type !== 'RIdx') {
                throw new Error('Malformed blorb: chunk 1 is not RIdx')
            }

            // Process the chunks
            for (const iff_chunk of iff.chunks) {
                switch (iff_chunk.type) {
                    case 'Dbug': {
                        // Process the debug chunk
                        this.debugdata = iff_chunk.data
                        break
                    }
                    case 'Fspc': {
                        // Process the frontispiece chunk
                        const view = new FileView(iff_chunk.data)
                        this.coverimagenum = view.getUint32(0)
                        break
                    }
                    case 'IFmd': {
                        // Process the metadata chunk
                        // TODO
                        break
                    }
                    case 'RDes': {
                        // Process the resource description chunk
                        const view = new FileView(iff_chunk.data)
                        let i = 4
                        while (i < view.byteLength) {
                            const usage = view.getFourCC(i)
                            const resource_number = view.getUint32(i + 4)
                            const text_length = view.getUint32(i + 8)
                            const chunk = this.chunks[`${usage}:${resource_number}`]
                            if (chunk) {
                                chunk.alttext = utf8decoder.decode(view.getUint8Subarray(i + 12, text_length))
                            }
                            i += 12 + text_length
                        }
                        break
                    }
                    case 'RIdx': {
                        // Process the resource index chunk
                        const view = new FileView(iff_chunk.data)
                        let i = 4
                        while (i < view.byteLength) {
                            const usage = view.getFourCC(i)
                            const resource_number = view.getUint32(i + 4)
                            const resource_offset = view.getUint32(i + 8)
                            i += 12
                            const resource_chunk = iff.chunks.filter(chunk => chunk.offset === resource_offset)[0]
                            if (!resource_chunk) {
                                throw new Error(`No Blorb chunk at offset ${resource_offset}`)
                            }
                            const chunk: BlorbChunk = {
                                blorbtype: resource_chunk.type,
                                content: resource_chunk.data,
                                usage: BLORB_RESOURCE_INDEX_USAGES[usage] as BlorbChunk['usage'],
                            }
                            if (usage === 'Pict') {
                                if (resource_chunk.type === 'JPEG') {
                                    chunk.type = 'jpeg'
                                }
                                else if (resource_chunk.type === 'PNG ') {
                                    chunk.type = 'png'
                                }
                                else {
                                    chunk.type = UNKNOWN_IMAGE_TYPE
                                }
                            }
                            if (usage === 'Data') {
                                chunk.binary = resource_chunk.type === 'BINA' || resource_chunk.type === 'FORM'
                            }
                            this.chunks[`${usage}:${resource_number}`] = chunk
                        }
                        break
                    }
                }
            }
        }
        else {
            throw new Error('Resource maps not supported yet')
        }

        this.is_inited = true
    }

    getlibrary(): null {
        return null
    }

    get_chunk(usage: string, num: number): BlorbChunk | null {
        return this.chunks[`${usage}:${num}`] || null
    }

    get_cover_pict(): number | null {
        return this.coverimagenum ?? null
    }

    get_data_chunk(num: number): BlorbDataChunk | null {
        const chunk = this.chunks[`data:${num}`]
        if (!chunk) {
            return null
        }
        return {
            binary: chunk.binary!,
            data: chunk.content,
        }
    }
    
    get_debug_info(): Uint8Array | undefined {
        return this.debugdata
    }

    /** Return the game file chunk, or null if there isn't one.
     * If type is provided (GLUL or ZCOD) then the game file is checked to ensure it matches
     */
    get_exec_data(gametype?: 'GLUL' | 'ZCOD'): Uint8Array | null {
        const chunk = this.chunks['exec:0']
        if (!chunk || (gametype && chunk.blorbtype !== gametype)) {
            return null
        }
        return chunk.content
    }

    get_image_info(num: number): ImageInfo | null {
        const chunk = this.chunks[`pict:${num}`]
        if (!chunk) {
            return null
        }

        // Try to extract the image sizes
        if (!chunk.imagesize) {
            if (chunk.type === 'jpeg') {
                chunk.imagesize = get_jpeg_dimensions(chunk.content)
            }
            else if (chunk.type === 'png') {
                chunk.imagesize = get_png_dimensions(chunk.content)
            }
        }

        const img: ImageInfo = Object.assign({image: num}, chunk)
        if (img.imagesize) {
            img.height = img.imagesize.height
            img.width = img.imagesize.width
        }
        return img
    }

    get_image_url(num: number): string | null {
        const chunk = this.chunks[`pict:${num}`]
        if (!chunk) {
            return null
        }

        if (chunk.url) {
            return chunk.url
        }

        if (chunk.type !== UNKNOWN_IMAGE_TYPE) {
            return URL.createObjectURL(new Blob([chunk.content], {type: `image/${chunk.type}`}))
        }

        return null
    }

    /*get_metadata*/

    inited(): boolean {
        return this.is_inited
    }
}

function get_jpeg_dimensions(data: Uint8Array): ImageSize | undefined {
    const view = new FileView(data)
    let i = 0
    while (i < view.byteLength) {
        if (view.getUint8(i) !== 0xFF) {
            return
        }
        while (view.getUint8(i) === 0xFF) {
            i++
        }
        const marker = view.getUint8(i++)
        // Markers with no data
        if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD9)) {
            continue
        }
        const chunklength = view.getUint16(i)
        if (marker >= 0xC0 && marker <= 0xCF && marker != 0xC8) {
            if (chunklength < 7) {
                // SOF block is too small
                return
            }
            return {
                height: view.getUint8(i + 3),
                width: view.getUint8(i + 5)
            }
        }
        i += chunklength
    }
}

function get_png_dimensions(data: Uint8Array): ImageSize | undefined {
    const view = new FileView(data)
    if (view.getFourCC(0) !== '\x89PNG') {
        return
    }

    let i = 8
    while (i < view.byteLength) {
        const chunklength = view.getUint32(i)
        const chunktype = view.getFourCC(i + 4)
        i += 8
        if (chunktype === 'IHDR') {
            return {
                height: view.getInt32(i + 4),
                width: view.getInt32(i),
            }
        }
        // Skip CRC
        i += chunklength + 4
    }
}