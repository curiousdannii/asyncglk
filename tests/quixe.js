#!/usr/bin/env node

// Run a Quixe instance

import fs from 'fs'
import minimist from 'minimist'
import {GiDispa, GiLoad, Quixe} from './quixe-core.js'

import {AsyncGlk, CheapGlkOte, CheapStreamingDialog, RemGlk} from '../dist/index-node.js'

const argv = minimist(process.argv.slice(2))
const storyfile = argv._[0]
const GlkOteClass = argv.rem ? RemGlk : CheapGlkOte

const Dialog = new CheapStreamingDialog()
const Glk = new AsyncGlk()
const GlkOte = new GlkOteClass()
await new Promise(resolve => Dialog.init_async({GlkOte}, resolve))

const options = {
    blorb_gamechunk_type: 'GLUL',
    Dialog,
    GiDispa: new GiDispa(),
    GiLoad: GiLoad,
    GlkOte,
    image_info_map: 'StaticImageInfo',
    io: Glk,
    vm: Quixe,
}

// Little hack because Quixe assumes window exists
global.window = {}

Quixe.init(Array.from(fs.readFileSync(storyfile)), options)
Glk.init(options)