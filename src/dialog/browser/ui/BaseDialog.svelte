<script lang="ts">
    import {is_pinch_zoomed} from '../../../common/misc.js'

    let dialog: HTMLDialogElement
    export let extra_class = ''
    /** Whether or not the dialog should use the full viewport in mobile browsers*/
    export let fullscreen = false
    let promise_resolve: (res: string | boolean) => void
    let title = ''

    export async function open(_title: string): Promise<string | boolean> {
        title = _title
        const promise: Promise<string | boolean> = new Promise((resolve) => promise_resolve = resolve)
        dialog.showModal()
        if (fullscreen && visualViewport) {
            visualViewport.addEventListener('resize', on_visualViewport_resize)
        }
        return promise
    }

    export function resolve(val: string | boolean) {
        dialog.close()
        if (fullscreen && visualViewport) {
            visualViewport.removeEventListener('resize', on_visualViewport_resize)
            dialog.style.height = ''
        }
        promise_resolve(val)
    }

    function on_close() {
        resolve(false)
    }

    function on_visualViewport_resize() {
        // Don't do anything if the window is pinch zoomed
        if (is_pinch_zoomed()){
            return
        }

        // The iOS virtual keyboard does not change the layout height, but it does change the viewport
        // Try to account for this by setting the dialog to the viewport height
        dialog.style.height = visualViewport!.height + 'px'
    }
</script>

<style>
    /* A light theme (loosely) based on Material design */
    :global(:root) {
        --asyncglk-ui-bg: #fff;
        --asyncglk-ui-border: #666;
        --asyncglk-ui-fg: #222;
        --asyncglk-ui-selected: #cee0f2;
        --asyncglk-ui-textbox: #fff;
    }

    /* A dark theme (loosely) based on Material design */
    :global([data-theme="dark"]) {
        --asyncglk-ui-bg: #111;
        --asyncglk-ui-border: #666;
        --asyncglk-ui-fg: #ddd;
        --asyncglk-ui-selected: #153351;
        --asyncglk-ui-textbox: #111;
    }

    dialog {
        box-sizing: border-box;
        background: var(--asyncglk-ui-bg);
        border-color: var(--asyncglk-ui-border);
        color: var(--asyncglk-ui-fg);
        font-family: sans-serif;
        height: 100%;
        max-height: 200px;
        max-width: 300px;
        user-select: none;
        width: 100%;
    }

    @media screen and (max-width: 767px) {
        dialog.fullscreen {
            border: none !important;
            margin-top: 0;
            max-height: none !important;
            max-width: none !important;
        }
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

    /* Some styles to be applied to everything in the dialog */
    dialog :global(button), dialog :global(select), dialog :global(textarea) {
        background: var(--asyncglk-ui-bg);
        border: 2px solid var(--asyncglk-ui-border);
        color: var(--asyncglk-ui-fg);
    }

    dialog :global(button.flat) {
        background: none;
        border: 0;
        font-size: inherit;
    }
</style>

<dialog bind:this={dialog}
    class:fullscreen
    class={extra_class}
    on:close={on_close}
>
    <div class="inner">
        <div class="head">
            <h1>{title}</h1>
            <button class="close" aria-label="Close" on:click={on_close}>✖</button>
        </div>
        <slot></slot>
    </div>
</dialog>