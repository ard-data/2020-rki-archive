"use strict"

const fs = require('fs');
const helper = require('./lib/helper.js');
const config = require('./lib/config.js');
const {resolve} = require('path');

const pathIn  = resolve(__dirname, '../data/0_archived');
const pathOut = resolve(__dirname, '../data/2_parsed');

let filesIn = fs.readdirSync(pathIn).filter(f => f.endsWith('.bz2'));

(async () => {
	for (let fileIn of filesIn) {
		let timestamp = fileIn.match(/\d\d\d\d-\d\d-\d\d-\d\d-\d\d/);
		if (!timestamp) throw Error();

		let fileOut = `data_${timestamp[0]}.json.bz2`;

		let filenameIn  = resolve(pathIn,  fileIn);
		let filenameOut = resolve(pathOut, fileOut);
		if (fs.existsSync(filenameOut)) continue;

		console.log('parsing '+fileIn);

		let type = fileIn.replace(timestamp,'?');
		let data;

		try {
			switch (type) {
				case '?_api_raw.json.bz2':
					data = await openApiRaw(filenameIn);
				break;
				case '?_dump.csv.bz2':
					data = await openCsvDump(filenameIn);
				break;
				default: throw Error(`unknown type "${type}"`)
			}

			data.forEach(cleanupDates);
			
			checkData(data);

			await saveData(data, filenameOut);
		} catch (e) {
			
		}
	}
})()

async function openApiRaw(filenameIn) {
	console.log('   load');
	let data = await fs.promises.readFile(filenameIn);

	console.log('   decompress');
	data = await helper.bunzip2(data);
	data = data.toString('utf8');

	console.log('   parse');
	data = JSON.parse(data);

	data = data.map(b => b.features.map(e => e.attributes));
	data = [].concat.apply([], data);

	data.forEach(obj => {
		if ((obj.Altersgruppe2 === '') || (obj.Altersgruppe2 === 'nicht übermittelt')) delete obj.Altersgruppe2;
	})

	return data;
}

