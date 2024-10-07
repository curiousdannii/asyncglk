<script lang="ts">
    import {createEventDispatcher} from 'svelte'

    import type {DirEntry} from '../interface.js'

    const dispatch = createEventDispatcher()

    export let data: DirEntry
    export let selected: boolean

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
        dispatch('file_selected', data)
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
</script>

<style>
    div.filelistitem.selected {
        background: var(--asyncglk-ui-selected);
        padding-bottom: 2px;
    }

    div.filelistitem button.flat {
        display: flex;
        padding: 3px 0;
        width: 100%;
    }

    .name {
        flex: 1;
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
        <!--<div class="icon" aria-hidden="true">{data.dir ? '📁' : file_icon(data.name)}</div>-->
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
            <button>Rename</button>
            <button on:click={on_delete}>Delete</button>
        </div>
    {/if}
</div>