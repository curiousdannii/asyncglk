/*

Download/upload provider
========================

Copyright (c) 2024 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

// The download provider stores its own files just in a map (maybe to be cached in the future), but if files are written next to them, then they need to be done so in another provider

import type {ProgressCallback} from '../../common/file.js'
import {NullProvider} from './common.js'
import type {DownloadOptions, Provider} from './interface.js'
import {parse_base64, read_response} from '../../common/file.js'
import {utf8decoder} from '../../common/misc.js'

export class DownloadProvider implements Provider {
    browseable = false
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

    async upload(file: File) {
        const data = await read_uploaded_file(file)
        const path = '/upload/' + file.name
        this.store.set(path, data)
        return path
    }

    async delete(path: string) {
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

    write(files: Record<string, Uint8Array>) {
        return this.next.write(files)
    }
}

/** Fetch a storyfile, using the proxy if necessary, and handling JSified stories */
export async function fetch_storyfile(options: DownloadOptions, url: string, progress_callback?: ProgressCallback): Promise<Uint8Array> {
    // Handle a relative URL
    const story_url = new URL(url, document.URL)
    const story_domain = story_url.hostname
    const same_protocol = story_url.protocol === document.location.protocol
    const same_domain = story_domain === document.location.hostname
    const proxy_url = `${options.proxy_url}?url=${story_url}`
    let response: Response

    // Load an embedded storyfile
    if (story_url.protocol === 'embedded:') {
        const data = (document.getElementById(story_url.pathname) as HTMLScriptElement).text
        return parse_base64(data)
    }

    // Only directly access files same origin files or those from the list of reliable domains
    let direct_access = (same_protocol && same_domain) || story_url.protocol === 'data:'
    if (!direct_access) {
        for (const domain of options.direct_domains) {
            if (story_domain.endsWith(domain)) {
                // all direct domains require HTTPS
                story_url.protocol = 'https:'
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
        catch {
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

/** Read an uploaded file and return it as a Uint8Array */
export function read_uploaded_file(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error)
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
        reader.readAsArrayBuffer(file)
    })
}

function url_to_path(url: string) {
    if (url.startsWith('https:')) {
        return '/download/https/' + url.substring(8)
    }
    else {
        return '/download/http/' + url.substring(7)
    }
}