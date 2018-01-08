/*

DialogTerm: A Node.js terminal Dialog class
==================================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import DialogNode from './dialognode.mjs'

export default class DialogTerm extends DialogNode
{
    constructor( options )
    {
        super( options )

        this.rl = options.rl
        //this.stdin = options.stdin
        this.stdout = options.stdout
    }

    async open( tosave, usage /*, gameid */ )
    {
        return new Promise( ( resolve /*, reject */ ) =>
        {
            this.stdout.write( '\n' )
            this.rl.question( 'Please enter a file name (without an extension): ', ( path ) =>
            {
                if ( !path )
                {
                    resolve( null )
                }
                else
                {
                    resolve({
                        filename: path + '.' +  this.filters_for_usage( usage )[0].extensions[0],
                        usage: usage,
                    })
                }
            })
        })
    }
}