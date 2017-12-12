/*

AsyncGlkOte: An async GlkOte class
==================================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

export default class AsyncGlkOte
{
    constructor()
    {
        this.disabled = false
        this.generation = 0
        this.version = '0.1.0'
    }

    error( message )
    {
        throw message
    }

    exit()
    {}

    async init()
    {
        return {
            metrics: this.getMetrics(),
            support: this.getSupport(),
        }
    }

    log( message )
    {
        console.log( message )
    }

    async nextEvent()
    {
        throw new Error( 'Method not implemented: nextEvent' )
    }

    update( data )
    {
        if ( data.type === 'error' )
        {
            this.error( data.message )
        }
        if ( data.type === 'pass' )
        {
            return
        }
        if ( data.type !== 'update' && data.type !== 'exit' )
        {
            this.log( `Ignoring unknown message type: ${ data.type }` )
            return
        }
        if ( data.gen === this.generation )
        {
            this.log( `Ignoring repeated generation number: ${ data.gen }` )
            return
        }
        if ( data.gen < this.generation )
        {
            this.log( `Ignoring out-of-order generation number: got ${ data.gen }, currently at ${ this.generation }` )
            return
        }
        this.generation = data.gen

        if ( this.disabled )
        {
            this._disable( false )
        }

        // Handle the update
        if ( data.input != null )
        {
            this._cancelInputs( data.input )
        }
        if ( data.windows != null )
        {
            this._updateWindows( data.windows )
        }
        if ( data.content != null && data.content.length )
        {
            this._updateContent( data.content )
        }
        if ( data.input != null )
        {
            this._updateInputs( data.input )
        }

        // Disable everything if requested
        this.disabled = false
        if ( data.disabled || data.specialinput )
        {
            this._disable( true )
        }

        if ( data.specialinput != null )
        {
            this._acceptSpecialinput( data.specialinput )
        }

        // Detach all handlers and exit
        if ( data.type === 'exit' )
        {
            this.exit()
        }
    }

    warning( message )
    {
        console.warn( message )
    }

    _acceptSpecialinput()
    {
        throw new Error( 'Method not implemented: _acceptSpecialinput' )
    }

    _cancelInputs()
    {
        throw new Error( 'Method not implemented: _cancelInputs' )
    }

    _disable()
    {
        throw new Error( 'Method not implemented: _disable' )
    }

    _getMetrics()
    {
        return {}
    }

    _getSupport()
    {
        return []
    }

    _updateContent()
    {
        throw new Error( 'Method not implemented: _updateContent' )
    }

    _updateInputs()
    {
        throw new Error( 'Method not implemented: _updateInputs' )
    }

    _updateWindows()
    {
        throw new Error( 'Method not implemented: _updateWindows' )
    }
}