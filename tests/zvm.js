#!/usr/bin/env node

// Run a ZVM instance

'use strict'

import fs from 'fs'
import readline from 'readline'
import minimist from 'minimist'
import MuteStream  from 'mute-stream'
import ZVM from 'ifvms'

import CheapGlkOte from '../dist/glkote/cheap/cheap.js'
import GlkApi from '../dist/glkapi.js'
import RemGlk from '../dist/glkote/remglk/remglk.js'

const argv = minimist(process.argv.slice(2))
const storyfile = argv._[0]
const GlkOte = argv.rem ? RemGlk : CheapGlkOte

// Readline options
const stdin = process.stdin
const stdout = new MuteStream()
stdout.pipe(process.stdout)
const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    prompt: '',
})
const rl_opts = {
    rl: rl,
    stdin: stdin,
    stdout: stdout,
}

const vm = new ZVM.ZVM()

const options = {
    vm: vm,
    //Dialog: new GlkOteLib.DumbGlkOte.Dialog(rl_opts),
    Dialog: {},
    Glk: GlkApi,
    GlkOte: new GlkOte(rl_opts),
}

vm.prepare(fs.readFileSync(storyfile), options)

// This will call vm.init()
GlkApi.init(options)