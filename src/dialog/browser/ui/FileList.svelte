<script lang="ts">
    import type {DirEntry} from "../interface.js"

    import FileListItem from './FileListItem.svelte'

    export let chosen_fullpath: string | undefined
    let file_elems: FileListItem[] = []
    export let files: DirEntry[]
    export let selected_filename: string | undefined
    let selected_item: FileListItem | undefined

    export function clear() {
        if (selected_item) {
            selected_item.$set({selected: false})
        }
        chosen_fullpath = undefined
        selected_filename = undefined
        selected_item = undefined
    }

    function on_file_selected(ev: CustomEvent) {
        const file_metadata = files[ev.detail]
        const new_item = file_elems[ev.detail]
        if (selected_item && selected_item !== new_item) {
            selected_item.$set({selected: false})
        }
        if (!file_metadata.dir) {
            chosen_fullpath = file_metadata.full_path
            selected_filename = file_metadata.name
            selected_item = new_item
        }
    }
</script>

<style>
    div {
        flex: 1;
        overflow-y: scroll;
    }
</style>

<div role="listbox">
    {#each files as file, i}
        <FileListItem bind:this={file_elems[i]}
            data={file}
            file_index={i}
            on:file_doubleclicked
            on:file_selected={on_file_selected}
        />
    {/each}
</div>