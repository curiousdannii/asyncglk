/*

File reference functions
========================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as Const from './const.mjs'

const FileTypeMap = {
    0: 'data',
    1: 'save',
    2: 'transcript',
    3: 'command',
}

// TODO: Is this actually useful vs a plain object?
class FileRef
{
    constructor( filename, usage, rock, ref )
    {
        this.filename = filename
        this.ref = ref
        this.rock = rock
        this.usage = usage
    }
}

const FrefAPI = Base => class extends Base
{
    constructor()
    {
        super()

        // Beginning of the FileRef linked list
        this.filereflist = null
    }

    async glk_fileref_create_by_prompt( usage, fmode, rock )
    {
        // Issue a Glk update, and fake a return message
        this.Glk.update()
        this.accept({ gen: this.GlkOte.generation })

        const filetype = ( usage & Const.fileusage_TypeMask )
        const filetypename = FileTypeMap[filetype] || 'xxx'
        const ref = await this.Dialog.open( fmode !== Const.filemode_Read, filetypename, this.vm.get_signature() )

        if ( ref )
        {
            return this._new_fileref( ref.filename, usage, rock, ref )
        }
        return null
    }

    glk_fileref_get_rock( fref )
    {
        if ( !fref )
        {
            throw new Error( 'glk_fileref_get_rock: invalid fileref' )
        }
        return fref.rock
    }

    glk_fileref_iterate( fref, rockref )
    {
        fref = fref ? fref.next : this.filereflist

        if ( rockref )
        {
            rockref.set_value( fref ? fref.rock : 0 )
        }
        return fref || null
    }

    _new_fileref( filename, usage, rock, ref )
    {
        if ( !ref )
        {
            const filetype = ( usage & Const.fileusage_TypeMask )
            const filetypename = FileTypeMap[filetype] || 'xxx'
            ref = this.Dialog.file_construct_ref( filename, filetypename, this.vm.get_signature() )
        }

        const fref = new FileRef( filename, usage, rock, ref )

        fref.prev = null
        fref.next = this.filereflist
        this.filereflist = fref
        if ( fref.next )
        {
            fref.next.prev = fref
        }

        if ( this.GiDispa )
        {
            this.GiDispa.class_register( 'fileref', fref )
        }

        return fref
    }
}

export default FrefAPI