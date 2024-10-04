<script context="module" lang="ts">
    import type {Filter} from '../browser.js'
    import type {DirBrowser} from '../common.js'
    import type {DirEntry} from '../interface.js'

    export interface PromptOptions {
        dir_browser: DirBrowser
        filter?: Filter
        save: boolean
        submit_label: string,
        title: string
    }
</script>

<script lang="ts">
    import {read_uploaded_file} from '../download.js'

    import AlertDialog, {ALERT_MODE_CONFIRM, ALERT_MODE_PROMPT} from './AlertDialog.svelte'
    import BaseDialog from './BaseDialog.svelte'
    import DirTree from './DirTree.svelte'
    import FileList from './FileList.svelte'

    let upload_files: HTMLInputElement
    let alert_dialog: AlertDialog
    let base_dialog: BaseDialog
    let cur_dir: string
    let cur_direntry: DirEntry[] = []
    let cur_filter: string = ''
    export let dir_browser: DirBrowser
    let dir_tree: string[] = ['usr']
    let file_list: FileList
    let filename_input: HTMLInputElement
    let filter: Filter | undefined
    let saving: boolean
    let selected_filename: string | undefined
    let submit_label = ''

    $: {
        if (saving && filename_input && selected_filename) {
            filename_input.value = selected_filename
        }
    }

    export function prompt(opts: PromptOptions): Promise<string | null> {
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
        update_direntry(cur_dir)
        const promise = base_dialog.open(opts.title)
        file_list.clear()
        if (saving && filename_input) {
            filename_input.focus()
            filename_input.value = ''
        }
        return promise.then(res => {
            return typeof res === 'string' ? res : null
        })
    }

    export function update_direntry(path: string) {
        file_list.clear()
        cur_dir = path
        cur_direntry = (dir_browser.browse(path)).sort((a, b) => {
            if (a.dir !== b.dir) {
                return +b.dir - +a.dir
            }
            return a.name.localeCompare(b.name)
        })
        dir_tree = path.substring(1).split('/')
    }

    async function check_overwrite(filename: string) {
        for (const entry of cur_direntry) {
            if (!entry.dir && filename === entry.name) {
                return !!(await alert_dialog.open(ALERT_MODE_CONFIRM, 'Overwrite file', `Are you sure you want to overwrite ${filename}?`))
            }
        }
        return true
    }

    function on_add_file() {
        upload_files.click()
    }

    function on_change_dir(ev: CustomEvent) {
        const path: string = ev.detail
        update_direntry(path)
    }

    function on_close() {
        base_dialog.resolve(false)
    }

    function on_create_input(node: HTMLInputElement) {
        filename_input = node
        filename_input.focus()
        filename_input.value = ''
    }

    function on_file_doubleclicked(ev: CustomEvent) {
        const data: DirEntry = ev.detail
        if (data.dir) {
            update_direntry(data.full_path)
        }
        else {
            filename_input.value = data.name
            on_submit()
        }
    }

    function on_input_keydown(ev: KeyboardEvent) {
        if (ev.code === 'Enter') {
            on_submit()
            ev.preventDefault()
        }
    }

    async function on_new_folder() {
        let new_folder_name = await alert_dialog.open(ALERT_MODE_PROMPT, 'New folder', 'Enter new folder name')
        if (new_folder_name) {
            update_direntry(cur_dir + '/' + new_folder_name)
        }
    }

    async function on_submit() {
        if (saving) {
            const filename = filename_input.value.trim()
            if (await check_overwrite(filename)) {
                base_dialog.resolve(filename ? cur_dir + '/' + filename : false)
            }
        }
        else {
            base_dialog.resolve(selected_filename ? cur_dir + '/' + selected_filename : false)
        }
    }

    async function on_upload_files() {
        if (upload_files.files) {
            const files: Record<string, Uint8Array> = {}
            let have_files = false
            for (const file of upload_files.files) {
                if (await check_overwrite(file.name)) {
                    files[cur_dir + '/' + file.name] = await read_uploaded_file(file)
                    have_files = true
                }
            }
            if (have_files) {
                await dir_browser.add_files(files)
            }
        }
        upload_files.value = ''
        // Update the current file list
        update_direntry(cur_dir)
    }
</script>

<style>
    :global(dialog.asyncglk_file_dialog) {
        max-height: 500px !important;
        max-width: 700px !important;
    }

    @media screen and (max-width: 767px) {
        :global(dialog.asyncglk_file_dialog) {
            max-height: none !important;
            max-width: none !important;
        }
    }

    .actions {
        text-align: right;
    }

    .filename {
        display: flex;
    }

    #filename_input {
        flex-grow: 1;
        margin-left: 6px;
    }

    #add_file {
        display: none;
    }
</style>

<BaseDialog
    bind:this={base_dialog}
    extra_class="asyncglk_file_dialog {!saving ? 'selecting' : ''}"
>
    <div class="actions">
        <button on:click={on_add_file}>Add file</button>
        <button on:click={on_new_folder}>New Folder</button>
    </div>
    <DirTree
        dir_tree={dir_tree}
        on:change_dir={on_change_dir}
    />
    {#key cur_filter}
        <FileList bind:this={file_list}
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
            <button class="close" on:click={on_close}>Cancel</button>
            <button class="submit" on:click={on_submit}>{submit_label}</button>
        </div>
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
    </div>
    <input bind:this={upload_files} id="add_file" type="file" multiple on:change={on_upload_files}>
    <AlertDialog bind:this={alert_dialog}></AlertDialog>
</BaseDialog>