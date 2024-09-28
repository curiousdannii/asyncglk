<script lang="ts">
    let dialog: HTMLDialogElement
    export let extra_class = ''
    export let max_height = '200px'
    export let max_width = '300px'
    let promise_resolve: (res: string | boolean) => void
    let title = ''

    export async function open(_title: string): Promise<string | boolean> {
        title = _title
        const promise: Promise<string | boolean> = new Promise((resolve) => promise_resolve = resolve)
        dialog.showModal()
        return promise
    }

    export function resolve(val: string | boolean) {
        dialog.close()
        promise_resolve(val)
    }

    function on_close() {
        resolve(false)
    }
</script>

<style>
    dialog {
        box-sizing: border-box;
        font-family: sans-serif;
        height: 100%;
        user-select: none;
        width: 100%;
    }

    dialog::backdrop {
        background: linear-gradient(rgba(64, 64, 64, 25%), rgba(64, 64, 64, 40%));
    }

    .inner {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
    }

    .inner > :global(div) {
        padding: 5px 0;
    }

    .head h1 {
        margin: 0;
    }

    .head .close {
        background: none;
        border: none;
        padding: 10px;
        position: absolute;
        right: 10px;
        top: 10px;
    }
</style>

<dialog bind:this={dialog}
    class={extra_class}
    on:close={on_close}
    style="max-height: {max_height}; max-width: {max_width}"
>
    <div class="inner">
        <div class="head">
            <h1>{title}</h1>
            <button class="close" aria-label="Close" on:click={on_close}>✖</button>
        </div>
        <slot></slot>
    </div>
</dialog>