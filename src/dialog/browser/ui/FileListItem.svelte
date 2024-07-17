<script lang="ts">
    import {createEventDispatcher} from 'svelte'

    import type {DirEntry} from "../interface.js"

    const dispatch = createEventDispatcher()

    export let data: DirEntry
    export let file_index: number
    export let selected: boolean = false

    function file_icon(filename: string) {
        if (filename.endsWith('.glksave') || filename.endsWith('.sav')) {
            return '🖫'
        }
        else if (filename.endsWith('.txt')) {
            return '🗎'
        }
        return '🗋'
    }

    const on_doubleclick = () => {
        dispatch('file_doubleclicked', data)
    }
    const on_select_file = () => {
        if (!data.dir) {
            dispatch('file_selected', file_index)
            selected = true
        }
    }
</script>

<style>
    button {
        display: flex;
        width: 100%;
    }

    :global(.selecting) button.selected {
        background: #cee0f2;
    }

    .name {
        flex: 1;
        text-align: left;
    }
</style>

<button
    aria-selected="{selected}"
    class="flat"
    class:selected
    on:click={on_select_file}
    on:dblclick|preventDefault|stopPropagation ={on_doubleclick}
    role="option"
>
    <div class="icon" aria-hidden="true">{data.dir ? '📁' : file_icon(data.name)}</div>
    <div class="name">{data.name}</div>
</button>