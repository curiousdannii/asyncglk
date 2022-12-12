/*

Glk FileRefs
============

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import {FileRef as DialogFileRef} from '../common/protocol.js'
import {Dialog} from '../dialog/common/interface.js'

import {filemode_Read, filemode_Write, fileusage_TextMode, seekmode_End, seekmode_Start} from './constants.js'
import {GlkFref} from './interface.js'

export class FileRef implements GlkFref {
    binary: boolean
    private Dialog: Dialog
    disprock?: number
    filename: string
    next: FileRef | null = null
    prev: FileRef | null = null
    private dfref: DialogFileRef
    rock: number

    constructor(Dialog: Dialog, filename: string, dialog_fref: DialogFileRef, rock: number, usage: number) {
        this.binary = !(usage & fileusage_TextMode)
        this.Dialog = Dialog
        this.filename = filename
        this.dfref = dialog_fref
        this.rock = rock
    }

    delete_file() {
        this.Dialog.file_remove_ref(this.dfref)
    }

    exists(): boolean {
        return this.Dialog.file_ref_exists(this.dfref)
    }

    read(): Uint8Array | null {
        if (this.Dialog.streaming) {
            const fstream = this.Dialog.file_fopen(filemode_Read, this.dfref)
            if (!fstream) {
                return null
            }
            fstream.fseek(0, seekmode_End)
            const length = fstream.ftell()
            const buf = new Uint8Array(length)
            fstream.fseek(0, seekmode_Start)
            fstream.fread(buf)
            fstream.fclose()
            return buf
        }
        else {
            return this.Dialog.file_read(this.dfref)
        }
    }

    write(data: Uint8Array) {
        if (this.Dialog.streaming) {
            const fstream = this.Dialog.file_fopen(filemode_Write, this.dfref)!
            fstream.fwrite(data)
            fstream.fclose()
        }
        else {
            this.Dialog.file_write(this.dfref, data)
        }
    }
}