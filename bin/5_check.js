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
	console.log('   find archived, but not parsed'.grey);
	minus(files0, files2).forEach(f => console.log(colors.yellow('git mv "'+f.fullname+'" "'+path1+'"')));

	console.log('   find parsed, but not archived'.grey);
	minus(files2, files0).forEach(f => console.log(colors.yellow('rm "'+f.fullname+'"')));

	console.log('   find duplicated days in archived'.grey);
	await scanObjectIds(files2);
	duplicatedDays(files2).forEach(entry => {
		console.log(colors.white(entry.day));
		entry.files.forEach(file => {
			console.log(colors.red('   '+[file.filename, file.entryCount, file.size].join('\t')));
		})
	});
})()

function scanFolder(path) {
	let files = fs.readdirSync(path).filter(f => f.endsWith('.bz2'));
	files = files.map(filename => {
		let timestamp = filename.match(/\d\d\d\d-\d\d-\d\d-\d\d-\d\d/)[0];
		if (!timestamp) throw Error();

		let fullname = resolve(path,filename)

		return {
			filename,
			fullname,
			timestamp,
			day: timestamp.slice(0,10),
			size: fs.statSync(fullname).size
		}
	})
	files = files.sort((a,b) => a.filename < b.filename ? -1 : 1);
	return files;
}

function minus(list1, list2) {
	list2 = new Set(list2.map(f => f.timestamp));
	list1 = list1.filter(f => !list2.has(f.timestamp));
	return list1;
}

function duplicatedDays(list) {
	let dayLookup = new Map();
	list.forEach(f => {
		if (!dayLookup.has(f.day)) return dayLookup.set(f.day, {day:f.day, files:[f]});
		dayLookup.get(f.day).files.push(f);
	});
	dayLookup = Array.from(dayLookup.values());
	dayLookup = dayLookup.filter(e => e.files.length > 1);
	return dayLookup;
}

async function scanObjectIds(files) {
	for (let file of files) {
		file.intervals = await getObjectIds(file);
		file.entryCount = file.intervals.reduce((sum, interval) => sum + interval[1] - interval[0]+1, 0);
	}

	async function getObjectIds(file) {
		let cacheFile = resolve(path4, file.timestamp+'.json');

		if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile))

		console.log(('      scan '+file.filename).grey);
		let data = fs.readFileSync(file.fullname);
		data = await helper.bunzip2(data);
		data = data.toString('utf8');
		data = JSON.parse(data);
		data = data.map(e => e.ObjectId);
		data = condense(data);
		fs.writeFileSync(cacheFile, Buffer.from(JSON.stringify(data)))

		return data;

		function condense(list) {
			list.sort((a,b) => a-b);

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
	}
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
