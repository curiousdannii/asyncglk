/*

GlkApi
======

Copyright (c) 2022 Dannii Willis
MIT licenced
https://github.com/curiousdannii/asyncglk

*/

import * as Interface from './interface.js'

export class RefBox implements Interface.RefBox {
    private value = 0
    get_value() {
        return this.value
    }
    set_value(val: number) {
        this.value = val
    }
}

type RefStructValue = Interface.RefStructValue
export class RefStruct implements Interface.RefStruct {
    private fields: RefStructValue[] = []
    get_field(index: number): RefStructValue {
        return this.fields[index]
    }
    get_fields(): RefStructValue[] {
        return this.fields
    }
    push_field(val: RefStructValue) {
        this.fields.push(val)
    }
    set_field(index: number, val: RefStructValue) {
        this.fields[index] = val
    }
}