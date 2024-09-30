/*

Download/upload provider
========================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

// The download provider stores its own files just in a map (maybe to be cached in the future), but if files are written next to them, then they need to be done so in another provider

import {NullProvider} from './common.js'
import type {DirBrowser, DownloadOptions, ProgressCallback, Provider} from './interface.js'
import {utf8decoder} from '../../common/misc.js'

export class DownloadProvider implements Provider {
    next = new NullProvider()
    private options: DownloadOptions
    private store: Map<string, Uint8Array> = new Map()

    constructor(options: DownloadOptions) {
        this.options = options
    }

    async download(url: string, progress_callback?: ProgressCallback): Promise<string> {
        const data = await fetch_storyfile(this.options, url, progress_callback)
        const path = url_to_path(url)
        this.store.set(path, data)
        return path
    }

    async browse(): Promise<DirBrowser> {
        return this.next.browse()
    }

    async delete(path: string): Promise<void | null> {
        if (this.store.has(path)) {
            this.store.delete(path)
        }
        else {
            return this.next.delete(path)
        }
    }

    async exists(path: string): Promise<boolean | null> {
        if (this.store.has(path)) {
            return true
        }
        else {
            return this.next.exists(path)
        }
    }

    async read(path: string): Promise<Uint8Array | null> {
        if (this.store.has(path)) {
            return this.store.get(path)!
        }
        else {
            return this.next.read(path)
        }
        // TODO: try downloading a sibling file
    }

    async write(path: string, data: Uint8Array): Promise<void | null> {
        return this.next.write(path, data)
    }
}

/** Fetch a storyfile, using the proxy if necessary, and handling JSified stories */
export async function fetch_storyfile(options: DownloadOptions, url: string, progress_callback?: ProgressCallback): Promise<Uint8Array> {
    // Handle a relative URL
    const story_url = new URL(url, document.URL)
    const story_domain = story_url.hostname
    const same_domain = story_domain === document.location.hostname
    const proxy_url = `${options.proxy_url}?url=${story_url}`
    let response: Response

    // Load an embedded storyfile
    if (story_url.protocol === 'embedded:') {
        const data = (document.getElementById(story_url.pathname) as HTMLScriptElement).text
        return parse_base64(data)
    }

    // Only directly access files same origin files or those from the list of reliable domains
    let direct_access = same_domain || story_url.protocol === 'data:'
    if (!direct_access) {
        for (const domain of options.direct_domains) {
            if (story_domain.endsWith(domain)) {
                direct_access = true
                break
            }
        }
    }

    if (direct_access) {
        try {
            response = await fetch('' + story_url)
        }
        // We can't specifically detect CORS errors but that's probably what happened
        catch (_) {
            throw new Error('Failed to fetch storyfile (possible CORS error)')
        }
    }

    // Otherwise use the proxy
    else {
        if (options.use_proxy) {
            response = await fetch(proxy_url)
        }
        else {
            throw new Error('Storyfile not in list of direct domains and proxy disabled')
        }
    }

    if (!response.ok) {
        throw new Error(`Could not fetch storyfile, got ${response.status}`)
    }

    // It would be nice to check here if the file was compressed, but we can only read the Content-Encoding header for same domain files

    const data = await read_response(response, progress_callback)

    // Handle JSified stories
    if (url.endsWith('.js')) {
        const text = utf8decoder.decode(data)
        const matched = /processBase64Zcode\(['"]([a-zA-Z0-9+/=]+)['"]\)/.exec(text)
        if (!matched) {
            throw new Error('Abnormal JSified story')
        }

        return parse_base64(matched[1])
    }

    return data
}

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

function url_to_path(url: string) {
    if (url.startsWith('https:')) {
        return '/download/https/' + url.substring(8)
    }
    else {
        return '/download/http/' + url.substring(7)
    }
}