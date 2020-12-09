#!/usr/bin/env node

"use strict"

const fs = require('fs');
const colors = require('colors');
const helper = require('./lib/helper.js');
const config = require('./lib/config.js');
const {resolve} = require('path');

const path0 = resolve(__dirname, '../data/0_archived');
const path1 = resolve(__dirname, '../data/1_ignored');
const path2 = resolve(__dirname, '../data/2_parsed');
const path4 = resolve(__dirname, '../data/z_4_overview');

const files0 = scanFolder(path0);
const files2 = scanFolder(path2);

(async () => {
	console.log('   find archived, but not parsed');
	minus(files0, files2).forEach(f => console.log(colors.red('mv "'+f.fullname+'" "'+path1+'"')));

	console.log('   find parsed, but not archived');
	minus(files2, files0).forEach(f => console.log(colors.red(f.filename)));

})()

function scanFolder(path) {
	let files = fs.readdirSync(path).filter(f => f.endsWith('.bz2'));
	files = files.map(f => ({
		filename: f,
		fullname: resolve(path,f),
		timestamp: f.match(/\d\d\d\d-\d\d-\d\d-\d\d-\d\d/)[0],
	}))
	return files;
}

function throwError(err) {
	throw Error(err);
}

function minus(list1, list2) {
	list2 = new Set(list2.map(f => f.timestamp));
	list1 = list1.filter(f => !list2.has(f.timestamp));
	return list1;
}
/*

let filesOrg = fs.readdirSync(pathOrg).filter(f => f.endsWith('.bz2'));
filesOrg = filesOrg.sort();

let lookup = new Map();

(async () => {
	for (let i = 0; i < filesOrg.length; i++) {
		let fileOrg = filesOrg[i];
		let timestamp = fileOrg.match(/\d\d\d\d-\d\d-\d\d-\d\d-\d\d/);
		if (!timestamp) throw Error();

		let fileSum = timestamp+'.json';
		let filenameOrg = resolve(pathOrg,  fileOrg);
		let filenameSum = resolve(pathSum,  fileSum);

		console.log('parsing '+fileOrg);

		console.log('   load');
		let data = fs.readFileSync(filenameOrg);

		console.log('   decompress');
		data = await helper.bunzip2(data);
		data = data.toString('utf8');

		console.log('   parse');
		data = JSON.parse(data);

		console.log('   scan');
		data = data.map(e => e.ObjectId);
		data = condense(data);

		console.log('   save');
		data = Buffer.from(JSON.stringify(data));
		fs.writeFileSync(filenameSum, data)
	}

	function condense(list) {
		list.sort();

		let lastEntry = false;
		let entries = [];
		list.forEach(id => {
			if (lastEntry && (lastEntry[1]+1 === id)) {
				lastEntry[1] = id;
			} else {
				lastEntry = [id, id];
				entries.push(lastEntry);
			}
		})
		return entries;
	}

	lookup = Array.from(lookup.values());
	lookup.sort((a,b) => a.id - b.id);

	let lastEntry = 3;
	let count = 0;

	console.log('\t'+filesIn.join('\t'));

	lookup.forEach(e => {
		let values = new Map();
		values.set(undefined,0);

		for (let i = 0; i < e.entries.length; i++) {
			let v = e.entries[i];
			if (!values.has(v)) values.set(v,values.size);
			e.entries[i] = values.get(v);
		}

		let entry = e.entries.join('\t');
		if (entry !== lastEntry) {
			outputEntry();
			lastEntry = entry;
		}
		count++;
	})
	outputEntry();

	function outputEntry() {
		if (count === 0) return;
		console.log(count+'\t'+lastEntry);
		count = 0;
	}

})()
*/
