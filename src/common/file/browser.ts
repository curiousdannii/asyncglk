/*

File processing functions for the browser
=========================================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {gunzipSync} from 'fflate'

import type {DownloadOptions, ProgressCallback} from './interface.js'

/** Fetch a resource */
const resource_map: Map<string, any> = new Map()
export async function fetch_resource(options: DownloadOptions, path: string, progress_callback?: ProgressCallback) {
    // Check the cache
    const cached = resource_map.get(path)
    if (cached) {
        return cached
    }

    const response = fetch_resource_inner(options, path, progress_callback)
    // Fill the cache with the promise, and then when the resource has been obtained, update the cache
    resource_map.set(path, response)
    response.then((resource: any) => {
        resource_map.set(path, resource)
    })
    return response
}

/** Actually fetch a resource */
async function fetch_resource_inner(options: DownloadOptions, path: string, progress_callback?: ProgressCallback) {
    // Handle embedded resources in single file mode
    if (options.single_file) {
        const node = document.getElementById(path) as HTMLScriptElement
        const data_base64 = node.text
        if (path.endsWith('.js')) {
            return import(`data:text/javascript,${encodeURIComponent(data_base64)}`)
        }
        if (!path.endsWith('.wasm')) {
            throw new Error(`Can't load ${path} in single file mode`)
        }
        let data = await parse_base64(data_base64)
        if (node.type.endsWith(';gzip')) {
            data = gunzipSync(data)
        }
        return data
    }

    // Handle when lib_path is a proper URL (such as import.meta.url), as well as the old style path fragment
    const lib_path = options.lib_path ?? import.meta.url
    let url: URL | string
    try {
        url = new URL(path, lib_path)
    }
    catch {
        url = lib_path + path
    }

    if (path.endsWith('.js')) {
        return import(url + '')
    }

    // Something else, like a .wasm
    const response = await fetch(url)
    return read_response(response, progress_callback)
}

/** Parse Base 64 into a Uint8Array */
export async function parse_base64(data: string): Promise<Uint8Array> {
    // Firefox has a data URL limit of 32MB, so we have to chunk large data
    const chunk_length = 30_000_000
    if (data.length < chunk_length) {
        return parse_base64_with_data_url(data)
    }
    const chunks: Uint8Array[] = []
    let i = 0
    while (i < data.length) {
        chunks.push(await parse_base64_with_data_url(data.substring(i, i += chunk_length)))
    }
    const blob = new Blob(chunks)
    return new Uint8Array(await blob.arrayBuffer())
}

async function parse_base64_with_data_url(data: string) {
    // Parse base64 using a trick from https://stackoverflow.com/a/54123275/2854284
    const response = await fetch(`data:application/octet-stream;base64,${data}`)
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