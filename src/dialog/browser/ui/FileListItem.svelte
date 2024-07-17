<script lang="ts">
    import {createEventDispatcher} from 'svelte'

    import type {DirEntry} from "../interface.js"

    const dispatch = createEventDispatcher()

    export let data: DirEntry
    export let file_index: number
    export let selected: boolean = false
    //export let selecting: boolean

    const select_file = (event: MouseEvent) => {
        const target = (event.target as HTMLElement)
        dispatch('file_selected', file_index)
        selected = true
    }
</script>

<style>
    button {
        background: none;
        border: 0;
        display: block;
        font-size: inherit;
        width: 100%;
    }

    :global(.selecting) button.selected {
        background: #cee0f2;
    }
</style>

<button
    aria-selected="{selected}"
    class:selected
    data-fullpath={data.full_path}
    on:click={select_file}
    role="option"
>{data.name}</button>