async function openCsvDump(filenameIn) {
	console.log('   load');
	let data = await fs.promises.readFile(filenameIn);

	console.log('   decompress');
	data = await helper.bunzip2(data);
	data = data.toString('utf8');

	console.log('   parse');

	if (data.charCodeAt(0) > 200) data = data.slice(1);

	data = data.split(/[\n\r]+/).filter(l => l);

	let header = data.shift();
	header = header
		.replace(/\s+/g, '')
		.replace('LandkreisID', 'IdLandkreis')

	let separator = header.replace(/[0-9a-zöäüß]+/gi,'').split('').sort();
	separator = separator[Math.floor(separator.length/2)];

	header = header.split(separator);

	data = data.map(l => {
		l = l.trim();

		let quoteCount = (l.match(/\"/g) || []).length;
		if (quoteCount === 2) {
			l = l.replace(/\".*\"/, t => t.replace(/[\",;]+/g,''));
		} else if (quoteCount !== 0) throw Error(JSON.stringify(l));

		l = l.split(separator);
		if (l.length !== header.length) throw Error(JSON.stringify(l));

		let obj = {};
		header.forEach((k,i) => obj[k] = l[i]);

		if (defined('FID')) obj.ObjectId = obj.FID;

		if (defined('IdBundesland')) obj.IdBundesland = parseInt(obj.IdBundesland, 10);
		if (defined('AnzahlFall')) obj.AnzahlFall = parseInt(obj.AnzahlFall, 10);
		if (defined('AnzahlTodesfall')) obj.AnzahlTodesfall = parseInt(obj.AnzahlTodesfall, 10);
		if (defined('ObjectId')) obj.ObjectId = parseInt(obj.ObjectId, 10);
		if (defined('NeuerFall')) obj.NeuerFall = parseInt(obj.NeuerFall, 10);
		if (defined('NeuerTodesfall')) obj.NeuerTodesfall = parseInt(obj.NeuerTodesfall, 10);

		if (defined('AnzahlGenesen')) obj.AnzahlGenesen = parseInt(obj.AnzahlGenesen, 10);
		if (defined('NeuGenesen')) obj.NeuGenesen = parseInt(obj.NeuGenesen, 10);
		if (defined('IstErkrankungsbeginn')) obj.IstErkrankungsbeginn = parseInt(obj.IstErkrankungsbeginn, 10);
		while (obj.IdLandkreis.length < 5) obj.IdLandkreis = '0'+obj.IdLandkreis;

		if (defined('Referenzdatum')) obj.Refdatum = obj.Referenzdatum;

		if ((obj.Altersgruppe2 === '') || (obj.Altersgruppe2 === 'nicht übermittelt')) delete obj.Altersgruppe2;

		delete obj.Referenzdatum;
		delete obj.FID

		return obj;

		function defined(key) {
			let v = obj[key];
			if (v) return true;
			let type = typeof v;
			if ((v === '') || (type === 'undefined')) {
				delete obj[key];
				return false;
			}
			throw Error(JSON.stringify([key,v,typeof v]));
		}
	})

	return data;
}

function checkData(data) {
	console.log('   check');

	data.forEach(obj => {
		let keyList = Object.keys(obj);
		
		let keysLookup = new Set(keyList);

		keyList.forEach(key => {
			if (obj[key] === undefined) {
				delete obj[key];
				return;
			}
			if (!config.checkField(key, obj[key])) throw Error('field check failed: key "'+key+'", value "'+obj[key]+'"');
		});
		
		config.mandatoryList.forEach(keyMandatory => {
			if (!keysLookup.has(keyMandatory)) throw new Error('mandatory key missing: "'+keyMandatory+'" in Object "'+JSON.stringify(obj)+'"');
			keysLookup.delete(keyMandatory);
		})

		Array.from(keysLookup.keys()).forEach(key => {
			if (!config.optionalSet.has(key)) throw new Error('key is not known: "'+key+'"');
		})
	})
}

async function saveData(data, filenameOut) {
	console.log('   compress');
	data = JSON.stringify(data);
	data = await helper.bzip2(data);

	console.log('   save');
	await fs.promises.writeFile(filenameOut, data);
}

function cleanupDates(obj) {
	obj.MeldedatumISO = fixDate(obj.Meldedatum);
	obj.DatenstandISO = fixDate(obj.Datenstand);
	obj.RefdatumISO   = fixDate(obj.Refdatum);

	function fixDate(value) {
		if (!value) return undefined;

		let result = value;
		switch (typeof value) {
			case 'string':
				if (result.startsWith('19')) return undefined; // 1956, 1966, … SRSLY?

				if (/^\d{8}00000$/.test(result)) {
					result = parseInt(result, 10);
					break;
				}

				if (/^\d{1,2}\/\d{1,2}\/2020 12:00:00 AM$/.test(result)) {
					result = Date.parse(result);
					break;
				}

				if (/^2020\/\d{2}\/\d{2} 00:00:00$/.test(result)) {
					result = Date.parse(result);
					break;
				}

				if (/^\d\d\.\d\d\.20\d\d,? 00:00( Uhr)?$/.test(result)) {
					result = result.split(/[^0-9]+/);
					result = result[2]+'-'+result[1]+'-'+result[0]+'T00:00:00Z';
				}

				if (/^20\d\d-\d\d-\d\d$/.test(result)) result += 'T00:00:00Z';
				
				if (/^20\d\d-\d\d-\d\d(T| )00:00:00(\.000)?(Z|\+00:00)$/.test(result)) {
					result = Date.parse(result);
					break;
				}

				throw Error('unknown date format "'+value+'" ('+result+')');
			break;
			case 'number':
				// range check
				if (result < 1577836800000) throw Error();
				if (result > Date.now()) throw Error();
			break;
			default: throw Error(JSON.stringify(value));
		}
		result = new Date(result + 43200000);
		result = result.toISOString();
		return result.slice(0,10);
	}
}