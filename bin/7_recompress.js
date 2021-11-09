#!/usr/bin/env node

"use strict"

const fs = require('fs');
const child_process = require('child_process');
const { resolve } = require('path');

const lookback = 20;

check('0_archived');

check('2_parsed');

process.exit(42);

function check(folder) {
	let fullFolder = resolve(__dirname, '../data', folder);

	// scan for files
	let files = fs.readdirSync(fullFolder);
	files = files.filter(f => f.endsWith('.xz'));
	files.sort();
	files = files.slice(-lookback);
	files = files.map(filename => {
		let fullname = resolve(fullFolder, filename);
		let size = fs.statSync(fullname).size;
		return { filename, fullname, size }
	})

	// linear regression of file sizes
	let sx = 0, sxx = 0, sxy = 0, sy = 0;
	files.map((f,x) => {
		let y = f.size;
		sx += x;
		sxx += x*x;
		sxy += x*y;
		sy += y;
	});

	let n = files.length;
	let w = n*sxx - sx*sx;
	let a = (sy*sxx - sx*sxy)/w;
	let b = ( n*sxy - sx*sy )/w;

	files.forEach((f,x) => f.diff = f.size - (a + b*x));

	// max diff
	files.sort((a,b) => b.diff - a.diff);
	let worstFile = files[0];
	console.log('worst file diff', (worstFile.diff/1024).toFixed(0), 'KB');

	if (worstFile.diff < 5e5) return // everything is ok

	recompress(worstFile.fullname);

	process.exit();
}

function recompress(fullname) {
	console.log('recompress', fullname);

	const tempFolder = resolve(__dirname, '../tmp');
	fs.mkdirSync(tempFolder, { recursive:true })

	const tempFullname = resolve(tempFolder, Math.random().toString(36).slice(2));

	try {
		child_process.execSync(`nice -20 xz -dkcq "${fullname}" | xz -z9eq > "${tempFullname}"`);

		fs.renameSync(tempFullname, fullname);
	} catch (e) {

	}

	process.exit(42);
}
