#!/usr/bin/env node

// Run a ZVM instance

import fs from 'fs'
import minimist from 'minimist'
import ZVM from 'ifvms'

import {AsyncGlk, CheapGlkOte, CheapStreamingDialog, RemGlk} from '../dist/index-node.js'

const argv = minimist(process.argv.slice(2))
const storyfile = argv._[0]
const GlkOteClass = argv.rem ? RemGlk : CheapGlkOte

const Dialog = new CheapStreamingDialog()
const Glk = new AsyncGlk()
const GlkOte = new GlkOteClass()
await new Promise(resolve => Dialog.init_async({GlkOte}, resolve))
const vm = new ZVM.ZVM()

const options = {
    Dialog,
    Glk,
    GlkOte,
    vm,
}

vm.prepare(fs.readFileSync(storyfile), options)

// This will call vm.init()
Glk.init(options)