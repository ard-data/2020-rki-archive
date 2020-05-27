"use strict"

const fs = require('fs');
const helper = require('./helper.js');
const {resolve} = require('path');

(async () => {
	console.log('download')

	let page = 0;
	let pageSize = 5000;
	let result = [];
	let data;
	do {
		process.stderr.write(page+' ');
		let url = 'https://services7.arcgis.com/mOBPykOjAyBO2ZKk/arcgis/rest/services/RKI_COVID19/FeatureServer/0/query?where=1%3D1&outFields=*&orderByFields=ObjectId%20ASC&resultOffset='+(page*pageSize)+'&resultRecordCount='+pageSize+'&f=json';
		data = await helper.fetch(url);
		try {
			data = data.toString('utf8');
			data = JSON.parse(data);
		} catch (e) {
			console.log(url);
			console.log(data);
			throw e;
		}
		result.push(data);
		page++;
	} while (data.exceededTransferLimit)
	
	process.stderr.write('\n');
	
	console.log('stringify')
	result = JSON.stringify(result);

	console.log('compress')
	result = await helper.bzip2(result);
	
	console.log('save')
	let date = (new Date()).toISOString().slice(0,16).replace(/[^0-9]/g,'-');
	fs.writeFileSync(resolve(__dirname,'../data/0_archived/'+date+'_api_raw.json.bz2'), result);
})()
