#!/usr/bin/env node

"use strict"

const fs = require('fs');
const helper = require('./lib/helper.js');
const { resolve } = require('path');
const tempFolder = resolve(__dirname, '../tmp/');

(async () => {
	let date = (new Date()).toISOString().slice(0, 16).replace(/[^0-9]/g, '-');
	let filenameOut = resolve(__dirname, '../data/0_archived/' + date + '_dump.csv.xz');
	fs.mkdirSync(tempFolder, { recursive: true });

	//let filenameTmp = await scrapeAPI();
	let filenameTmp = await downloadCSV();

	if (filenameTmp) {
		// download completed
		fs.renameSync(filenameTmp, filenameOut);
	} else {
		// no new downloads
		process.exit(42);
	}
})()

async function downloadCSV() {
	// Quelle: https://www.arcgis.com/home/item.html?id=66876b81065340a4a48710b062319336
	let metadata = await helper.fetch('https://www.arcgis.com/sharing/rest/content/items/66876b81065340a4a48710b062319336?f=json');
	metadata = JSON.parse(metadata);

	console.log('   latest: ' + (new Date(metadata.modified)).toISOString().slice(0, 16))
	let lockFilename = resolve(tempFolder, metadata.modified + '.lock');

	if (fs.existsSync(lockFilename)) {
		console.log('   already downloaded');
		return false;
	}

	let redirect = await helper.fetchRedirect('https://www.arcgis.com/sharing/rest/content/items/66876b81065340a4a48710b062319336/data')

	console.log('   download CSV');
	let buffer = await helper.fetch(redirect);

	console.log('   compress');
	buffer = await helper.xzip(buffer);

	console.log('   write');
	let filename = getTempFilename();
	fs.writeFileSync(filename, buffer);

	fs.writeFileSync(lockFilename, '', 'utf8');

	return filename;
}

async function scrapeAPI() {
	// not used
	// but we may need that function when CSV download is not available
	// data status: https://npgeo-corona-npgeo-de.hub.arcgis.com/datasets/38e0356be30642868b4c526424102718_0/explore


	let filename = getTempFilename();

	let page = 0;
	let pageSize = 5000;
	let count = 0;
	let data;
	let step = 0;
	let xz = helper.lineXzipWriter(filename);

	do {
		if (step % 5 === 0) process.stderr.write('·');
		step++;

		let url = 'https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_COVID19/FeatureServer/0/query?where=1%3D1&outFields=*&orderByFields=ObjectId%20ASC&resultOffset=' + (page * pageSize) + '&resultRecordCount=' + pageSize + '&f=json';
		data = await helper.fetch(url);
		try {
			data = JSON.parse(data);
			let line = JSON.stringify(data); // single line
			await xz.write(line);
		} catch (e) {
			console.log(url);
			console.log(data);
			throw e;
		}
		count += ((data || {}).features || []).length || 0;
		page++;
	} while (data.exceededTransferLimit)

	process.stderr.write(' ' + count + '\n');

	console.log('   close')
	await xz.close();

	return filename;
}

function getTempFilename() {
	return resolve(tempFolder, (new Date()).toISOString().replace(/[^0-9]+/g, '_') + '.tmp');
}
