#!/usr/bin/env node

"use strict"

const fs = require('fs');
const {resolve} = require('path');

const cloudUrl = 'https://storage.googleapis.com/brdata-public-data/rki-corona-archiv/';

generateIndex('0_archived');
generateIndex('1_ignored');
generateIndex('2_parsed');

function generateIndex(dir) {
	let fullDir = resolve(__dirname, '../data/', dir);
	let result = [];

	fs.readdirSync(fullDir).forEach(entry => {
		let stat = fs.statSync(resolve(fullDir, entry));
		if (stat.isDirectory()) return;
		if (!entry.endsWith('.xz')) return;
		result.push(entry);
	})

	result.sort();

	let html = result.map(f => '<a href="'+cloudUrl+dir+'/'+f+'">'+f+'</a>').join('<br>\n');
	html = '<html><body>'+html+'</body></html>';

	fs.writeFileSync(resolve(fullDir, 'index.html'), html);
}
