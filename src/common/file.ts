/*

Common file processing functions
================================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

export type ProgressCallback = (bytes: number) => void

/** Parse Base 64 into a Uint8Array */
export async function parse_base64(data: string, data_type = 'octet-binary'): Promise<Uint8Array> {
    // Parse base64 using a trick from https://stackoverflow.com/a/54123275/2854284
    const response = await fetch(`data:application/${data_type};base64,${data}`)
    if (!response.ok) {
        throw new Error(`Could not parse base64: ${response.status}`)
    }
    return new Uint8Array(await response.arrayBuffer())
}

/** Read a response, with optional progress notifications */
export async function read_response(response: Response, progress_callback?: ProgressCallback): Promise<Uint8Array> {
    if (!response.ok) {
        throw new Error(`Could not fetch ${response.url}, got ${response.status}`)
    }

    if (!progress_callback) {
        return new Uint8Array(await response.arrayBuffer())
    }

    // Read the response, calling the callback with each chunk
    const chunks: Array<[number, Uint8Array]> = []
    let length = 0
    const reader = response.body!.getReader()
    for (;;) {
        const {done, value} = await reader.read()
        if (done) {
            break
        }
        chunks.push([length, value])
        progress_callback(value.length)
        length += value.length
    }

    // Join the chunks together
    const result = new Uint8Array(length)
    for (const [offset, chunk] of chunks) {
        result.set(chunk, offset)
    }
    return result
}