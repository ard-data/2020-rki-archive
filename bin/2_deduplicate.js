#!/usr/bin/env node

"use strict"

const fs = require('fs');
const { resolve, dirname } = require('path');
const crypto = require('crypto');



const dirSrc = resolve(__dirname, '../data/0_archived/');
const hashCacheFilename = resolve(__dirname, '../tmp/hashes.json');
fs.mkdirSync(dirname(hashCacheFilename), {recursive:true})
let hashCache = new Map();
if (fs.existsSync(hashCacheFilename)) hashCache = new Map(JSON.parse(fs.readFileSync(hashCacheFilename)));


let files = [];
fs.readdirSync(dirSrc).sort().forEach(filename => {
	if (!filename.endsWith('.xz')) return;


	let fullname = resolve(dirSrc, filename);
	let key = filename+':'+fs.statSync(fullname).size;

	let hash;
	if (hashCache.has(key)) {
		hash = hashCache.get(key);
	} else {
		hash = crypto.createHash('sha256').update(fs.readFileSync(fullname)).digest('hex');
		hashCache.set(key, hash);
	}

	files.push({ fullname, hash });
})

files.sort((a,b) => a.hash.localeCompare(b.hash) || a.fullname.localeCompare(b.fullname));

let lastHash = false;
files = files.filter(f => lastHash === (lastHash = f.hash));

files.forEach(f => fs.rmSync(f.fullname));

fs.writeFileSync(hashCacheFilename, JSON.stringify(Array.from(hashCache.entries())));
