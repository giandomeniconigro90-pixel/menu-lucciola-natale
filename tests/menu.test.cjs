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
  const ctx = { console, Intl, Date, URLSearchParams, document:{body:node(), getElementById:id=>id==='seasonal-theme' ? (els[id] || null) : (els[id]??=node()), createElement:()=>node(), head:{appendChild(el){ els[el.id]=el; el.remove=()=>delete els[el.id]; }}, querySelector:s=>s==='.tab-btn.active'?btn:node(), querySelectorAll:()=>[btn], addEventListener(){}}, window:{location:{search:''},addEventListener(){},scrollTo(){}}, localStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}}, Papa:{parse(url, options){calls.push(options)}} };
  vm.createContext(ctx); vm.runInContext(source,ctx);
  return {els, calls, ctx, run:s=>vm.runInContext(s,ctx)};
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
test('notice dates include boundaries, validate calendar and retain legacy rows',()=>{
  const {run}=setup();
  assert.equal(run("isScheduledRowActive({data_inizio:'01/12/2026',data_fine:'2026-12-31'},'2026-12-01')"),true);
  assert.equal(run("isScheduledRowActive({data_inizio:'2026-12-01',data_fine:'2026-12-31'},'2026-12-31')"),true);
  assert.equal(run("isScheduledRowActive({data_fine:'2026-12-31'},'2027-01-01')"),false);
  assert.equal(run("isScheduledRowActive({data_inizio:'2026-02-30'},'2026-03-01')"),false);
  assert.equal(run("isScheduledRowActive({data_inizio:'2026-12-31',data_fine:'2026-12-01'},'2026-12-15')"),false);
  assert.equal(run("isScheduledRowActive({disponibile:'FALSE'},'2026-12-15')"),false);
  assert.equal(run("isScheduledRowActive({},'2026-12-15')"),true);
});
test('expired cached notices hide and scheduled theme reverts to normal',()=>{
  const {run,els}=setup();
  run("transformCsvToMenu([{categoria:'AVVISO NATALE',nome:'Buone Feste',data_inizio:'2026-12-01',data_fine:'2026-12-31'},{categoria:'IMPOSTAZIONE',nome:'tema',descrizione:'natale',data_inizio:'2026-12-01',data_fine:'2026-12-31'}]);applyScheduledContent('2026-12-15')");
  assert.equal(els['alert-banner'].textContent,'Buone Feste');assert.ok(els['seasonal-theme']);
  run("applyScheduledContent('2027-01-01')");assert.equal(els['alert-banner'].style.display,'none');assert.equal(els['seasonal-theme'],undefined);
  assert.equal(run('Object.keys(menuData).length'),0);
});
test('URL theme overrides sheet and venue date is Italian around midnight',()=>{
  const {run,ctx,els}=setup();ctx.window.location.search='?tema=natale';run("applyScheduledContent('2026-10-08')");assert.ok(els['seasonal-theme']);
  ctx.window.location.search='?tema=normale';run("applyScheduledContent('2026-12-15')");assert.equal(els['seasonal-theme'],undefined);
  assert.equal(run("venueDateKey(new Date('2026-12-31T23:30:00Z'))"),'2027-01-01');
});
test('refresh preserves search and ignores duplicate in-flight requests',()=>{
  const {run,calls,els}=setup();run("document.getElementById('menu-search');initDataFetch(false);initDataFetch(false)");assert.equal(calls.length,1);
  els['menu-search'].value='Caff';
  calls[0].complete({meta:{fields:['categoria','nome','prezzo']},errors:[],data:[{categoria:'Caffetteria',nome:'Caffè',prezzo:'1,20'}]});
  assert.equal(els['menu-search'].value,'Caff');assert.match(els['menu-container'].innerHTML,/Risultati ricerca/);
  run('initDataFetch(false)');assert.equal(calls.length,2);
});
test('category arrows reflect both scroll boundaries',()=>{
  const {ctx,run,els}=setup();const area={scrollWidth:900,clientWidth:300,scrollLeft:0};ctx.document.querySelector=s=>s==='.nav-scroll-area'?area:null;
  run('updateCategoryArrows()');assert.equal(els['category-prev'].hidden,true);assert.equal(els['category-next'].hidden,false);
  area.scrollLeft=300;run('updateCategoryArrows()');assert.equal(els['category-prev'].hidden,false);assert.equal(els['category-next'].hidden,false);
  area.scrollLeft=600;run('updateCategoryArrows()');assert.equal(els['category-next'].hidden,true);
  area.scrollWidth=300;area.scrollLeft=0;run('updateCategoryArrows()');assert.equal(els['category-prev'].hidden,true);assert.equal(els['category-next'].hidden,true);
});
test('Wi-Fi copy confirms success and explains denied clipboard access',async()=>{
  const {ctx,run,els}=setup();run("document.getElementById('wifi-password').textContent='ExamplePass';document.getElementById('wifi-copy-status')");let copied='';ctx.navigator={clipboard:{async writeText(text){copied=text;}}};await run('copyWifiPassword()');assert.equal(copied,'ExamplePass');assert.equal(els['wifi-copy-status'].textContent,'Password copiata!');
  ctx.navigator.clipboard.writeText=async()=>{throw Error('denied');};await run('copyWifiPassword()');assert.match(els['wifi-copy-status'].textContent,/Tieni premuta/);
});
