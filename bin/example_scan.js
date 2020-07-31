#!/usr/bin/env node

"use strict"

const fs = require('fs');
const helper = require('./lib/helper.js');
const {resolve} = require('path');

const folder = resolve(__dirname, '../data/2_parsed/');

(async () => {

	let filesIn = fs.readdirSync(folder);
	filesIn = fs.readdirSync(folder);

	for (let file of filesIn) {
		if (file < 'data_2020-04') continue;
		if (!file.endsWith('json.bz2')) continue;
		
		file = resolve(folder, file);

		let data = fs.readFileSync(file);
		data = await helper.bunzip2(data);
		data = JSON.parse(data);

		data.forEach(entry => {
			// …
		})
	}
	
})()

