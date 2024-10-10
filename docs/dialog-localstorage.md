Dialog storage approaches in localStorage
=========================================

These are descriptions of the various approachs the Dialog library takes to storing files in localStorage. The version number will be stored in a key called `dialog_storage_version`.

Version 0
---------

The original storage approach:

1. Files are stored with two keys, a `content:` key, and `dirent:` key. The keys for both then have three parts, separated by a `:`: the first stores the file type, with `data`, `save`, and `transcript` being conventional. The second part is optional and stores a unique ID for each game, usually taken from the header. The third part is the filename.
2. The content of most files is a JSON arrays: `[0,1,255,255,...]`. But there is also a raw mode where files are stored just as text, but this is only used by Emglken which stores files as Latin-1 texts.
3. The `dirent:` keys store timestamps as `created:#,modified:#`. Note that there are no spaces.
3. Autosaves are stored as JSON, with the ram stored as a JSON array. Autosaves don't store when they were modified.

Version 1
---------

In order to store data more efficiently (approximately 7 times more than JSON arrays), this version uses [base32768](https://github.com/qntm/base32768):

1. Files are stored as Uint8Arrays converted to base32768 encoded texts.
2. Autosaves are split into two keys: the main data is first encoded as a UTF-8 Uint8Array, and then encoded as a base32768 text. The ram is encoded directly into a base32768 text and stored with a .ram suffix. Autosaves store when they were modified in a key with a .meta suffix.

Version 2
---------

For the async Dialog model, files are now stored with a path, as if they were stored in a real file system. So a file might be saved to `/usr/advent/xyzzy.glksave`. This path is the key, and the data is as for version 1, a Uint8Array converted to a base32768 encoded text. All the metadata is stored as JSON in a single `dialog_metadata` key, where the keys are the paths, and the values are objects containing `atime` and `mtime` keys, for the accessed and modified timestamps. (The created timestamp from version 0-1 is not kept when updating to version 2.)

Autosaves are purged when updating to version 2 as old autosaves are not supported.