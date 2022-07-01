#!/usr/bin/env node

// Run a ZVM instance

import fs from 'fs'
import GlkOteTerm from 'glkote-term'
import minimist from 'minimist'
import ZVM from 'ifvms'

import {CheapGlkOte, CheapStreamingDialog, RemGlk} from '../dist/index-node.js'

const argv = minimist(process.argv.slice(2))
const storyfile = argv._[0]
const GlkOte = argv.rem ? RemGlk : CheapGlkOte

const glkote = new GlkOte()
const dialog = new CheapStreamingDialog()
await new Promise(resolve => dialog.init_async({Glkote: glkote}, resolve))
const vm = new ZVM.ZVM()

const options = {
    vm: vm,
    Dialog: dialog,
    Glk: GlkOteTerm.Glk,
    GlkOte: glkote,
}

vm.prepare(fs.readFileSync(storyfile), options)

// This will call vm.init()
GlkOteTerm.Glk.init(options)