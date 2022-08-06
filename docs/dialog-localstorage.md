Dialog storage approaches in localStorage
=========================================

These are descriptions of the various approachs the Dialog library takes to storing files in localStorage. The version number will be stored in a key called `dialog_storage_version`.

Version 0
---------

The original storage approach:

1. Most files are stored as JSON arrays: `[0,1,255,255,...]`.
2. Dialog has a raw mode where files are stored just as text, but this is only used by Emglken which stores files as Latin-1 texts.
3. Autosaves are stored as JSON, with the ram stored as a JSON array. Autosaves don't store when they were modified.

Version 1
---------

In order to store data more efficiently (approximately 7 times more than JSON arrays), this version uses [base32768](https://github.com/qntm/base32768):

1. Files are stored as Uint8Arrays converted to base32768 encoded texts.
2. Autosaves are split into two keys: the main data is first encoded as a UTF-8 Uint8Array, and then encoded as a base32768 text. The ram is encoded directly into a base32768 text and stored with a .ram suffix. Autosaves store when they were modified in a key with a .meta suffix.