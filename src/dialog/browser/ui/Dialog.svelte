<script context="module" lang="ts">
    import type {Filter} from '../browser.js'
    import type {DirBrowser, DirEntry} from '../interface.js'

    export interface PromptOptions {
        dir_browser: DirBrowser
        filter?: Filter
        save: boolean
        submit_label: string,
        title: string
    }
</script>

<script lang="ts">
    import DirTree from './DirTree.svelte'
    import FileList from './FileList.svelte'

    let chosen_fullpath: string | undefined
    let cur_dir: string
    let cur_direntry: DirEntry[] = []
    let cur_filter: string = ''
    let dialog: HTMLDialogElement
    export let dir_browser: DirBrowser
    let dir_tree: string[] = ['usr']
    let file_list: FileList
    let filename_input: HTMLInputElement
    let filter: Filter | undefined
    let promise: Promise<string | null>
    let promise_resolve: (res: string | null) => void
    let saving: boolean
    let selected_filename: string | undefined
    let submit_label = ''
    let title = ''

    $: {
        if (saving && filename_input && selected_filename) {
            filename_input.value = selected_filename
        }
    }

    export async function prompt(opts: PromptOptions): Promise<string | null> {
        dir_browser = opts.dir_browser
        if (opts.filter?.extensions.join() !== filter?.extensions.join()) {
            if (cur_filter !== '*') {
                cur_filter = opts.filter?.extensions.join() ?? '*'
            }
            filter = opts.filter
            if (!filter) {
                cur_filter = '*'
            }
        }
        saving = opts.save
        submit_label = opts.submit_label
        title = opts.title
        await update_direntry(cur_dir)
        promise = new Promise((resolve) => promise_resolve = resolve)
        file_list.clear()
        dialog.showModal()
        if (saving && filename_input) {
            filename_input.focus()
            filename_input.value = ''
        }
        return promise
    }

    export async function update_direntry(path: string) {
        cur_dir = path
        cur_direntry = (await dir_browser.browse(path)).sort((a, b) => {
            if (a.dir !== b.dir) {
                return +b.dir - +a.dir
            }
            return a.name.localeCompare(b.name)
        })
        dir_tree = path.substring(1).split('/')
    }

    async function on_change_dir(ev: CustomEvent) {
        const path: string = ev.detail
        await update_direntry(path)
    }

    function on_close() {
        dialog.close()
        promise_resolve(null)
    }

    function on_create_input(node: HTMLInputElement) {
        filename_input = node
        filename_input.focus()
        filename_input.value = ''
    }

    async function on_file_doubleclicked(ev: CustomEvent) {
        const data: DirEntry = ev.detail
        if (data.dir) {
            await update_direntry(data.full_path)
        }
        else {
            dialog.close()
            promise_resolve(data.full_path)
        }
    }

    function on_input_keydown(ev: KeyboardEvent) {
        if (ev.code === 'Enter') {
            on_submit()
            ev.preventDefault()
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

    .filename {
        display: flex;
    }

    #filename_input {
        flex-grow: 1;
        margin-left: 6px;
    }

    .foot {
        display: flex;
        justify-content: space-between;
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
        {#key cur_filter}
            <FileList bind:this={file_list}
                bind:chosen_fullpath={chosen_fullpath}
                bind:selected_filename={selected_filename}
                files={cur_direntry}
                filter={cur_filter}
                on:file_doubleclicked={on_file_doubleclicked}
            />
        {/key}
        {#if saving}
            <div class="filename">
                <label for="filename_input">File name:</label>
                <input id="filename_input" on:keydown={on_input_keydown} use:on_create_input>
            </div>
        {/if}
        <div class="foot">
            <div>
                {#if filter}
                    <label for="dialog_filter">File type:</label>
                    <select id="dialog_filter" bind:value={cur_filter}>
                        {#if filter.label}
                            <option value="{filter.extensions.join()}">{filter.label} ({filter.extensions.join(', ')})</option>
                        {:else}
                            <option value="{filter.extensions.join()}">{filter.extensions[0]} file</option>
                        {/if}
                        <option value="*">All files</option>
                    </select>
                {/if}
            </div>
            <div>
                <button class="close" aria-label="Cancel" on:click={on_close}>Cancel</button>
                <button class="submit" aria-label="{submit_label}" on:click={on_submit}>{submit_label}</button>
            </div>
        </div>
    </div>
</dialog>