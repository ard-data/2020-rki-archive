#!/usr/bin/env node

"use strict"

const fs = require('fs');
const colors = require('colors');
const helper = require('./lib/helper.js');
const config = require('./lib/config.js');
const {resolve, relative} = require('path');

const base  = resolve(__dirname, '../data/');
const path0 = resolve(base, '0_archived');
const path1 = resolve(base, '1_ignored');
const path2 = resolve(base, '2_parsed');
const path4 = resolve(base, 'z_4_overview');

fs.mkdirSync(path4, {recursive:true});

const files0 = scanFolder(path0);
const files2 = scanFolder(path2);

(async () => {
	console.log('   archived, not parsed');
	minus(files0, files2).forEach(f => console.log('mv "'+relative(base, f.fullname)+'" "'+relative(base, path1)+'"'));

	console.log('   parsed, not archived');
	minus(files2, files0).forEach(f => console.log('rm "'+relative(base, f.fullname)+'"'));

	console.log('   check sums in parsed');
	await addSums(files2);

	if (!sanityCheck(files2)) {
		process.exit(1);
		console.log('errors found');
	}
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

function sanityCheck(files) {
	let noErrors = true;
	let lastCaseCount = 0;
	let lastEntryCount = -1;
	let lastFilename = -1;

	files.forEach(file => {
		let errors = [];


		if (file.filename > 'data_2020-8-01') {
			if (file.caseCount <= lastCaseCount) errors.push('- less cases???');
			if (file.caseCount >  lastCaseCount+40000) errors.push('- way too much cases');

			if (file.entryCount <= lastEntryCount) errors.push('- less entries???');
			if (file.entryCount >  lastEntryCount+15000) errors.push('- way too much entries');
		}

		if (errors.length > 0) {
			console.log('CHECK ERROR');
			console.log(errors.join('\n'));
			console.table([
				{filename:  lastFilename, entryCount:  lastEntryCount, caseCount:  lastCaseCount},
				{filename: file.filename, entryCount: file.entryCount, caseCount: file.caseCount},
				{filename:        'diff', entryCount: file.entryCount-lastEntryCount, caseCount: file.caseCount-lastCaseCount}
			])
			noErrors = false;
		}

		lastCaseCount  = file.caseCount;
		lastEntryCount = file.entryCount;
		lastFilename   = file.filename;
	});

	return noErrors;
}

async function addSums(files) {
	for (let file of files) {
		let info = await getFileInfo(file);
		file.caseCount = info.caseCount;
		file.entryCount = info.entryCount;
	}

	async function getFileInfo(file) {
		let cacheFile = resolve(path4, file.timestamp+'.json');

		if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile))

		console.log('      scan '+file.filename);

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
