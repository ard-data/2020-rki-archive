#!/usr/bin/env node

"use strict"

const fs = require('fs');
const helper = require('./lib/helper.js');
const {resolve} = require('path');

(async () => {
	console.log('download')

	let date = (new Date()).toISOString().slice(0,16).replace(/[^0-9]/g,'-');
	let filenameOut = resolve(__dirname,'../data/0_archived/'+date+'_api_raw.ndjson.xz');
	let filenameTmp = resolve(__dirname,'../tmp/'+(new Date()).toISOString()+'.tmp');
	fs.mkdirSync(resolve(__dirname,'../tmp/'), {recursive:true});

	await scrapeAPI(filenameTmp);
	
	fs.renameSync(filenameTmp, filenameOut);
})()

async function scrapeAPI(filenameTmp) {
	let page = 0;
	let pageSize = 5000;
	let count = 0;
	let data;
	let step = 0;
	let xz = helper.lineXzipWriter(filenameTmp);

	do {
		if (step % 5 === 0) process.stderr.write('·');
		step++;

		let url = 'https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_COVID19/FeatureServer/0/query?where=1%3D1&outFields=*&orderByFields=ObjectId%20ASC&resultOffset='+(page*pageSize)+'&resultRecordCount='+pageSize+'&f=json';
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

	process.stderr.write(' '+count+'\n');
	
	console.log('close')
	await xz.close();
}

