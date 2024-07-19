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

    function on_keydown(ev: KeyboardEvent) {
        if (ev.code === 'ArrowDown') {
            const next = (ev.target as HTMLElement).nextElementSibling as HTMLElement | null
            if (next) {
                next.click()
                next.focus()
            }
        }
        if (ev.code === 'ArrowUp') {
            const prev = (ev.target as HTMLElement).previousElementSibling as HTMLElement | null
            if (prev) {
                prev.click()
                prev.focus()
            }
        }
        if (ev.code === 'Enter') {
            dispatch('file_doubleclicked', data)
            ev.preventDefault()
        }
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
    on:dblclick|preventDefault|stopPropagation={on_doubleclick}
    on:keydown={on_keydown}
    role="option"
>
    <div class="icon" aria-hidden="true">{data.dir ? '📁' : file_icon(data.name)}</div>
    <div class="name">{data.name}</div>
</button>