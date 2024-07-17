<script lang="ts">
    import {createEventDispatcher} from 'svelte'

    const dispatch = createEventDispatcher()

    export let dir_tree: string[]

    const on_click = (ev: MouseEvent) => {
        const target = ev.target as HTMLButtonElement
        dispatch('change_dir', target.dataset.path)
    }
</script>

<style>
    button {
        padding: 0;
    }

    span.slash {
        padding: 0 5px;
    }
</style>

<div>
    {#each dir_tree as dir, i}
        {#if i !== 0}
            <span class="slash">&nbsp;/&nbsp;</span>
        {/if}
        {#if dir_tree[i + 1]}
            <span><button
                class="flat"
                data-path={'/' + dir_tree.slice(0, i + 1).join('/')}
                on:click={on_click}
            >{dir === 'usr' ? 'My files' : dir}</button></span>
        {:else}
            <span>{dir === 'usr' ? 'My files' : dir}</span>
        {/if}
    {/each}
</div>