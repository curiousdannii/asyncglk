/*

Miscellaneous browser things
============================

Copyright (c) 2026 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

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