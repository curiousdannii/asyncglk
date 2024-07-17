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
    import FileList from './FileList.svelte'

    let chosen_fullpath: string | undefined
    let cur_dir: string
    let cur_direntry: DirEntry[] = []
    let dialog: HTMLDialogElement
    let dir_browser: DirBrowser
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
        cur_dir = opts.dir
        dir_browser = opts.dir_browser
        saving = opts.save
        submit_label = opts.submit_label
        title = opts.title
        cur_direntry = (await dir_browser.browse(cur_dir)).sort((a, b) => a.name.localeCompare(b.name))
        promise = new Promise((resolve) => promise_resolve = resolve)
        file_list.clear()
        dialog.showModal()
        if (saving) {
            filename_input.focus()
        }
        return promise
    }

    function on_close() {
        dialog.close()
        promise_resolve(null)
    }

    function on_submit() {
        dialog.close()
        if (saving) {
            promise_resolve(filename_input.value || null)
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

<dialog bind:this={dialog} class:selecting={!saving} on:close={on_close}>
    <div class="inner">
        <div class="head">
            <h1>{title}</h1>
            <button class="close" aria-label="Close" on:click={on_close}>✖</button>
        </div>
        <FileList bind:this={file_list}
            bind:chosen_fullpath={chosen_fullpath}
            bind:selected_filename={selected_filename}
            files={cur_direntry}
        />
        {#if saving}
            <div class="filename">
                <input bind:this={filename_input}>
            </div>
        {/if}
        <div class="foot">
            <button class="close" aria-label="Cancel" on:click={on_close}>Cancel</button>
            <button class="submit" aria-label="{submit_label}" on:click={on_submit}>{submit_label}</button>
        </div>
    </div>
</dialog>