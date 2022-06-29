#!/usr/bin/env node

// Run a ZVM instance

import fs from 'fs'
import GlkOteTerm from 'glkote-term'
import minimist from 'minimist'
import ZVM from 'ifvms'

import {CheapStreamingDialog} from '../dist/dialog/node/cheap.js'
import CheapGlkOte from '../dist/glkote/cheap/cheap.js'
import RemGlk from '../dist/glkote/remglk/remglk.js'

const argv = minimist(process.argv.slice(2))
const storyfile = argv._[0]
const GlkOte = argv.rem ? RemGlk : CheapGlkOte

const vm = new ZVM.ZVM()

const options = {
    vm: vm,
    Dialog: new CheapStreamingDialog(),
    Glk: GlkOteTerm.Glk,
    GlkOte: new GlkOte(),
}

vm.prepare(fs.readFileSync(storyfile), options)

// This will call vm.init()
GlkOteTerm.Glk.init(options)