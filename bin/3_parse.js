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
		let xz = helper.lineXzipWriter(filenameTmp);

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

		async function parseEntry(entry) {
			cleanupDates(entry);
			checkEntry(entry);
			await xz.write(JSON.stringify(entry));
		}

		await xz.close();
		fs.renameSync(filenameTmp, filenameOut);
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
	let header;
	for await (let line of helper.lineXzipReader(filenameIn)) {
		if (line.charCodeAt(0) > 200) line = line.slice(1);
		if (line.endsWith('\r')) line = line.slice(0, line.length-1);

		let quoteCount = (line.match(/\"/g) || []).length;
		if (quoteCount === 2) {
			line = line.replace(/\".*\"/, t => t.replace(/[\",;]+/g,''));
		} else if (quoteCount !== 0) throw Error(JSON.stringify(line));


		if (!header) {
			header = line;
			header = header.replace('FID', 'ObjectId');
			header = header.split(',')
			//header = header
			//	.replace(/\s+/g, '')
			//	.replace('LandkreisID', 'IdLandkreis')
			// if (defined('Referenzdatum')) obj.Refdatum = obj.Referenzdatum;
			checkHeader(header);
			continue;
		}

		line = line.split(',');

		if (line.length !== header.length) throw Error(JSON.stringify(line));

		let obj = {};
		header.forEach((k,i) => obj[k] = line[i]);

		obj.IdBundesland = parseInt(obj.IdBundesland, 10);
		obj.AnzahlFall = parseInt(obj.AnzahlFall, 10);
		obj.AnzahlTodesfall = parseInt(obj.AnzahlTodesfall, 10);
		obj.ObjectId = parseInt(obj.ObjectId, 10);
		obj.NeuerFall = parseInt(obj.NeuerFall, 10);
		obj.NeuerTodesfall = parseInt(obj.NeuerTodesfall, 10);

		obj.AnzahlGenesen = parseInt(obj.AnzahlGenesen, 10);
		obj.NeuGenesen = parseInt(obj.NeuGenesen, 10);
		obj.IstErkrankungsbeginn = parseInt(obj.IstErkrankungsbeginn, 10);

		if (obj.IdLandkreis === '0-1') obj.IdLandkreis = '-1';

		if ((obj.Altersgruppe2 === '') || (obj.Altersgruppe2 === 'nicht übermittelt')) delete obj.Altersgruppe2;

		cbEntry(obj);
	}

	function checkHeader(header) {
		const correctHeader = new Set('IdBundesland,Bundesland,Landkreis,Altersgruppe,Geschlecht,AnzahlFall,AnzahlTodesfall,ObjectId,Meldedatum,IdLandkreis,Datenstand,NeuerFall,NeuerTodesfall,Refdatum,NeuGenesen,AnzahlGenesen,IstErkrankungsbeginn,Altersgruppe2'.split(','));
		header.forEach(field => {
			if (correctHeader.has(field)) return correctHeader.delete(field);
			throw Error('unknown header field "'+field+'"');
		})
		for (let field of correctHeader.values()) {
			throw Error('missing header field "'+field+'"');
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