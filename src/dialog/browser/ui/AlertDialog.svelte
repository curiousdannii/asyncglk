<script context="module" lang="ts">
    export const enum AlertMode {
        ALERT = 0,
        CONFIRM = 1,
        PROMPT = 2,
    }
</script>

<script lang="ts">
    import BaseDialog from './BaseDialog.svelte'

    let base_dialog: BaseDialog
    let message: string
    let mode: AlertMode
    let val_input: HTMLInputElement

    export function open(_mode: AlertMode, title: string, _message: string): Promise<string | boolean> {
        message = _message
        mode = _mode
        const promise = base_dialog.open(title)
        if (val_input) {
            val_input.value = ''
            val_input.focus()
        }
        return promise
    }

    function on_cancel() {
        base_dialog.resolve(false)
    }

    function on_create_input(node: HTMLInputElement) {
        val_input = node
        val_input.focus()
        val_input.value = ''
    }

    function on_input_keydown(ev: KeyboardEvent) {
        if (ev.code === 'Enter') {
            on_submit()
            ev.preventDefault()
        }
    }

    function on_submit() {
        if (mode === AlertMode.PROMPT) {
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
        width: 100%;
    }
</style>

<BaseDialog bind:this={base_dialog}>
    <p>{message}</p>
    <div>
        {#if mode === AlertMode.PROMPT}
            <input id="val_input" on:keydown={on_input_keydown} use:on_create_input>
        {/if}
    </div>
    <div class="foot">
        <div>
            {#if mode !== AlertMode.ALERT}
                <button class="close" on:click={on_cancel}>Cancel</button>
            {/if}
            <button class="submit" on:click={on_submit}>Ok</button>
        </div>
    </div>
</BaseDialog>