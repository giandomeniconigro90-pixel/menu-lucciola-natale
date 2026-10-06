const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');
function setup() {
  const node = () => ({innerHTML:'', textContent:'', value:'', style:{}, dataset:{}, hidden:true, classList:{contains:()=>false, add(){}, remove(){}, toggle(){}}});
  const els = {}; const btn = node(); btn.dataset.cat = 'calde';
  const calls = [];
  const ctx = { console, Intl, Date, document:{body:node(), getElementById:id=>els[id]??=node(), querySelector:s=>s==='.tab-btn.active'?btn:node(), querySelectorAll:()=>[btn], addEventListener(){}}, window:{addEventListener(){},scrollTo(){}}, localStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}}, Papa:{parse(url, options){calls.push(options)}} };
  vm.createContext(ctx); vm.runInContext(source,ctx);
  return {els, calls, run:s=>vm.runInContext(s,ctx)};
}
test('valid prices preserved; missing and malformed prices are not free',()=>{
  const {run,els}=setup();
  assert.equal(run("parsePrice('1,20')"),1.2); assert.equal(run("parsePrice('0')"),0);
  for(const value of ['', 'abc', '2 euro', '-1']) assert.equal(run(`parsePrice(${JSON.stringify(value)})`),null);
  run("transformCsvToMenu([{categoria:'Caffetteria',nome:'Caffè'}]);showCategory('calde',null)");
  assert.match(els['menu-container'].innerHTML,/Prezzo da verificare/);
});
test('empty category clears old products; search restores category',()=>{
  const {run,els}=setup();
  run("transformCsvToMenu([{categoria:'Caffetteria',nome:'Caffè',prezzo:'1,20'}]);showCategory('calde',null)");
  els['menu-search'].value='Caff';run('searchMenu()');assert.match(els['menu-container'].innerHTML,/Risultati/);
  els['menu-search'].value='';run('searchMenu()');assert.doesNotMatch(els['menu-container'].innerHTML,/Risultati/);
  run("showCategory('dolci',null)");assert.match(els['menu-container'].innerHTML,/Nessun prodotto/);assert.doesNotMatch(els['menu-container'].innerHTML,/Caffè/);
});
test('spreadsheet text escaped; availability and aperitivo classification preserved',()=>{
  const {run,els}=setup();
  assert.equal(run("normalizeCategory('Aperitivi')"),'aperitivi');
  run(`transformCsvToMenu([{categoria:'Caffetteria',nome:'<img src=x onerror=alert(1)>',descrizione:'<b>Test</b>',prezzo:'1',disponibile:' SOLDOUT '},{categoria:'Caffetteria',nome:'Hidden',prezzo:'2',disponibile:'NO'}]);showCategory('calde',null)`);
  assert.doesNotMatch(els['menu-container'].innerHTML,/<img|<b>|Hidden/);assert.match(els['menu-container'].innerHTML,/&lt;img|sold-out/);
});
test('storage blocked does not stop fetch; invalid CSV keeps previous menu',()=>{
  const {run,calls,els}=setup();
  run("transformCsvToMenu([{categoria:'Caffetteria',nome:'Caffè',prezzo:'1'}]);initOpeningHours();initDataFetch()");
  assert.equal(calls.length,2);
  calls[1].complete({meta:{fields:['unexpected']},data:[],errors:[]});
  run("showCategory('calde',null)");assert.match(els['menu-container'].innerHTML,/Caffè/);assert.equal(els['menu-notice'].hidden,false);
});
test('opening hours validate times and handle midnight',()=>{
  const {run}=setup();assert.equal(run("timeToMinutes('29:90')"),null);assert.equal(run("timeToMinutes('24:00')"),1440);
  run("openingSchedule=parseHoursCsv([{day:'lun',start:'22:00',end:'02:00'}])");
  assert.equal(run('isOpenNow(new Date(2026,9,5,23,0))'),true);
  assert.equal(run('isOpenNow(new Date(2026,9,6,1,0))'),true);
  assert.equal(run('isOpenNow(new Date(2026,9,6,2,0))'),false);
});
