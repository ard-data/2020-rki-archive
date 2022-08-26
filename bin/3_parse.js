#!/usr/bin/env node

"use strict"

const fs = require('fs');
const helper = require('./lib/helper.js');
const config = require('./lib/config.js');
const {resolve} = require('path');

const pathIn  = resolve(__dirname, '../data/0_archived');
const pathOut = resolve(__dirname, '../data/2_parsed');

let filesIn = fs.readdirSync(pathIn).filter(f => f.endsWith('.xz'));

(async () => {
	let xz;
	
	for (let fileIn of filesIn) {
		let timestamp = fileIn.match(/\d\d\d\d-\d\d-\d\d-\d\d-\d\d/);
		if (!timestamp) throw Error();

		let fileOut = `data_${timestamp[0]}.ndjson.xz`;

		let filenameIn  = resolve(pathIn,  fileIn);
		let filenameOut = resolve(pathOut, fileOut);
		let filenameTmp = resolve(__dirname,'../tmp/'+(new Date()).toISOString()+'.tmp');
		fs.mkdirSync(resolve(__dirname,'../tmp/'), {recursive:true});

		if (fs.existsSync(filenameOut)) continue;

		console.log('parsing '+fileIn);

		let type = fileIn.replace(timestamp,'?');
		xz = helper.lineXzipWriter(filenameTmp);

		switch (type) {
			case '?_api_raw.json.xz':
				await openJSONApiRaw(filenameIn, parseEntry);
			break;
			case '?_api_raw.ndjson.xz':
				await openNDJSONApiRaw(filenameIn, parseEntry);
			break;
			case '?_dump.csv.xz':
				await openCsvDump(filenameIn, parseEntry);
			break;
			default: throw Error(`unknown type "${type}"`)
		}

		await xz.close();
		fs.renameSync(filenameTmp, filenameOut);
	}

	async function parseEntry(entry) {
		cleanupDates(entry);
		checkEntry(entry);
		await xz.write(JSON.stringify(entry));
	}
})()

async function openJSONApiRaw(filenameIn, cbEntry) {
	console.log('   load');
	let data = await fs.promises.readFile(filenameIn);

	console.log('   decompress');
	data = await helper.xunzip(data);

	console.log('   parse');
	data = JSON.parse(data);

	data = data.map(b => b.features.map(e => e.attributes));
	data = [].concat.apply([], data);

	for (let entry of data) await cbEntry(entry);
}

async function openNDJSONApiRaw(filenameIn, cbEntry) {
	for await (let line of helper.lineXzipReader(filenameIn)) {
		line = JSON.parse(line);
		for (let feature of line.features) {
			await cbEntry(feature.attributes);
		}
	}
}

async function openCsvDump(filenameIn, cbEntry) {
	let converter;
	for await (let line of helper.lineXzipReader(filenameIn)) {
		if (line.charCodeAt(0) > 200) line = line.slice(1);
		if (line.endsWith('\r')) line = line.slice(0, line.length - 1);
		if (line.length === 0) return;

		let quoteCount = (line.match(/\"/g) || []).length;
		if (quoteCount === 2) {
			line = line.replace(/\".*\"/, t => t.replace(/[\",;]+/g,''));
		} else if (quoteCount !== 0) throw Error(JSON.stringify(line));


		if (!converter) {
			converter = getConverter(line);
			continue;
		}

		await cbEntry(converter(line));
	}

	function getConverter(header) {
		if (header === 'IdBundesland,Bundesland,IdLandkreis,Landkreis,Altersgruppe,Altersgruppe2,Geschlecht,Meldedatum,Refdatum,IstErkrankungsbeginn,NeuerFall,NeuerTodesfall,NeuGenesen,AnzahlFall,AnzahlTodesfall,AnzahlGenesen,Datenstand') {
			return line => {
				line = line.split(',');
				if (line.length !== 17) {
					console.log(line)
					throw Error('line to short')
				}
				return {
					IdBundesland: parseInt(line[0], 10),
					Bundesland: line[1],
					IdLandkreis: fixIdLandkreis(line[2]),
					Landkreis: line[3],
					Altersgruppe: line[4],
					Geschlecht: line[6],
					Meldedatum: line[7],
					Refdatum: line[8],
					IstErkrankungsbeginn: parseInt(line[9], 10),
					NeuerFall: parseInt(line[10], 10),
					NeuerTodesfall: parseInt(line[11], 10),
					NeuGenesen: parseInt(line[12], 10),
					AnzahlFall: parseInt(line[13], 10),
					AnzahlTodesfall: parseInt(line[14], 10),
					AnzahlGenesen: parseInt(line[15], 10),
					Datenstand: line[16],
				}
			}
		}

		console.log({ header });
		throw Error('unknown header');

		function fixIdLandkreis(id) {
			return (id === '0-1') ? '-1' : id;
		}
	}
}

function checkEntry(obj) {
	let keyList = Object.keys(obj);
	
	let keysLookup = new Set(keyList);

	keyList.forEach(key => {
		if (obj[key] === undefined) {
			delete obj[key];
			return;
		}
		if (!config.checkField(key, obj[key])) error('field check failed: key "'+key+'", value "'+obj[key]+'"');
	});
	
	config.mandatoryList.forEach(keyMandatory => {
		if (!keysLookup.has(keyMandatory)) error('mandatory key missing: "'+keyMandatory+'" in Object "'+JSON.stringify(obj)+'"');
		keysLookup.delete(keyMandatory);
	})

	Array.from(keysLookup.keys()).forEach(key => {
		if (!config.optionalSet.has(key)) error('key is not known: "'+key+'"');
	})

	function error(text) {
		console.error(text);
		throw Error();
	}
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
				if (/^\d{8}00000$/.test(result)) {
					result = parseInt(result, 10);
					break;
				}

				if (/^\d{1,2}\/\d{1,2}\/20\d\d 12:00:00 AM$/.test(result)) {
					result = Date.parse(result);
					break;
				}

				if (/^20\d\d\/\d{2}\/\d{2} 00:00:00$/.test(result)) {
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