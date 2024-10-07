<script context="module" lang="ts">
    export const ALERT_MODE_ALERT = 0
    export const ALERT_MODE_CONFIRM = 1
    export const ALERT_MODE_PROMPT = 2
    export type AlertMode = typeof ALERT_MODE_ALERT | typeof ALERT_MODE_CONFIRM | typeof ALERT_MODE_PROMPT
</script>

<script lang="ts">
    import BaseDialog from './BaseDialog.svelte'

    let base_dialog: BaseDialog
    export let initial: string | undefined
    export let message: string
    export let mode: AlertMode
    export let title: string
    let val_input: HTMLTextAreaElement

    export function open(): Promise<string | boolean> {
        const promise = base_dialog.open(title)
        if (val_input) {
            val_input.value = initial || ''
            val_input.focus()
        }
        return promise
    }

    function on_cancel() {
        base_dialog.resolve(false)
    }

    function on_create_input(node: HTMLTextAreaElement) {
        val_input = node
        val_input.focus()
        val_input.value = initial || ''
    }

    function on_input_keydown(ev: KeyboardEvent) {
        if (ev.code === 'Enter') {
            on_submit()
            ev.preventDefault()
        }
    }

    function on_submit() {
        if (mode === ALERT_MODE_PROMPT) {
            const val = val_input.value.trim()
            base_dialog.resolve(val || false)
        }
        else {
            base_dialog.resolve(true)
        }
    }
</script>

<style>
    #val_input {
        box-sizing: border-box;
        resize: none;
        width: 100%;
    }
</style>

<BaseDialog bind:this={base_dialog}>
    <p>{message}</p>
    <div>
        {#if mode === ALERT_MODE_PROMPT}
            <textarea id="val_input" autocapitalize="off" rows="1" on:keydown={on_input_keydown} use:on_create_input></textarea>
        {/if}
    </div>
    <div class="foot uirow">
        <div>
            {#if mode !== ALERT_MODE_ALERT}
                <button class="close" on:click={on_cancel}>Cancel</button>
            {/if}
            <button class="submit" on:click={on_submit}>Ok</button>
        </div>
    </div>
</BaseDialog>