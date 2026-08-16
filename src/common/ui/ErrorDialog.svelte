<script lang="ts">
    import BaseDialog from './BaseDialog.svelte'

    let base_dialog: BaseDialog
    export let err: Error

    export function open(): Promise<string | boolean> {
        return base_dialog.open('Error: ' + err.name)
    }

    function on_submit() {
        base_dialog.resolve(true)
    }
</script>

<style>
    #stack {
        font-family: var(--asyncglk-ui-mono-family);
        overflow: scroll;
        white-space: pre;
    }
</style>

<BaseDialog bind:this={base_dialog}>
    <p>{err.message}</p>
    {#if err.stack}
        <details>
            <summary>Stack trace</summary>
            <div id="stack">{err.stack}</div>
        </details>
    {/if}
    <div class="foot uirow">
        <div>
            <!-- svelte-ignore a11y-autofocus -->
            <button class="submit" on:click={on_submit} autofocus>Ok</button>
        </div>
    </div>
</BaseDialog>