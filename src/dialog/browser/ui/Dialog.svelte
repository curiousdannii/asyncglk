<script context="module" lang="ts">
    import type {DirBrowser, DirEntry} from '../interface.js'

    export interface PromptOptions {
        dir: string
        dir_browser: DirBrowser
        save: boolean
        submit_label: string,
        title: string
    }
</script>

<script lang="ts">
    import DirTree from './DirTree.svelte'
    import FileList from './FileList.svelte'

    let chosen_fullpath: string | undefined
    let cur_direntry: DirEntry[] = []
    let dialog: HTMLDialogElement
    let dir_browser: DirBrowser
    let dir_tree: string[] = ['usr']
    let file_list: FileList
    let filename_input: HTMLInputElement
    let promise: Promise<string | null>
    let promise_resolve: (res: string | null) => void
    let saving: boolean
    let selected_filename: string | undefined
    let submit_label = ''
    let title = ''

    $: {
        if (saving && selected_filename) {
            filename_input.value = selected_filename
        }
    }

    export async function prompt(opts: PromptOptions): Promise<string | null> {
        dir_browser = opts.dir_browser
        dir_tree = opts.dir.substring(1).split('/')
        saving = opts.save
        submit_label = opts.submit_label
        title = opts.title
        await update_direntry(opts.dir)
        promise = new Promise((resolve) => promise_resolve = resolve)
        file_list.clear()
        dialog.showModal()
        if (saving) {
            filename_input.focus()
            filename_input.value = ''
        }
        return promise
    }

    async function update_direntry(path: string) {
        cur_direntry = (await dir_browser.browse(path)).sort((a, b) => {
            if (a.dir !== b.dir) {
                return +b.dir - +a.dir
            }
            return a.name.localeCompare(b.name)
        })
    }

    async function on_change_dir(ev: CustomEvent) {
        const path: string = ev.detail
        await update_direntry(path)
        dir_tree = path.substring(1).split('/')
    }

    function on_close() {
        dialog.close()
        promise_resolve(null)
    }

    function on_create_input(node: HTMLInputElement) {
        filename_input = node
    }

    async function on_file_doubleclicked(ev: CustomEvent) {
        const data: DirEntry = ev.detail
        if (data.dir) {
            await update_direntry(data.full_path)
            dir_tree.push(data.name)
            dir_tree = dir_tree
        }
        else {
            dialog.close()
            promise_resolve(data.full_path)
        }
    }

    function on_submit() {
        dialog.close()
        if (saving) {
            const filename = filename_input.value.trim()
            promise_resolve(filename ? '/' + dir_tree.join('/') + '/' + filename : null)
        }
        else {
            promise_resolve(chosen_fullpath || null)
        }
    }
</script>

<style>
    dialog {
        box-sizing: border-box;
        height: 100%;
        font-family: sans-serif;
        max-height: 500px;
        max-width: 700px;
        user-select: none;
        width: 100%;
    }

    dialog::backdrop {
        background: linear-gradient(rgba(64, 64, 64, 25%), rgba(64, 64, 64, 40%));
    }

    .inner {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
    }

    .inner > :global(div) {
        padding: 5px 0;
    }

    .head .close {
        background: none;
        border: none;
        padding: 10px;
        position: absolute;
        right: 10px;
        top: 10px;
    }

    .foot {
        text-align: right;
    }
</style>

<dialog bind:this={dialog}
    class:selecting={!saving}
    on:close={on_close}
>
    <div class="inner">
        <div class="head">
            <h1>{title}</h1>
            <button class="close" aria-label="Close" on:click={on_close}>✖</button>
        </div>
        <DirTree
            dir_tree={dir_tree}
            on:change_dir={on_change_dir}
        />
        <FileList bind:this={file_list}
            bind:chosen_fullpath={chosen_fullpath}
            bind:selected_filename={selected_filename}
            files={cur_direntry}
            on:file_doubleclicked={on_file_doubleclicked}
        />
        {#if saving}
            <div class="filename">
                <label for="filename_input">File name:</label>
                <input id="filename_input" use:on_create_input>
            </div>
        {/if}
        <div class="foot">
            <button class="close" aria-label="Cancel" on:click={on_close}>Cancel</button>
            <button class="submit" aria-label="{submit_label}" on:click={on_submit}>{submit_label}</button>
        </div>
    </div>
</dialog>