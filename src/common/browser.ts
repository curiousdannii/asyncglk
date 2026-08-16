/*

Miscellaneous browser things
============================

Copyright (c) 2026 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import AlertDialog from './ui/AlertDialog.svelte'
import ErrorDialog from './ui/ErrorDialog.svelte'

export const ALERT_MODE_ALERT = 0
export const ALERT_MODE_CONFIRM = 1
export const ALERT_MODE_PROMPT = 2
export type AlertMode = typeof ALERT_MODE_ALERT | typeof ALERT_MODE_CONFIRM | typeof ALERT_MODE_PROMPT

/** Is any input element focused? */
export function is_input_focused() {
    const activeElement_tagName = document.activeElement?.tagName
    return activeElement_tagName === 'INPUT' || activeElement_tagName === 'TEXTAREA'
}

/** Try to detect iOS */
// From https://stackoverflow.com/a/58065241/2854284
export const is_iOS = /iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1)

/** If we can determine that the browser is currently pinch zoomed */
export function is_pinch_zoomed() {
    if (visualViewport) {
        return (visualViewport.scale - 1) > 0.001
    }
    return false
}

export async function show_alert_dialog(title: string, message: string) {
    const alert = new AlertDialog({
        target: document.body,
        props: {
            message,
            mode: ALERT_MODE_ALERT,
            title,
        },
    })
    await alert.open()
    alert.$destroy()
}

export async function show_error_dialog(err: Error) {
    console.error(err)
    const err_dialog = new ErrorDialog({
        target: document.body,
        props: {
            err,
        },
    })
    await err_dialog.open()
    err_dialog.$destroy()
}