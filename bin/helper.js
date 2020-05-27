"use strict"

const cp = require('child_process');
const fs = require('fs');
const https = require('https');
const zlib = require('zlib');
const {PassThrough} = require('stream')

var helper = module.exports = {	
	bzip2, bunzip2,
	fetch,
	gzip, gunzip,
	xzip, xunzip,
	runParallel,
	lineGzipReader, lineGzipWriter,
	jsonGzipMultiReader,
	encodeTSV, encodeCSV,
	slowDown, logPercent,
}

function logPercent() {
	return slowDown(v => console.log((100*v).toFixed(1)));
}

function fetch(url) {
	return new Promise((resolve, reject) => {
		https.get(url, response => {
			let buf = [];
			response.on('data', data => buf.push(data));
			response.on('end', () => resolve(Buffer.concat(buf)));
			if (response.statusCode !== 200) {
				console.log(response);
				throw Error();
			}
		})
	});
}

async function* lineGzipReader(filename, cb) {

	let file = fs.createReadStream(filename);
	let gzip = zlib.createGunzip({chunkSize:1024*1024});

	if (cb) {
		let sizeSum = fs.statSync(filename).size;
		let sizePos = 0;
		let through = new PassThrough();
		through.on('data', chunk => cb((sizePos += chunk.length)/sizeSum))
		file.pipe(through).pipe(gzip);
	} else {
		file.pipe(gzip);
	}

	let lastLine = '';
	for await (let block of gzip) {
		let lines = (lastLine + block.toString()).split('\n');
		lastLine = lines.pop();
		for (let line of lines) yield line;
	}
}

async function* jsonGzipMultiReader(filenames, cb) {
	let sizeSum = 0;
	filenames.forEach(f => sizeSum += fs.statSync(f).size);
	let sizePos = 0;

	for (let filename of filenames) {
		//console.log(filename);
		let file = fs.readFileSync(filename);
		let data = zlib.gunzipSync(file);
		data = JSON.parse(data);

		for (let entry of data) yield entry;

		cb((sizePos += file.length)/sizeSum)
	}
}

function lineGzipWriter(filename) {
	let finished = false;
	let block = [], blockSize = 0;
	let file = fs.createWriteStream(filename);
	let gzip = zlib.createGzip({level:9});
	gzip.pipe(file);

	async function write(line) {
		if (finished) throw Error();
		if (line === undefined) {
			await flush();
			await close();
			finished = true;
		} else {
			block.push(line+'\n');
			blockSize += line.length;
			if (blockSize > 1e5) await flush();
		}
	}

	async function flush() {
		let buf = Buffer.from(block.join(''));
		block = [];
		blockSize = 0;
		return new Promise(res => gzip.write(buf, res))
	}

	async function close() {
		return new Promise(res => {
			file.once('close', res);
			gzip.end();
		})
	}
	
	return write;
}

function bzip2(bufIn) {
	if (typeof bufIn === 'string') bufIn = Buffer.from(bufIn, 'utf8');
	return runCommand('bzip2', ['-zck9'], bufIn);
}

function bunzip2(bufIn) {
	return runCommand('bzip2', ['-dck'], bufIn);
}

function gzip(bufIn) {
	if (typeof bufIn === 'string') bufIn = Buffer.from(bufIn, 'utf8');
	return new Promise(res => zlib.gzip(bufIn, {level:9}, (err,bufOut) => res(bufOut)))
}

function gunzip(bufIn) {
	return new Promise(res => zlib.gunzip(bufIn, (err,bufOut) => res(bufOut)))
}

function xzip(bufIn) {
	if (typeof bufIn === 'string') bufIn = Buffer.from(bufIn, 'utf8');
	return runCommand('xz', ['-zck9e'], bufIn);
}

function xunzip(bufIn) {
	return runCommand('xz', ['-dck'], bufIn);
}

function runCommand(cmd, args, bufIn) {
	return new Promise((resolve, reject) => {
		let bufOut = [];
		let p = cp.spawn(cmd, args);
		p.stdin.end(bufIn);
		p.stdout.on('data', chunk => bufOut.push(chunk));
		p.stdout.on('end', () => resolve(Buffer.concat(bufOut)));;
		p.on('error', err => {
			throw err;
			reject();
		})
	})
}

function runParallel(limit, list) {
	return new Promise((resolve, reject) => {
		let active = 0;
		let index = 0;
		let finished = false
		next();
		function next() {
			if ((active === 0) && (index >= list.length) && !finished) {
				finished = true;
				return resolve()
			}
			while ((active < limit) && (index < list.length)) {
				let entry = list[index];
				index++;
				if (!entry) continue;
				active++;
				entry().then(() => {
					active--;
					next()
				}, reject)
			}
		}
	})
}

function slowDown(cb, delay) {
	if (!cb) throw Error();
	if (!delay) delay = 3000;
	let nextUpdate = Date.now();
	return v => {
		let now = Date.now();
		if (now < nextUpdate) return;
		nextUpdate += delay;
		cb(v);
	}
}

function encodeTSV(list) {
	let keys = new Set();
	list.forEach(e => Object.keys(e).forEach(k => keys.add(k)));
	keys = Array.from(keys.values());
	list = list.map(e => keys.map(k => e[k]).join('\t'));
	list.unshift(keys.join('\t'));
	return list.join('\n');
}

function encodeCSV(list) {
	let keys = new Set();
	list.forEach(e => Object.keys(e).forEach(k => keys.add(k)));
	keys = Array.from(keys.values());
	list = list.map(e => keys.map(k => {
		let v = ''+e[k];
		return v.includes(',') ? '"'+v+'"' : v;
	}).join(','));
	list.unshift(keys.join(','));
	return list.join('\n');
}

function decodeTSV(list) {}


