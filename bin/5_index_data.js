#!/usr/bin/env node

"use strict"

const fs = require('fs');
const { resolve } = require('path');

const cloudUrl = 'https://storage.googleapis.com/brdata-public-data/rki-corona-archiv/';

generateIndex('0_archived');
generateIndex('1_ignored');
generateIndex('2_parsed');

function generateIndex(dir) {
	let fullDir = resolve(__dirname, '../data/', dir);
	let result = [];

	fs.readdirSync(fullDir).forEach(f => {
		let stat = fs.statSync(resolve(fullDir, f));
		if (stat.isDirectory()) return;
		if (!f.endsWith('.xz')) return;
		result.push({
			url: cloudUrl + dir + '/' + f,
			name: f,
			size: Math.round(stat.size / 1024).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'") + ' KB',
		});
	})

	result.sort();

	fs.writeFileSync(resolve(fullDir, 'index.txt'), result.map(f => f.name).join('\n'));

	let html = result.map(f => '<a href="' + f.url + '">' + f.name + '</a> ' + f.size).join('<br>\n');
	html = '<html><body style="font-family:monospace">' + html + '</body></html>';

	fs.writeFileSync(resolve(fullDir, 'index.html'), html);
}
