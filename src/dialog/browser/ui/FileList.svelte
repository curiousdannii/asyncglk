<script lang="ts">
    import type {DirEntry} from '../interface.js'

    import FileListItem from './FileListItem.svelte'

    const file_elems: FileListItem[] = []
    export let files: DirEntry[]
    export let filter: string
    export let selected_filename: string | undefined
    let selected_item: DirEntry | undefined

    export function clear() {
        selected_filename = undefined
        selected_item = undefined
    }

    function filter_file(file: DirEntry): boolean {
        const filters = filter.split(',')
        if (file.dir || filter === '*') {
            return true
        }
        for (const ext of filters) {
            if (file.name.endsWith(ext)) {
                return true
            }
        }
        return false
    }

    function on_file_selected(ev: CustomEvent) {
        selected_item = ev.detail
        if (selected_item && !selected_item.dir) {
            selected_filename = selected_item.name
        }
    }
</script>

<style>
    #filelist {
        border: 2px solid var(--asyncglk-ui-border);
        flex: 1;
        overflow-y: scroll;
        padding: 6px;
    }
</style>

<div id="filelist" role="listbox">
    {#each files as file, i}
        {#if filter_file(file)}
            <FileListItem bind:this={file_elems[i]}
                data={file}
                selected={file.full_path === selected_item?.full_path}
                on:file_delete
                on:file_doubleclicked
                on:file_download
                on:file_selected={on_file_selected}
            />
        {/if}
    {/each}
</div>