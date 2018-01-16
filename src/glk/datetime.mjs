/*

Date/Time functions
===================

Copyright (c) 2018 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

const DateTimeAPI = Base => class extends Base
{
    glk_current_simple_time( factor )
    {
        const now = new Date().getTime()
        return Math.floor( now / ( factor * 1000 ) )
    }

    glk_current_time( timevalref )
    {
        const now = new Date().getTime()
        let usec = Math.floor( ( now % 1000 ) * 1000 )
        if ( usec < 0 )
        {
            usec += 1000000
        }
        timevalref.set_field( 0, Math.floor( now / 4294967296000 ) )
        timevalref.set_field( 1, Math.floor( now / 1000 ) >>> 0 )
        timevalref.set_field( 2, usec )
    }

    glk_date_to_simple_time_local( dateref, factor )
    {
        const d = new Date(
            dateref.get_field( 0 ),
            dateref.get_field( 1 ) - 1,
            dateref.get_field( 2 ),
            dateref.get_field( 4 ),
            dateref.get_field( 5 ),
            dateref.get_field( 6 ),
            dateref.get_field( 7 ) / 1000 )
        const now = d.getTime()
        return Math.floor( now / ( factor * 1000 ) )
    }

    glk_date_to_simple_time_utc( dateref, factor )
    {
        const d = new Date( 0 )
        d.setUTCFullYear( dateref.get_field( 0 ) )
        d.setUTCMonth( dateref.get_field( 1 ) - 1 )
        d.setUTCDate( dateref.get_field( 2 ) )
        d.setUTCHours( dateref.get_field( 4 ) )
        d.setUTCMinutes( dateref.get_field( 5 ) )
        d.setUTCSeconds( dateref.get_field( 6 ) )
        d.setUTCMilliseconds( dateref.get_field( 7 ) / 1000 )
        const now = d.getTime()
        return Math.floor( now / ( factor * 1000 ) )
    }

    glk_date_to_time_local( dateref, timevalref )
    {
        const d = new Date(
            dateref.get_field( 0 ),
            dateref.get_field( 1 ) - 1,
            dateref.get_field( 2 ),
            dateref.get_field( 4 ),
            dateref.get_field( 5 ),
            dateref.get_field( 6 ),
            dateref.get_field( 7 ) / 1000 )
        const now = d.getTime()
        let usec = Math.floor( ( now % 1000 ) * 1000 )
        if ( usec < 0 )
        {
            usec += 1000000
        }
        timevalref.set_field( 0, Math.floor( now / 4294967296000 ) )
        timevalref.set_field( 1, Math.floor( now / 1000 ) >>> 0 )
        timevalref.set_field( 2, usec )
    }

    glk_date_to_time_utc( dateref, timevalref )
    {
        const d = new Date( 0 )
        d.setUTCFullYear( dateref.get_field( 0 ) )
        d.setUTCMonth( dateref.get_field( 1 ) - 1 )
        d.setUTCDate( dateref.get_field( 2 ) )
        d.setUTCHours( dateref.get_field( 4 ) )
        d.setUTCMinutes( dateref.get_field( 5 ) )
        d.setUTCSeconds( dateref.get_field( 6 ) )
        d.setUTCMilliseconds( dateref.get_field( 7 ) / 1000 )
        const now = d.getTime()
        let usec = Math.floor( ( now % 1000 ) * 1000 )
        if ( usec < 0 )
        {
            usec += 1000000
        }
        timevalref.set_field( 0, Math.floor( now / 4294967296000 ) )
        timevalref.set_field( 1, Math.floor( now / 1000 ) >>> 0 )
        timevalref.set_field( 2, usec )
    }

    glk_time_to_date_local( timevalref, dateref )
    {
        const now = timevalref.get_field( 0 ) * 4294967296000 +
            timevalref.get_field( 1 ) * 1000 +
            timevalref.get_field( 2 ) / 1000
        const d = new Date( now )
        dateref.set_field( 0, d.getFullYear() )
        dateref.set_field( 1, d.getMonth() + 1 )
        dateref.set_field( 2, d.getDate() )
        dateref.set_field( 3, d.getDay() )
        dateref.set_field( 4, d.getHours() )
        dateref.set_field( 5, d.getMinutes() )
        dateref.set_field( 6, d.getSeconds() )
        dateref.set_field( 7, d.getMilliseconds() * 1000 )
    }

    glk_time_to_date_utc( timevalref, dateref )
    {
        const now = timevalref.get_field( 0 ) * 4294967296000 +
            timevalref.get_field( 1 ) * 1000 +
            timevalref.get_field( 2 ) / 1000
        const d = new Date( now )
        dateref.set_field( 0, d.getUTCFullYear() )
        dateref.set_field( 1, d.getUTCMonth() + 1 )
        dateref.set_field( 2, d.getUTCDate() )
        dateref.set_field( 3, d.getUTCDay() )
        dateref.set_field( 4, d.getUTCHours() )
        dateref.set_field( 5, d.getUTCMinutes() )
        dateref.set_field( 6, d.getUTCSeconds() )
        dateref.set_field( 7, d.getUTCMilliseconds() * 1000 )
    }
}

export default DateTimeAPI