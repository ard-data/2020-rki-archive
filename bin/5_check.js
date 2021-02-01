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
fs.mkdirSync(path4, {recursive:true})

const files0 = scanFolder(path0);
const files2 = scanFolder(path2);

(async () => {
	console.log('   find archived, but not parsed'.grey);
	minus(files0, files2).forEach(f => console.log(colors.yellow('git mv "'+f.fullname+'" "'+path1+'"')));

	console.log('   find parsed, but not archived'.grey);
	minus(files2, files0).forEach(f => console.log(colors.yellow('rm "'+f.fullname+'"')));

	console.log('   check sums in parsed'.grey);
	await scanSums(files2);

	duplicatedDays(files2).forEach(entry => {
		console.log(colors.white(entry.day));
		entry.files.forEach(file => {
			console.log(colors.red('   '+[file.filename, file.entryCount, file.size].join('\t')));
		})
	});
})()

function scanFolder(path) {
	let files = fs.readdirSync(path).filter(f => f.endsWith('.xz'));
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

async function scanSums(files) {
	for (let file of files) {
		let info = await getFileInfo(file);
		file.caseCount = info.caseCount;
		file.entryCount = info.entryCount;
	}

	async function getFileInfo(file) {
		let cacheFile = resolve(path4, file.timestamp+'.json');

		if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile))

		console.log(('      scan '+file.filename).grey);

		let entryCount = 0;
		let caseCount = 0;
		for await (let line of helper.lineXzipReader(file.fullname)) {
			line = JSON.parse(line);
			if (line.AnzahlFall > 0) caseCount += line.AnzahlFall;
			entryCount++;
		}
		let data = {entryCount, caseCount};
		fs.writeFileSync(cacheFile, JSON.stringify(data))

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
