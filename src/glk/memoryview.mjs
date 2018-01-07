/*

MemoryView: an enhanced DataView
================================

Copyright (c) 2017 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

// Accepts an ArrayBuffer, typed array, or a length number
export default function MemoryView( buffer, byteOffset, byteLength )
{
    if ( typeof buffer === 'number' )
    {
        buffer = new ArrayBuffer( buffer )
    }
    // Typed arrays
    if ( buffer.buffer )
    {
        buffer = buffer.buffer
    }

    return Object.assign( new DataView( buffer, byteOffset, byteLength ), {
        getUint8Array: function( start, length )
        {
            return new Uint8Array( this.buffer, start, length )
        },
        getUint32Array: function( start, length )
        {
            return new Uint8Array( this.buffer, start, length )
        },
        setUint8Array: function( start, data )
        {
            if ( data instanceof ArrayBuffer )
            {
                data = new Uint8Array( data )
            }
            ( new Uint8Array( this.buffer ) ).set( data, start )
        },
    })
}