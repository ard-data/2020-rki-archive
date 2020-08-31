"use strict"

const fields = [
	{name:'ObjectId',             mandatory:true,  check:v => (typeof v === 'number')},
	{name:'IdBundesland',         mandatory:true,  check:v => (typeof v === 'number') && /^\d+$/.test(v)},
	{name:'Bundesland',           mandatory:true,  check:v => (typeof v === 'string')},
	{name:'IdLandkreis',          mandatory:true,  check:v => (typeof v === 'string') && /^\d{5}$/.test(v)},
	{name:'Landkreis',            mandatory:true,  check:v => (typeof v === 'string')},
	{name:'Altersgruppe',         mandatory:true,  check:v => (typeof v === 'string')},
	{name:'Altersgruppe2',        mandatory:false, check:v => (typeof v === 'string')},
	{name:'Geschlecht',           mandatory:true,  check:v => (typeof v === 'string')},
	{name:'AnzahlFall',           mandatory:true,  check:v => (typeof v === 'number')},
	{name:'AnzahlTodesfall',      mandatory:true,  check:v => (typeof v === 'number')},
	{name:'AnzahlGenesen',        mandatory:false, check:v => (typeof v === 'number')},
	{name:'NeuerFall',            mandatory:false, check:v => (typeof v === 'number')},
	{name:'NeuerTodesfall',       mandatory:false, check:v => (typeof v === 'number')},
	{name:'NeuGenesen',           mandatory:false, check:v => (typeof v === 'number')},
	{name:'Refdatum',             mandatory:false, check:v => (typeof v === 'string') || (typeof v === 'number')},
	{name:'Meldedatum',           mandatory:true,  check:v => (typeof v === 'string') || (typeof v === 'number')},
	{name:'Datenstand',           mandatory:true,  check:v => (typeof v === 'string')},
	{name:'IstErkrankungsbeginn', mandatory:false, check:v => (typeof v === 'number')},
	{name:'RefdatumISO',          mandatory:false, check:v => (typeof v === 'string')},
	{name:'MeldedatumISO',        mandatory:true,  check:v => (typeof v === 'string')},
	{name:'DatenstandISO',        mandatory:true,  check:v => (typeof v === 'string')},
];

const lookupCheck = new Map(fields.map(f => [f.name,f.check]));

module.exports = {
	fields,
	checkField: (f,v) => lookupCheck.get(f)(v),
	fieldList: fields.map(f => f.name),
	mandatoryList: fields.filter(f => f.mandatory).map(f => f.name),
	optionalSet: new Set(fields.filter(f => !f.mandatory).map(f => f.name)),
}