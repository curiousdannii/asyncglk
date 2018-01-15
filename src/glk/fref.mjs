/*

File reference functions
========================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

// TODO: Cleanup temp filerefs?

import * as Const from './const.mjs'

const FileTypeMap = {
    0: 'data',
    1: 'save',
    2: 'transcript',
    3: 'command',
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

        // If fmode is Read, then ensure the file exists
        if ( !ref || ( fmode === Const.filemode_Read && !( await this.Dialog.file_ref_exists( ref ) ) ) )
        {
            return null
        }
        return this._new_fileref( ref.filename, usage, rock, ref )
    }

    glk_fileref_create_by_name( usage, filename, rock )
    {
        // Filenames that do not come from the user must be cleaned up.
        filename = this.Dialog.file_clean_fixed_name( filename, ( usage & Const.fileusage_TypeMask ) )

        return this._new_fileref( filename, usage, rock, null )
    }

    glk_fileref_create_from_fileref( usage, oldfref, rock )
    {
        if ( !oldfref )
        {
            throw new Error( 'glk_fileref_create_from_fileref: invalid fileref' )
        }

        return this._new_fileref( oldfref.filename, usage, rock, null )
    }

    glk_fileref_create_temp( usage, rock )
    {
        const ref = this.Dialog.file_construct_temp_ref( FileTypeMap[( usage & Const.fileusage_TypeMask )] )
        return this._new_fileref( ref.filename, usage, rock, ref )
    }

    async glk_fileref_delete_file( fref )
    {
        if ( !fref )
        {
            throw new Error( 'glk_fileref_delete_file: invalid fileref' )
        }
        await this.Dialog.file_remove_ref( fref.ref )
    }

    glk_fileref_destroy( fref )
    {
        if ( !fref )
        {
            throw new Error( 'glk_fileref_destroy: invalid fileref' )
        }

        if ( this.GiDispa )
        {
            this.GiDispa.class_unregister( 'fileref', fref )
        }

        const prev = fref.prev
        const next = fref.next
        fref.prev = null
        fref.next = null

        if ( prev )
        {
            prev.next = next
        }
        else
        {
            this.filereflist = next
        }
        if ( next )
        {
            next.prev = prev
        }

        fref.filename = null
        fref.ref = null
        fref.rock = null
        fref.disprock = null
    }

    async glk_fileref_does_file_exist( fref )
    {
        if ( !fref )
        {
            throw new Error( 'glk_fileref_does_file_exist: invalid fileref' )
        }
        return ( await this.Dialog.file_ref_exists( fref.ref ) ) ? 1 : 0
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

        const fref = {
            filename,
            ref,
            rock,
            usage,
        }

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