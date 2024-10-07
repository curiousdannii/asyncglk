<script lang="ts">
    // Icons from Heroicons: https://heroicons.com/outline

    import {createEventDispatcher} from 'svelte'

    import type {DirEntry} from '../interface.js'

    const dispatch = createEventDispatcher()

    export let data: DirEntry
    export let selected: boolean
    export let selected_file: DirEntry | undefined

    /*function file_icon(filename: string) {
        if (filename.endsWith('.glksave') || filename.endsWith('.sav')) {
            return '🖫'
        }
        else if (filename.endsWith('.txt')) {
            return '🗎'
        }
        return '🗋'
    }*/

    const on_click = () => {
        selected_file = data
    }

    const on_delete = () => {
        dispatch('file_delete', data)
    }

    const on_doubleclick = () => {
        dispatch('file_doubleclicked', data)
    }

    const on_download = () => {
        dispatch('file_download', data)
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

    const on_rename = () => {
        dispatch('file_rename', data)
    }
</script>

<style>
    div.filelistitem.selected {
        background: var(--asyncglk-ui-selected);
        padding-bottom: 2px;
    }

    div.filelistitem button.flat {
        display: flex;
        padding: 0;
        width: 100%;
    }

    .icon svg {
        display: block;
    }

    .name {
        flex: 1;
        padding: 3px 0 3px 8px;
        text-align: left;
    }

    .actions, .date {
        padding: 2px 20px;
    }
</style>

<div
    class="filelistitem"
    class:selected
>
    <button
        aria-selected="{selected}"
        class="flat"
        on:click={on_click}
        on:dblclick|preventDefault|stopPropagation={on_doubleclick}
        on:keydown={on_keydown}
        role="option"
    >
        <div class="icon" aria-hidden="true">
            {#if data.dir}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="20px" width="20px" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
            {:else if data.name.endsWith('.glksave') || data.name.endsWith('.sav')}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="20px" width="20px" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" />
                </svg>
            {:else if data.name.endsWith('.txt')}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="20px" width="20px" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
            {:else}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="20px" width="20px" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
            {/if}
        </div>
        <div class="name">{data.name}</div>
    </button>
    {#if selected}
        {#if !data.dir && data.meta}
            <div class="date">Last modified: {(new Date(data.meta.mtime)).toDateString()}</div>
        {/if}
        <div class="actions">
            {#if !data.dir}
                <button on:click={on_download}>Download</button>
            {/if}
            <button on:click={on_rename}>Rename</button>
            <button on:click={on_delete}>Delete</button>
        </div>
    {/if}
</div>