#!/usr/bin/env node

// Run a Quixe instance

import fs from 'fs'
import minimist from 'minimist'
import {GiDispa, GiLoad, Quixe} from './quixe-core.js'

import {AsyncGlk, Blorb, CheapGlkOte, CheapStreamingDialog, is_blorb, RemGlk} from '../dist/index-node.js'

const argv = minimist(process.argv.slice(2))
const storyfile = argv._[0]
const GlkOteClass = argv.rem ? RemGlk : CheapGlkOte

const Dialog = new CheapStreamingDialog()
const Glk = new AsyncGlk()
const GlkOte = new GlkOteClass()
await new Promise(resolve => Dialog.init_async({GlkOte}, resolve))

const options = {
    Dialog,
    GiDispa: new GiDispa(),
    GiLoad: GiLoad,
    GlkOte,
    io: Glk,
    vm: Quixe,
}

// Little hack because Quixe assumes window exists
global.window = {}

let data = fs.readFileSync(storyfile)
if (is_blorb(data)) {
    options.Blorb = new Blorb(data)
    data = options.Blorb.get_exec_data()
}

Quixe.init(Array.from(data), options)
Glk.init(options)