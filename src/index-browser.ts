/*

AsyncGlk exports
================

Copyright (c) 2026 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

export * from './index-common.js'

export {is_input_focused, is_iOS, is_pinch_zoomed, show_alert_dialog, show_error_dialog} from './common/browser.js'

export {fetch_resource, parse_base64, process_resource, read_response, read_uploaded_file} from './common/file/browser.js'

export {ProviderBasedBrowserDialog} from './dialog/browser/browser.js'

export {default as WebGlkOte} from './glkote/web/web.js'