/**
 * Digital-ID DB (CSV-driven, no server-side) 
 * Pages: 
 * - index.html : comparison table 
 * - country.html: country detail + timeline (/country.html?id=JPN) 
 * 
 * Source of Truth: CSV in ./data 
 */
const DATA_DIR = './data';
// World map pins: positions come from countries.csv: map_lon/map_lat (+ map_dx/map_dy) in percent (0..100)
const MAP_DEBUG = false;
// Defaults
const DEFAULT_COUNTRIES = ['JPN','EST','DNK','KOR'];
const BASELINE_COUNTRY = 'JPN';
/* =========================================================
 * Helpers: CSV
 * ======================================================= */
function stripBOM(text){ return (text ?? '').replace(/^\uFEFF/, ''); }
function parseCSV(text){
  text = stripBOM(text);
  const rows=[]; let row=[]; let field=''; let inQ=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(inQ){
      if(c==='"' && n==='"'){ field+='"'; i++; }
      else if(c==='"'){ inQ=false; }
      else { field+=c; }
    } else {
      if(c==='"'){ inQ=true; }
      else if(c===','){ row.push(field); field=''; }
      else if(c=== '\n'){ row.push(field); rows.push(row); row=[]; field=''; }
      else if(c=== '\r'){ /* ignore CR */ }
      else { field+=c; }
    }
  }
  row.push(field); rows.push(row);
  const header=(rows.shift()??[]).map(h=>(h??'').trim());
  return rows.filter(r=>r.length>1 && r.some(x=>(x??'').trim()!==''))
    .map(r=>{ const o={}; header.forEach((h,idx)=> o[h]=(r[idx]??'').trim()); return o; });
}
async function fetchCSV(path){ const res=await fetch(path,{cache:'no-store'}); if(!res.ok) throw new Error(`Failed to load: ${path}`); return parseCSV(await res.text()); }
async function fetchCSVOptional(path){ try{ return await fetchCSV(path);} catch(e){ console.warn('Optional CSV not loaded:', path, e?.message); return []; } }
function unique(a){ return Array.from(new Set(a)); }
// value: "Main\nDetail"
function splitValue(value){ const raw=(value??'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim(); const parts=raw.split('\n').map(s=>s.trim()).filter(Boolean); return {main:parts[0]??'', detail:parts.slice(1).join(' ')}; }
// source_url: JSON array or semicolon/newline separated
function parseSourceUrls(src){
  const raw=(src??'').trim(); if(!raw) return [];
  if(raw.startsWith('[')){ try{ const arr=JSON.parse(raw); if(Array.isArray(arr)) return arr.map(x=>String(x).trim()).filter(Boolean); }catch{}
  }
  // ★ FIX: セミコロン/改行で区切る（角括弧は不要）
  return raw.split(/[;\n\r]+/).map(s=>s.trim()).filter(Boolean);
}
function formatThousandsIfInt(str){ const s=String(str??'').trim(); if(!s) return s; const raw=s.replace(/,/g,''); if(/^\-?\d+$/.test(raw)===false) return s; const n=Number(raw); if(!Number.isFinite(n)) return s; return n.toLocaleString('en-US'); }
// 3-way class for I系
function classify(main){ const v=(main??'').toLowerCase(); if(['yes','nationwide','national','shared-platform','adequacy','common'].includes(v)) return 'nationwide'; if(['partial','local','restricted','multiple','procurement','migration','equivalent'].includes(v)) return 'partial'; if(['no','none','planned','developing','pilot','paused'].includes(v)) return 'planned'; return 'partial'; }
function parseQuery(){ const p=new URLSearchParams(location.search); return Object.fromEntries(p.entries()); }
function normalizeId(s){ return (s??'').trim(); }
function normalizeCountryId(s){ return normalizeId(s).toUpperCase(); }
/* =========================================================
 * Flag images
 * ======================================================= */
const ISO2_FALLBACK_BY_ID={JPN:'jp',KOR:'kr',EST:'ee',FRA:'fr',DEU:'de',GBR:'gb',USA:'us',CAN:'ca',AUS:'au',NZL:'nz',SWE:'se',DNK:'dk',SGP:'sg',IND:'in'};
function flagEmojiToISO2(flagEmoji){ const chars=Array.from((flagEmoji??'').trim()); if(chars.length<2) return ''; const cps=chars.map(ch=>ch.codePointAt(0)); const letters=cps.filter(cp=>cp>=0x1f1e6&&cp<=0x1f1ff).map(cp=>String.fromCharCode(cp-0x1f1e6+65)); return letters.length>=2?letters.slice(0,2).join('').toLowerCase():''; }
function getISO2(countryId, rec){ return (rec?.iso2??'').trim().toLowerCase()
  || flagEmojiToISO2(rec?.flag)
  || ISO2_FALLBACK_BY_ID[normalizeCountryId(countryId)]
  || ''; }
function getCountryName(countryId, rec){ return ((rec?.name_ja
  || rec?.name_en
  || normalizeCountryId(countryId)
  || '').trim()); }
function createFlagImgElement(countryId, rec, size='20x15'){
  const iso2=getISO2(countryId, rec); if(!iso2) return null;
  const [wStr,hStr]=size.split('x'); const w=Number(wStr)||20, h=Number(hStr)||15;
  const img=document.createElement('img');
  img.className='flagIcon'; img.width=w; img.height=h; img.loading='lazy'; img.decoding='async';
  img.alt=`${getCountryName(countryId,rec)} flag`;
  img.src = `https://flagcdn.com/${size}/${iso2}.png`;
  img.srcset= `https://flagcdn.com/${w*2}x${h*2}/${iso2}.png 2x, https://flagcdn.com/${w*3}x${h*3}/${iso2}.png 3x`;
  img.onerror=()=>{ img.style.display='none'; };
  return img;
}
function appendCountryLabel(container, countryId, rec, {size='20x15', showCode=false, linkToCountryPage=false}={}){
  const id=normalizeCountryId(countryId); const name=getCountryName(id,rec);
  const wrap=document.createElement('span'); wrap.className='flagWrap'; wrap.title=`${name} (${id})`;
  const flagImg=createFlagImgElement(id,rec,size); if(flagImg) wrap.appendChild(flagImg);
  const text=document.createElement('span'); text.textContent=showCode?`${name} (${id})`:name; wrap.appendChild(text);
  if(linkToCountryPage){ const a=document.createElement('a'); a.className='countryLink'; a.href=`./country.html?id=${encodeURIComponent(id)}`; a.appendChild(wrap); container.appendChild(a);} else { container.appendChild(wrap); }
}
/* =========================================================
 * Detail translation
 * ======================================================= */
let detailJaMap=new Map();
function translateDetailToJa(t){ const k=(t??'').trim(); if(!k) return ''; return detailJaMap.get(k) ?? k; }
/* =========================================================
 * App state
 * ======================================================= */
let countries=[]; let indicators=[]; let countryIndicator=[]; let countryBasic=[]; let events=[]; let benchmarkDefs=[]; let digitalGovBenchmarks=[];
let selectedCountries=new Set(DEFAULT_COUNTRIES);
let expandedDefRows=new Set(); // I系定義
// A/B/C 定義
let basicDefs=[]; let basicDefsById=new Map(); let expandedBasicDefRows=new Set();
// DG01〜DG05 定義
let benchDefsById=new Map(); // benchmark_id -> def record
let expandedBenchDefRows=new Set(); // 開閉の保持（DG行ごと）
// IT infra (IT01-IT03)
let itDefs = []; let countryIT = [];

// NEW: IT 定義のマップと開閉状態（I/A/DG と同じパターン）  [1](https://prefhyogo-my.sharepoint.com/personal/m023903_pref_hyogo_lg_jp/Documents/Microsoft%20Copilot%20Chat%20%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB/app.js)
let itDefsById = new Map();      // indicator_id -> def record
let expandedITDefRows = new Set(); // 開閉状態保持（IT 行ごと）

/* =========================================================
 * Page detection
 * ======================================================= */
const hasComparison=!!document.getElementById('comparisonTable');
const hasWorldMap=!!document.getElementById('worldmapPins');
const hasCountry=!!document.getElementById('countryIndicators');
const versionSelect=document.getElementById('versionSelect');
const statusSelect=document.getElementById('statusSelect');
function setupBasicSummaryToggle(){
  const btn=document.getElementById('toggleBasicSummary'); const wrap=document.getElementById('basicSummaryWrap');
  if(!btn || !wrap) return;
  wrap.setAttribute('hidden',''); btn.setAttribute('aria-expanded','false'); btn.textContent='基本情報を表示';
  btn.addEventListener('click',()=>{
    const willShow=wrap.hasAttribute('hidden');
    if(willShow) wrap.removeAttribute('hidden'); else wrap.setAttribute('hidden','');
    btn.setAttribute('aria-expanded',String(willShow));
    btn.textContent=willShow?'基本情報を非表示':'基本情報を表示';
  });
}
function setupBenchmarksToggle(){
  const btn=document.getElementById('toggleBenchmarks'); const wrap=document.getElementById('benchmarksWrap');
  if(!btn || !wrap) return;
  wrap.setAttribute('hidden',''); btn.setAttribute('aria-expanded','false'); btn.textContent='国際ベンチマークを表示';
  btn.addEventListener('click',()=>{
    const willShow=wrap.hasAttribute('hidden');
    if(willShow) wrap.removeAttribute('hidden'); else wrap.setAttribute('hidden','');
    btn.setAttribute('aria-expanded',String(willShow));
    btn.textContent=willShow?'国際ベンチマークを非表示':'国際ベンチマークを表示';
  });
}
// IT トグル／挿入（デジタルIDの直前・ベンチ直後に配置）
function ensureITWrapAndToggle(){
  const togglesRow = document.querySelector('.toggle-row');
  const parentCard = togglesRow?.closest('.card');
  const comparison = document.getElementById('comparisonTable'); // デジタルID制度の表
  const benchWrap = document.getElementById('benchmarksWrap'); // 国際ベンチマークのラッパ
  if(!togglesRow || !parentCard || !comparison) return;
  if(!document.getElementById('toggleIT')){
    const btn = document.createElement('button');
    btn.id='toggleIT'; btn.type='button'; btn.className='btn-toggle';
    btn.setAttribute('aria-controls','itWrap');
    btn.setAttribute('aria-expanded','false');
    btn.textContent='ITインフラを表示';
    togglesRow.appendChild(btn);
  }
  let itWrap = document.getElementById('itWrap');
  if(!itWrap){
    itWrap = document.createElement('div');
    itWrap.id='itWrap'; itWrap.setAttribute('hidden','');
    itWrap.innerHTML = '<div class="table-wrap"><table id="itTable" class="comparison"></table></div>';
    parentCard.insertBefore(itWrap, benchWrap ? benchWrap.nextSibling : comparison);
  } else {
    if(benchWrap && itWrap.previousSibling !== benchWrap) {
      parentCard.insertBefore(itWrap, benchWrap.nextSibling);
    } else if(!benchWrap && itWrap.nextSibling !== comparison){
      parentCard.insertBefore(itWrap, comparison);
    }
  }
  const btn = document.getElementById('toggleIT');
  if(btn && !btn._wired){
    btn._wired = true;
    btn.addEventListener('click',()=>{
      const willShow = document.getElementById('itWrap').hasAttribute('hidden');
      if(willShow) itWrap.removeAttribute('hidden'); else itWrap.setAttribute('hidden','');
      btn.setAttribute('aria-expanded', String(willShow));
      btn.textContent = willShow ? 'ITインフラを非表示' : 'ITインフラを表示';
    });
  }
}
/* =========================================================
 * Init
 * ======================================================= */
(async function init(){
  const loaders=[
    fetchCSV(`${DATA_DIR}/countries.csv`),
    fetchCSV(`${DATA_DIR}/indicators.csv`),
    fetchCSV(`${DATA_DIR}/country_indicator.csv`),
    fetchCSVOptional(`${DATA_DIR}/country_basic.csv`),
    fetchCSVOptional(`${DATA_DIR}/translations_ja.csv`),
    fetchCSVOptional(`${DATA_DIR}/digital_gov_benchmark_defs.csv`),
    fetchCSVOptional(`${DATA_DIR}/digital_gov_benchmarks.csv`),
    fetchCSVOptional(`${DATA_DIR}/basic_defs.csv`), // A/B/C 定義
  ];
  if(hasCountry) loaders.push(fetchCSVOptional(`${DATA_DIR}/events.csv`));
  const loaded=await Promise.all(loaders);
  countries = loaded[0];
  indicators = loaded[1];
  countryIndicator = loaded[2];
  countryBasic = loaded[3] ?? [];
  const translations = loaded[4] ?? [];
  benchmarkDefs = loaded[5] ?? [];
  digitalGovBenchmarks = loaded[6] ?? [];
  basicDefs = loaded[7] ?? [];
  const eventsLoaded = loaded[8];
  events = hasCountry ? (eventsLoaded ?? []) : [];
  // IT CSV は独立に読み込み（既存 indices に非干渉）
  itDefs = await fetchCSVOptional(`${DATA_DIR}/it_defs.csv`);        // 定義の SoT  [2](https://prefhyogo-my.sharepoint.com/personal/m023903_pref_hyogo_lg_jp/_layouts/15/Doc.aspx?sourcedoc=%7BFF4797DD-EFBF-48F8-80D6-FA687B554676%7D&file=translations_ja.csv&action=default&mobileredirect=true)
  countryIT = await fetchCSVOptional(`${DATA_DIR}/country_it.csv`);  // 値（行）の SoT  [3](https://prefhyogo-my.sharepoint.com/personal/m023903_pref_hyogo_lg_jp/_layouts/15/Doc.aspx?sourcedoc=%7B57A7D41D-3AF6-491D-A7E7-F906E94A32B2%7D&file=it_defs.csv&action=default&mobileredirect=true)

  basicDefsById = new Map((basicDefs ?? []).map(r => [String(r.basic_id ?? '').trim(), r]));
  benchDefsById = new Map((benchmarkDefs ?? []).map(r => [String(r.benchmark_id ?? '').trim(), r]));

  // NEW: IT 定義の辞書化（indicator_id -> 定義）  [2](https://prefhyogo-my.sharepoint.com/personal/m023903_pref_hyogo_lg_jp/_layouts/15/Doc.aspx?sourcedoc=%7BFF4797DD-EFBF-48F8-80D6-FA687B554676%7D&file=translations_ja.csv&action=default&mobileredirect=true)
  itDefsById = new Map((itDefs ?? []).map(r => [String(r.indicator_id ?? '').trim(), r]));

  // translations -> map
  detailJaMap=new Map(); translations.filter(r=>(r.en??'').trim()).forEach(r=>{ detailJaMap.set((r.en??'').trim(), (r.ja??'').trim()); });

  // versions
  const allVersions=unique(countryIndicator.map(r=>r.version).filter(Boolean)).sort().reverse();
  const expectedRows=(countries?.length||0)*(indicators?.length||0);
  const cnt=new Map(); countryIndicator.forEach(r=>{ const v=r.version; if(!v) return; cnt.set(v,(cnt.get(v)||0)+1); });
  const complete=allVersions.filter(v=>(cnt.get(v)||0)===expectedRows); let versions=complete.length?complete:allVersions;
  if(!versions.length && countryBasic && countryBasic.length){
    const basics=unique(countryBasic.map(r=>r.version).filter(Boolean)).sort().reverse();
    if(basics.length) versions=basics;
  }
  if(versionSelect){ versionSelect.innerHTML=''; versions.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; versionSelect.appendChild(o); }); if(versions.length) versionSelect.value=versions[0]; }
  if(versionSelect) versionSelect.addEventListener('change', renderAll);
  if(statusSelect) statusSelect.addEventListener('change', renderAll);
  if(hasComparison){ setupBasicSummaryToggle(); setupBenchmarksToggle(); renderCountryChips(); wireCountryChipActions(); }
  if(hasComparison){ ensureITWrapAndToggle(); }
  renderAll();
})().catch(err=>{ console.error(err); const meta=document.getElementById('meta') ?? document.getElementById('countryMeta'); if(meta) meta.textContent=`エラー：${err.message}`; });
/* =========================================================
 * Render dispatcher ★防御的に実行（比較が失敗しても地図は描く）
 * ======================================================= */
function renderAll(){
  if(hasComparison){
    try { renderComparison(); } catch(e){ console.error('renderComparison failed:', e); }
    try { renderIndicatorDefinitions(); } catch(e){ console.warn('renderIndicatorDefinitions failed', e); }
    if(hasWorldMap){ try { renderWorldMap(); } catch(e){ console.error('renderWorldMap failed:', e); } }
  }
  if(hasCountry){
    try { renderCountryPage(); } catch(e){ console.error('renderCountryPage failed:', e); }
  }
}
/* =========================================================
 * index.html rendering
 * ======================================================= */
function getCountriesByIdMap(){ const map=new Map(); countries.forEach(c=>{ const id=normalizeCountryId(c.country_id); if(id) map.set(id,c); }); return map; }
function getIndicatorByIdMap(){ const map=new Map(); (indicators??[]).forEach(ind=>{ const iid=String(ind.indicator_id??'').trim(); if(iid) map.set(iid,ind); }); return map; }
function renderIndicatorDefinitions(){
  const mount=document.getElementById('indicatorDefinitions'); if(!mount) return; mount.innerHTML='';
  const recs=(indicators??[])
    .filter(r=>String(r.definition_ja??'').trim() && String(r.classification_ja??'').trim())
    .slice()
    .sort((a,b)=>{ const ao=(a.display_order??'')!==''?Number(a.display_order):999; const bo=(b.display_order??'')!==''?Number(b.display_order):999; if(ao!==bo) return ao-bo; return String(a.indicator_id??'').localeCompare(String(b.indicator_id??'')); });
  if(!recs.length){ const none=document.createElement('div'); none.className='detail'; none.textContent='指標定義データ（indicators.csv）がありません。'; mount.appendChild(none); return; }
  function addH3(t){ const h=document.createElement('h3'); h.className='indicator-def-title'; h.textContent=t; mount.appendChild(h);}
  function addH4(t){ const h=document.createElement('h4'); h.className='indicator-def-subtitle'; h.textContent=t; mount.appendChild(h);}
  function wrapTable(t){ const w=document.createElement('div'); w.className='table-wrap indicator-def-wrap'; w.appendChild(t); mount.appendChild(w); }
  recs.forEach(rec=>{
    const name=String(rec.name_ja??rec.name_en??rec.indicator_id??'').trim() || '（名称未設定）';
    addH3(name);
    // A: 項目の定義
    addH4('項目の定義');
    const t1=document.createElement('table'); t1.className='indicator-def-table';
    const tb1=document.createElement('tbody'); const tr1=document.createElement('tr');
    const th1=document.createElement('th'); th1.textContent=name || '—';
    const td1=document.createElement('td'); td1.textContent=(String(rec.definition_ja??'').trim() || '（定義未設定）');
    tr1.appendChild(th1); tr1.appendChild(td1); tb1.appendChild(tr1); t1.appendChild(tb1); wrapTable(t1);
    // B: 分類の定義
    addH4('分類の定義');
    const t2=document.createElement('table'); t2.className='indicator-def-table'; const tb2=document.createElement('tbody');
    const lines=String(rec.classification_ja??'').trim().replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').map(s=>s.trim()).filter(Boolean);
    if(!lines.length){
      const tr=document.createElement('tr'); const th=document.createElement('th'); th.textContent='—';
      const td=document.createElement('td'); td.textContent='（分類定義未設定）';
      tr.appendChild(th); tr.appendChild(td); tb2.appendChild(tr);
    } else {
      lines.forEach(line=>{
        let label=line, desc='';
        if(line.includes('：')){ const i=line.indexOf('：'); label=line.slice(0,i).trim(); desc=line.slice(i+1).trim(); }
        else if(line.includes(':')){ const i=line.indexOf(':'); label=line.slice(0,i).trim(); desc=line.slice(i+1).trim(); }
        const tr=document.createElement('tr'); const th=document.createElement('th'); th.textContent=label || '—';
        const td=document.createElement('td'); td.textContent=desc || '—';
        tr.appendChild(th); tr.appendChild(td); tb2.appendChild(tr);
      });
    }
    t2.appendChild(tb2); wrapTable(t2);
  });
}
function wireCountryChipActions(){
  const btnAll=document.getElementById('selectAllCountries'); const btnNone=document.getElementById('clearAllCountries'); if(!btnAll&&!btnNone) return;
  const allIds=unique(countryIndicator.map(r=>normalizeCountryId(r.country_id))).filter(Boolean).sort();
  if(btnAll){ btnAll.addEventListener('click',()=>{ selectedCountries=new Set(allIds); selectedCountries.add(BASELINE_COUNTRY); document.querySelectorAll('#countryChips input[type=checkbox][data-country]').forEach(cb=>cb.checked=true); renderAll(); }); }
  if(btnNone){ btnNone.addEventListener('click',()=>{ selectedCountries=new Set([BASELINE_COUNTRY]); document.querySelectorAll('#countryChips input[type=checkbox][data-country]').forEach(cb=>cb.checked=false); renderAll(); }); }
}
function renderCountryChips(){
  const chips=document.getElementById('countryChips'); if(!chips) return;
  const byId=getCountriesByIdMap(); selectedCountries.add(BASELINE_COUNTRY);
  const allIds=unique(countryIndicator.map(r=>normalizeCountryId(r.country_id))).filter(Boolean).sort();
  chips.innerHTML='';
  allIds.forEach(id=>{
    if(id===BASELINE_COUNTRY) return;
    const c=byId.get(id) || {};
    const label=document.createElement('label'); label.className='chip';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.setAttribute('data-country',id); cb.checked=selectedCountries.has(id);
    cb.addEventListener('change',()=>{ const cid=normalizeCountryId(cb.getAttribute('data-country')); if(cb.checked) selectedCountries.add(cid); else selectedCountries.delete(cid); selectedCountries.add(BASELINE_COUNTRY); renderComparison(); });
    const span=document.createElement('span'); appendCountryLabel(span,id,c,{size:'20x15'});
    label.appendChild(cb); label.appendChild(span); chips.appendChild(label);
  });
}
/* =========================================================
 * Benchmarks (DG01..DG05) — 行内トグル + 直下定義行
 * ======================================================= */
function buildBenchmarkDefinitionHtml(benchId){
  const rec = benchDefsById.get(String(benchId).trim());
  const label = String(rec?.label ?? benchId).trim();
  const def = String(rec?.definition_ja ?? '').trim();
  const range = String(rec?.score_range ?? '').trim();
  const hb = String(rec?.higher_better ?? '').trim(); // "true"/"false" as string
  const notes = String(rec?.metric_notes_ja ?? '').trim();
  const srcs = parseSourceUrls(rec?.source_url ?? '');
  const srcLine = srcs.length
    ? srcs.map((u,i)=>{ const a=document.createElement('a'); a.href=u; a.target='_blank'; a.rel='noopener'; a.textContent=`出典${i+1}`; return a.outerHTML; }).join(' / ')
    : '出典なし';
  return `
    <div class="defwrap">
      <div class="def-title">【定義】${label}</div>
      <div class="def-body">${def || '（定義未登録）'}</div>
      <div class="def-subtitle">【メトリクス】</div>
      <div class="def-body">範囲：${range || '—'} ／ 向き：${hb===''?'—':(hb==='false'?'小さいほど良い':'大きいほど良い')}</div>
      ${notes ? `<div class="def-body">注記：${notes}</div>` : ''}
      <div class="def-body">${srcLine}</div>
    </div>
  `;
}
function renderBenchmarks(countryIds, version, status){
  const table=document.getElementById('benchmarksTable'); if(!table) return;
  table.style.setProperty('--country-cols', String(countryIds.length));
  // 一覧
  const defs=(benchmarkDefs ?? [])
    .filter(r=>(r.benchmark_id??'').trim())
    .slice()
    .sort((a,b)=>{ const ao=(a.display_order??'')!==''?Number(a.display_order):999; const bo=(b.display_order??'')!==''?Number(b.display_order):999; if(ao!==bo) return ao-bo; return String(a.benchmark_id??'').localeCompare(String(b.benchmark_id??'')); });
  const idsFromData=unique((digitalGovBenchmarks ?? []).map(r=>(r.benchmark_id??'').trim()).filter(Boolean)).sort();
  const benchList = defs.length
    ? defs.map(d=>({ id:(d.benchmark_id??'').trim(), label:((d.label??'').trim() || (d.benchmark_id??'').trim()) }))
    : idsFromData.map(id=>({ id, label:id }));
  // ルックアップ
  const filtered=(digitalGovBenchmarks ?? []).filter(r =>
    r.version===version && r.review_status===status && countryIds.includes(normalizeCountryId(r.country_id))
  );
  const lookup=new Map();
  filtered.forEach(r=>{ const cid=normalizeCountryId(r.country_id); const bid=(r.benchmark_id??'').trim(); if(!cid||!bid) return; lookup.set(`${cid}__${bid}`, r); });
  // 色分け
  function parseFloatLoose(s){ const m=String(s??'').replace(/,/g,'').match(/(-?\d*\.?\d+)/); return m?Number(m[1]):null; }
  function parseRankLoose(s){ const m=String(s??'').match(/Rank\s+(\d+)\s*\/\s*(\d+)/i); return m?Number(m[1]):null; }
  function parseBenchmarkMetric(benchmarkId, valueStr){
    const v=String(valueStr??'').trim(); if(!v) return {metric:null,lowerBetter:false};
    if(/^N\/?A/i.test(v) || /not\s+covered/i.test(v)) return {metric:null,lowerBetter:false};
    const id=String(benchmarkId??'').trim();
    if(id==='DG04') return {metric:parseRankLoose(v), lowerBetter:true}; // IMDは順位
    if(id==='DG01' || id==='DG02' || id==='DG03' || id==='DG05') return {metric:parseFloatLoose(v), lowerBetter:false};
    return {metric:parseFloatLoose(v), lowerBetter:false};
  }
  function buildRankClassMapBenchmark(benchmarkId){
    const vals=[]; let lowerBetter=false;
    countryIds.forEach(cid=>{
      const rec=lookup.get(`${cid}__${benchmarkId}`); if(!rec) return;
      const {main}=splitValue(rec.value);
      const p=parseBenchmarkMetric(benchmarkId, main);
      if(p.metric==null || !Number.isFinite(p.metric)) return;
      lowerBetter=p.lowerBetter; vals.push({cid,metric:p.metric});
    });
    vals.sort((a,b)=> (a.metric-b.metric) || a.cid.localeCompare(b.cid));
    const n=vals.length; const map=new Map(); if(!n) return map;
    if(n===1){ map.set(vals[0].cid,'partial'); return map; }
    if(n===2){
      if(lowerBetter){ map.set(vals[0].cid,'nationwide'); map.set(vals[1].cid,'planned'); }
      else { map.set(vals[0].cid,'planned'); map.set(vals[1].cid,'nationwide'); }
      return map;
    }
    vals.forEach((x,idx)=>{ const bucket=Math.floor(idx*3/n); let cls;
      if(lowerBetter){ cls=bucket===0?'nationwide':(bucket===1?'partial':'planned'); }
      else { cls=bucket===0?'planned':(bucket===1?'partial':'nationwide'); }
      map.set(x.cid, cls);
    });
    return map;
  }
  const rankClassMapByBench=new Map();
  benchList.forEach(b=>{ if(!b.id) return; rankClassMapByBench.set(b.id, buildRankClassMapBenchmark(b.id)); });
  // 描画
  const byId=getCountriesByIdMap();
  table.innerHTML='';
  const thead=document.createElement('thead'); const trh=document.createElement('tr'); const th0=document.createElement('th'); th0.textContent='国際ベンチマーク'; trh.appendChild(th0);
  countryIds.forEach(id=>{ const th=document.createElement('th'); const c=byId.get(id) ?? {}; appendCountryLabel(th,id,c,{size:'20x15', linkToCountryPage:true}); trh.appendChild(th); });
  thead.appendChild(trh); table.appendChild(thead);
  const tbody=document.createElement('tbody');
  benchList.forEach(b=>{
    // データ行
    const tr=document.createElement('tr');
    const th=document.createElement('th');
    const thWrap = document.createElement('div'); thWrap.className='thcell';
    const thTitle = document.createElement('div'); thTitle.className='thtitle'; thTitle.textContent=b.label || b.id;
    const thTools = document.createElement('div'); thTools.className='thtools';
    const btn = document.createElement('button'); btn.type='button'; btn.className='btn-toggle def-toggle'; btn.setAttribute('data-bmk', b.id);
    const isOpen = expandedBenchDefRows.has(b.id);
    btn.setAttribute('aria-expanded', String(isOpen));
    btn.textContent = isOpen ? '定義を非表示' : '定義を表示';
    btn.addEventListener('click',()=>{
      const row=tbody.querySelector(`tr.defrow[data-bmk="${b.id}"]`); if(!row) return;
      const willShow=row.hasAttribute('hidden');
      if(willShow){ row.removeAttribute('hidden'); expandedBenchDefRows.add(b.id); }
      else { row.setAttribute('hidden',''); expandedBenchDefRows.delete(b.id); }
      btn.setAttribute('aria-expanded', String(willShow));
      btn.textContent=willShow ? '定義を非表示' : '定義を表示';
    });
    thTools.appendChild(btn);
    thWrap.appendChild(thTitle); thWrap.appendChild(thTools);
    th.appendChild(thWrap);
    tr.appendChild(th);
    const clsMap=rankClassMapByBench.get(b.id) ?? new Map();
    countryIds.forEach(cid=>{
      const td=document.createElement('td'); const rec=lookup.get(`${cid}__${b.id}`);
      if(!rec){
        td.className='planned';
        const cell=document.createElement('div'); cell.className='cell';
        const v=document.createElement('div'); v.className='value'; v.textContent='—';
        const d=document.createElement('div'); d.className='detail'; d.textContent='データなし';
        cell.appendChild(v); cell.appendChild(d); td.appendChild(cell); tr.appendChild(td);
        return;
      }
      const {main,detail}=splitValue(rec.value);
      const isNA=/^N\/?A/i.test(main) || /not\s+covered/i.test(main);
      td.className = isNA ? 'planned' : (clsMap.size ? (clsMap.get(cid) ?? 'planned') : 'partial');
      const cell=document.createElement('div'); cell.className='cell';
      const v=document.createElement('div'); v.className='value'; v.textContent=main||''; cell.appendChild(v);
      const detailJa=translateDetailToJa(detail); if(detailJa){ const d1=document.createElement('div'); d1.className='detail'; d1.textContent=detailJa; cell.appendChild(d1); }
      const y=String(rec.year??'').trim();
      if(y){ const dy=document.createElement('div'); dy.className='detail'; dy.textContent=`年：${y}`; cell.appendChild(dy); }
      const srcs=parseSourceUrls(rec.source_url); const d2=document.createElement('div'); d2.className='detail';
      if(srcs.length){ srcs.forEach((u,i)=>{ const a=document.createElement('a'); a.href=u; a.target='_blank'; a.rel='noopener'; a.textContent=`出典${i+1}`; d2.appendChild(a); if(i<srcs.length-1) d2.appendChild(document.createTextNode(' / ')); }); }
      else { d2.textContent='出典なし'; }
      // ベンチ部では tags 表示なし
      cell.appendChild(d2); td.appendChild(cell); tr.appendChild(td);
    });
    tbody.appendChild(tr);
    // 定義行（直下1行）
    const defTr=document.createElement('tr'); defTr.className='defrow'; defTr.setAttribute('data-bmk', b.id);
    if(!expandedBenchDefRows.has(b.id)) defTr.setAttribute('hidden','');
    const defTd=document.createElement('td'); defTd.colSpan=1+countryIds.length;
    defTd.innerHTML = buildBenchmarkDefinitionHtml(b.id);
    defTr.appendChild(defTd); tbody.appendChild(defTr);
  });
  table.appendChild(tbody);
}
/* =========================================================
 * IT infrastructure (IT01..IT03) — 3クラス色分け／列幅同期 + 定義トグル（NEW）
 * ======================================================= */
function getITDefOrder(){
  const list = (itDefs ?? []).filter(r=>String(r.indicator_id||'').trim()).slice()
    .sort((a,b)=>{
      const ao=(a.display_order??'')!==''?Number(a.display_order):999;
      const bo=(b.display_order??'')!==''?Number(b.display_order):999;
      if(ao!==bo) return ao-bo;
      return String(a.indicator_id??'').localeCompare(String(b.indicator_id??''));
    });
  return list.map(x=>String(x.indicator_id).trim());
}
function resolveActiveITVersion(uiVersion){
  const versions = Array.from(new Set((countryIT??[]).map(r=>r.version).filter(Boolean))).sort().reverse();
  if(!versions.length) return uiVersion || '';
  const hasForUI = (countryIT??[]).some(r=>r.version===uiVersion);
  return hasForUI ? uiVersion : versions[0];
}
function filterITRows(countryIds, version, status){
  const strict = (countryIT??[]).filter(r=>{
    const cid = normalizeCountryId(r.country_id);
    return r.version===version && countryIds.includes(cid) && (r.review_status===status);
  });
  if(strict.length) return strict;
  return (countryIT??[]).filter(r=>{
    const cid = normalizeCountryId(r.country_id);
    return r.version===version && countryIds.includes(cid);
  });
}
function classForITMain(main){
  const m = String(main??'').trim().toLowerCase();
  if(m==='govnet\u2011common' || m==='govnet-common') return 'nationwide';
  if(m==='govnet\u2011sectoral' || m==='govnet-sectoral') return 'partial';
  if(m==='internet\u2011zt' || m==='internet-zt' || m==='internet + zt') return 'planned';
  return 'partial';
}

// NEW: IT 定義の HTML 生成（I 系と同じレイアウト）  [1](https://prefhyogo-my.sharepoint.com/personal/m023903_pref_hyogo_lg_jp/Documents/Microsoft%20Copilot%20Chat%20%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB/app.js)[2](https://prefhyogo-my.sharepoint.com/personal/m023903_pref_hyogo_lg_jp/_layouts/15/Doc.aspx?sourcedoc=%7BFF4797DD-EFBF-48F8-80D6-FA687B554676%7D&file=translations_ja.csv&action=default&mobileredirect=true)
function buildITDefinitionHtml(iid){
  const rec = itDefsById.get(String(iid).trim());
  const name = String(rec?.label_ja ?? rec?.label_en ?? iid ?? '').trim() || iid;
  const defJa = String(rec?.definition_ja ?? '').trim();
  const classJa = String(rec?.classification_ja ?? '').trim();
  const classLines = classJa
    ? classJa.replace(/\r\n/g,'\n').replace(/\r/g,'\n')
            .split('\n').map(s=>s.trim()).filter(Boolean)
    : [];
  const classList = classLines.length
    ? `<ul class="def-class-list">${classLines.map(l=>`<li>${l}</li>`).join('')}</ul>`
    : '（分類の定義未設定）';
  return `
    <div class="defwrap">
      <div class="def-title">【定義】${name}</div>
      <div class="def-body">${defJa || '（定義未登録）'}</div>
      <div class="def-subtitle">【分類の定義】</div>
      <div class="def-body">${classList}</div>
    </div>
  `;
}

// CHANGED: renderIT — 行見出しに「定義を表示」トグル／直下に定義行追加  [1](https://prefhyogo-my.sharepoint.com/personal/m023903_pref_hyogo_lg_jp/Documents/Microsoft%20Copilot%20Chat%20%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB/app.js)
function renderIT(countryIds, uiVersion, uiStatus){
  const table = document.getElementById('itTable'); if(!table) return;
  const byCountry = getCountriesByIdMap();
  const activeVersion = resolveActiveITVersion(uiVersion);
  const rows = filterITRows(countryIds, activeVersion, uiStatus);
  const lookup = new Map(); rows.forEach(r=>{
    const cid=normalizeCountryId(r.country_id);
    const iid=String(r.indicator_id||'').trim();
    lookup.set(`${cid}__${iid}`, r);
  });
  const order = getITDefOrder();

  // 列幅を他表と同期
  table.style.setProperty('--country-cols', String(countryIds.length));
  table.innerHTML='';

  // thead
  const thead=document.createElement('thead'); const trh=document.createElement('tr');
  const th0=document.createElement('th'); th0.textContent='ITインフラストラクチャー'; trh.appendChild(th0);
  countryIds.forEach(id=>{ const th=document.createElement('th'); const c=byCountry.get(id)??{}; appendCountryLabel(th,id,c,{size:'20x15', linkToCountryPage:true}); trh.appendChild(th); });
  thead.appendChild(trh); table.appendChild(thead);

  const tbody=document.createElement('tbody');

  order.forEach(iid=>{
    const def = itDefsById.get(String(iid).trim()) || {};
    const name = String(def.label_ja ?? def.label_en ?? iid ?? '').trim() || iid;

    // === データ行 ===
    const tr=document.createElement('tr');

    // 左見出し（タイトル + 定義トグル）
    const th=document.createElement('th');
    const thWrap=document.createElement('div'); thWrap.className='thcell';
    const thTitle=document.createElement('div'); thTitle.className='thtitle'; thTitle.textContent=name;
    const thTools=document.createElement('div'); thTools.className='thtools';

    const btn=document.createElement('button'); btn.type='button'; btn.className='btn-toggle def-toggle'; btn.setAttribute('data-iit', iid);
    const isOpen = expandedITDefRows.has(iid);
    btn.setAttribute('aria-expanded', String(isOpen));
    btn.textContent = isOpen ? '定義を非表示' : '定義を表示';
    btn.addEventListener('click', ()=>{
      const row = tbody.querySelector(`tr.defrow[data-iit="${iid}"]`);
      if(!row) return;
      const willShow = row.hasAttribute('hidden');
      if(willShow){ row.removeAttribute('hidden'); expandedITDefRows.add(iid); }
      else { row.setAttribute('hidden',''); expandedITDefRows.delete(iid); }
      btn.setAttribute('aria-expanded', String(willShow));
      btn.textContent = willShow ? '定義を非表示' : '定義を表示';
    });

    thTools.appendChild(btn);
    thWrap.appendChild(thTitle); thWrap.appendChild(thTools);
    th.appendChild(thWrap);
    tr.appendChild(th);

    // 各国セル
    countryIds.forEach(cid=>{
      const td=document.createElement('td'); const rec = lookup.get(`${cid}__${iid}`);
      const cell=document.createElement('div'); cell.className='cell';
      const v=document.createElement('div'); v.className='value';
      const d=document.createElement('div'); d.className='detail';

      if(!rec){
        td.className='planned';
        v.textContent='—'; d.textContent='データなし';
        td.style.opacity='0.6';
      }else{
        const parts = String(rec.value??'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
        const main = (parts[0]??'').trim(); const detail = parts.slice(1).join(' ').trim();
        v.textContent = main || '—';
        d.textContent = detail || '';
        td.className = classForITMain(main);
      }
      cell.appendChild(v); cell.appendChild(d); td.appendChild(cell); tr.appendChild(td);
    });

    tbody.appendChild(tr);

    // === 定義行（直下 1 行） ===
    const defTr=document.createElement('tr'); defTr.className='defrow'; defTr.setAttribute('data-iit', iid);
    if(!expandedITDefRows.has(iid)) defTr.setAttribute('hidden','');
    const defTd=document.createElement('td'); defTd.colSpan = 1 + countryIds.length;
    defTd.innerHTML = buildITDefinitionHtml(iid);
    defTr.appendChild(defTd);
    tbody.appendChild(defTr);
  });

  table.appendChild(tbody);
}
/* =========================================================
 * Comparison table (index.html 中央)
 * ======================================================= */
function renderComparison(){
  const table=document.getElementById('comparisonTable'); if(!table) return;
  selectedCountries.add(BASELINE_COUNTRY);
  const version=versionSelect?.value||''; const status=statusSelect?.value||'published';
  const filtered=countryIndicator.filter(r=>{
    const cid=normalizeCountryId(r.country_id);
    return r.version===version && r.review_status===status && selectedCountries.has(cid);
  });
  const present=Array.from(selectedCountries).map(normalizeCountryId).filter(id=> filtered.some(r=> normalizeCountryId(r.country_id)===id));
  const others=present.filter(id=> id!==BASELINE_COUNTRY).sort();
  const countryIds=[BASELINE_COUNTRY, ...others];
  // 上段の「基本情報」「国際ベンチマーク」→（直後に IT）→ デジタルID制度
  try{ renderBasicSummary(countryIds,version,status);}catch(e){ console.warn('renderBasicSummary failed',e); }
  try{ renderBenchmarks(countryIds,version,status);}catch(e){ console.warn('renderBenchmarks failed',e); }
  try{ ensureITWrapAndToggle(); }catch(e){ console.warn('ensureITWrapAndToggle failed',e); }
  try{ renderIT(countryIds,version,status);}catch(e){ console.warn('renderIT failed',e); }
  table.style.setProperty('--country-cols', String(countryIds.length));
  const byId=getCountriesByIdMap();
  const lookup=new Map(); filtered.forEach(r=>{ const cid=normalizeCountryId(r.country_id); const iid=normalizeId(r.indicator_id); lookup.set(`${cid}__${iid}`, r); });
  const indicatorOrder=indicators.slice()
    .filter(i=>(i.indicator_id??'').trim()!=='I11')
    .sort((a,b)=>{ const ao=a.display_order!=null&&a.display_order!==''?Number(a.display_order):999; const bo=b.display_order!=null&&b.display_order!==''?Number(b.display_order):999; if(ao!==bo) return ao-bo; return (a.indicator_id||'').localeCompare(b.indicator_id||''); });
  table.innerHTML='';
  const thead=document.createElement('thead'); const headTr=document.createElement('tr'); const th0=document.createElement('th'); th0.textContent='デジタルID制度'; headTr.appendChild(th0);
  countryIds.forEach(id=>{ const th=document.createElement('th'); const c=byId.get(id)||{}; appendCountryLabel(th,id,c,{size:'20x15', linkToCountryPage:true}); headTr.appendChild(th); });
  thead.appendChild(headTr); table.appendChild(thead);
  const tbody=document.createElement('tbody'); const indMap=getIndicatorByIdMap();
  indicatorOrder.forEach(ind=>{
    const iid=String(ind.indicator_id??'').trim();
    const name=ind.name_ja || ind.name_en || ind.indicator_id || '';
    const tr=document.createElement('tr'); const th=document.createElement('th');
    const thWrap=document.createElement('div'); thWrap.className='thcell';
    const thTitle=document.createElement('div'); thTitle.className='thtitle'; thTitle.textContent=name;
    const thTools=document.createElement('div'); thTools.className='thtools';
    const btn=document.createElement('button'); btn.type='button'; btn.className='btn-toggle def-toggle'; btn.setAttribute('data-iid',iid);
    const isOpen=expandedDefRows.has(iid); btn.setAttribute('aria-expanded',String(isOpen)); btn.textContent=isOpen?'定義を非表示':'定義を表示';
    btn.addEventListener('click',()=>{
      const row=tbody.querySelector(`tr.defrow[data-iid="${iid}"]`); if(!row) return;
      const willShow=row.hasAttribute('hidden');
      if(willShow){ row.removeAttribute('hidden'); expandedDefRows.add(iid); }
      else { row.setAttribute('hidden',''); expandedDefRows.delete(iid); }
      btn.setAttribute('aria-expanded',String(willShow));
      btn.textContent=willShow?'定義を非表示':'定義を表示';
    });
    thTools.appendChild(btn); thWrap.appendChild(thTitle); thWrap.appendChild(thTools); th.appendChild(thWrap); tr.appendChild(th);
    countryIds.forEach(cid=>{
      const td=document.createElement('td'); const rec=lookup.get(`${cid}__${ind.indicator_id}`);
      if(!rec){
        td.className='planned';
        const cell=document.createElement('div'); cell.className='cell';
        const v=document.createElement('div'); v.className='value'; v.textContent='—';
        const d=document.createElement('div'); d.className='detail'; d.textContent='データなし';
        cell.appendChild(v); cell.appendChild(d); td.appendChild(cell); tr.appendChild(td); return;
      }
      const {main,detail}=splitValue(rec.value); const cls=classify(main); const detailJa=translateDetailToJa(detail);
      td.className=cls; const cell=document.createElement('div'); cell.className='cell';
      const v=document.createElement('div'); v.className='value'; v.textContent=main; cell.appendChild(v);
      const detailJaDiv=detailJa; if(detailJaDiv){ const d1=document.createElement('div'); d1.className='detail'; d1.textContent=detailJaDiv; cell.appendChild(d1); }
      if(rec.tags){ const dTags=document.createElement('div'); dTags.className='detail tagsLine'; dTags.textContent=`tags: ${rec.tags}`; cell.appendChild(dTags); } // ← 表側はtags非表示でも可
      const d2=document.createElement('div'); d2.className='detail';
      const srcs=parseSourceUrls(rec.source_url);
      if(srcs.length){ const s=document.createElement('div'); srcs.forEach((u,i)=>{ const a=document.createElement('a'); a.href=u; a.target='_blank'; a.rel='noopener'; a.textContent=`出典${i+1}`; s.appendChild(a); if(i<srcs.length-1) s.appendChild(document.createTextNode(' / ')); }); d2.appendChild(s); }
      else { const none=document.createElement('div'); none.textContent='出典なし'; d2.appendChild(none); }
      cell.appendChild(d2); td.appendChild(cell); tr.appendChild(td);
    });
    tbody.appendChild(tr);
    const defTr=document.createElement('tr'); defTr.className='defrow'; defTr.setAttribute('data-iid',iid); if(!expandedDefRows.has(iid)) defTr.setAttribute('hidden','');
    const defTd=document.createElement('td'); defTd.colSpan=1+countryIds.length; defTd.innerHTML=buildDefinitionHtmlForIndicator(indMap.get(iid));
    defTr.appendChild(defTd); tbody.appendChild(defTr);
  });
  table.appendChild(tbody);
}
function buildDefinitionHtmlForIndicator(indRec){
  const name = String(indRec?.name_ja ?? indRec?.name_en ?? indRec?.indicator_id ?? '').trim();
  const defJa = String(indRec?.definition_ja ?? '').trim();
  const classJa= String(indRec?.classification_ja ?? '').trim();
  const classLines = classJa ? classJa.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').map(s=>s.trim()).filter(Boolean) : [];
  const classList = classLines.length ? `<ul class="def-class-list">${classLines.map(l=>`<li>${l}</li>`).join('')}</ul>` : '（分類定義未設定）';
  return `<div class="defwrap"><div class="def-title">【定義】${name}</div><div class="def-body">${defJa || '（定義未設定）'}</div><div class="def-subtitle">【分類の定義】</div><div class="def-body">${classList}</div></div>`;
}
/* =========================================================
 * World map
 * ======================================================= */
function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }
function enableMapClickDebugger(mapEl){ if(!MAP_DEBUG || !mapEl) return; mapEl.addEventListener('click', ev=>{ const rect=mapEl.getBoundingClientRect(); const x=((ev.clientX-rect.left)/rect.width)*100; const y=((ev.clientY-rect.top)/rect.height)*100; console.log('[MAP_DEBUG] click x%/y% =', x.toFixed(2), y.toFixed(2)); }); }
function toPercent(v){ const n=Number(v); if(!Number.isFinite(n)) return null; return n; }
function renderWorldMap(){
  const pins=document.getElementById('worldmapPins'); const map=document.getElementById('worldmap'); if(!pins || !map) return; enableMapClickDebugger(map);
  const byId=getCountriesByIdMap(); const available=unique(countryIndicator.map(r=>normalizeCountryId(r.country_id))).filter(Boolean).sort();
  pins.innerHTML='';
  available.forEach(id=>{
    const c=byId.get(id) || {};
    let x=toPercent(c.map_lon), y=toPercent(c.map_lat);
    if(x==null || y==null) return;
    const dx=Number(c.map_dx), dy=Number(c.map_dy);
    if(Number.isFinite(dx)) x+=dx; if(Number.isFinite(dy)) y+=dy;
    x=clamp(x,1,99); y=clamp(y,1,99);
    const a=document.createElement('a'); a.className='map-pin'; a.href=`./country.html?id=${encodeURIComponent(id)}`; a.style.left=`${x}%`; a.style.top=`${y}%`; a.setAttribute('aria-label', `${getCountryName(id,c)} (${id})`);
    const flag=createFlagImgElement(id,c,'20x15'); if(flag) a.appendChild(flag);
    const label=document.createElement('span'); label.className='pin-label'; label.textContent=getCountryName(id,c); a.appendChild(label);
    pins.appendChild(a);
  });
}
/* =========================================================
 * country.html basics + indicators + timeline
 * ======================================================= */
const BASIC_ORDER=['A01','A02','A03','A04','A05','A06','B01','B02','B03','C01','C02','C03'];
const BASIC_LABELS={A01:'人口',A02:'都市化率',A03:'インターネット普及率',A04:'スマホ普及率（代理指標）',A05:'1人あたりGDP',A06:'主要言語数',B01:'国家体制（単一/連邦）',B02:'基礎自治体数',B03:'地方自治の強さ',C01:'政府への信頼度',C02:'プライバシー意識',C03:'デジタル政策の優先度'};
const COLORIZE_COUNTRY_BASICS=false;
function basicCellClass(basicId, main){
  const m=String(main??'').trim();
  if(basicId==='B01'){ if(m.startsWith('単一国家')) return 'nationwide'; if(m.startsWith('連邦国家')) return 'partial'; return 'partial'; }
  if(basicId==='B03'){ const v=m.toLowerCase(); if(v==='strong') return 'nationwide'; if(v==='medium') return 'partial'; if(v==='weak') return 'planned'; return 'partial'; }
  return null;
}
function renderCountryBasics(countryId, version, status){
  const wrap=document.getElementById('countryBasics'); if(!wrap) return; wrap.innerHTML='';
  if(!countryBasic || !countryBasic.length){ const none=document.createElement('div'); none.className='detail'; none.textContent='基本情報データ（country_basic.csv）がありません。'; wrap.appendChild(none); return; }
  const rows=countryBasic.filter(r=> normalizeCountryId(r.country_id)===countryId && r.version===version && r.review_status===status);
  const byId=new Map(rows.map(r=>[normalizeId(r.basic_id), r]));
  BASIC_ORDER.forEach(bid=>{
    const rec=byId.get(bid);
    const item=document.createElement('article'); item.className='basic-item';
    if(COLORIZE_COUNTRY_BASICS){ const bc=basicCellClass(bid, rec?.value ? splitValue(rec.value).main : ''); if(bc) item.classList.add(bc); }
    const head=document.createElement('div'); head.className='basic-head';
    const label=document.createElement('div'); label.className='basic-label'; label.textContent=BASIC_LABELS[bid]??bid;
    const year=document.createElement('div'); year.className='basic-year'; const y=rec?.year??'N/A'; year.textContent=(String(y).trim()&&String(y).trim()!=='N/A')?`年：${y}`:'年：N/A';
    head.appendChild(label); head.appendChild(year); item.appendChild(head);
    const {main,detail}=splitValue(rec?.value ?? 'N/A');
    const v=document.createElement('div'); v.className='basic-value'; v.textContent=(bid==='B02')?formatThousandsIfInt(main):(main||'N/A');
    item.appendChild(v);
    if(detail){ const d=document.createElement('div'); d.className='basic-detail'; d.textContent=detail; item.appendChild(d); }
    const srcs=parseSourceUrls(rec?.source_url ?? ''); const srcWrap=document.createElement('div'); srcWrap.className='basic-sources';
    if(srcs.length){ srcs.forEach((u,i)=>{ const a=document.createElement('a'); a.href=u; a.target='_blank'; a.rel='noopener'; a.textContent=`出典${i+1}`; srcWrap.appendChild(a); if(i<srcs.length-1) srcWrap.appendChild(document.createTextNode(' / ')); }); }
    else { srcWrap.textContent='出典なし'; }
    item.appendChild(srcWrap);
    wrap.appendChild(item);
  });
}
function renderCountryPage(){
  const q=parseQuery(); const countryId=normalizeCountryId(q.id || 'JPN');
  const title=document.getElementById('countryTitle'); const subtitle=document.getElementById('countrySubtitle'); const meta=document.getElementById('countryMeta'); const container=document.getElementById('countryIndicators'); const timeline=document.getElementById('countryEvents');
  const version=versionSelect?.value||''; const status=statusSelect?.value||'published';
  const byId=getCountriesByIdMap(); const c=byId.get(countryId) || {country_id:countryId};
  if(title){ title.innerHTML=''; appendCountryLabel(title,countryId,c,{size:'20x15', showCode:true}); }
  if(subtitle) subtitle.textContent=`version=${version} / status=${status}`;
  renderCountryBasics(countryId,version,status);
  const rows=countryIndicator.filter(r=> normalizeCountryId(r.country_id)===countryId && r.version===version && r.review_status===status);
  const lookup=new Map(rows.map(r=>[normalizeId(r.indicator_id), r]));
  const indicatorOrder=indicators.slice()
    .filter(i=>(i.indicator_id??'').trim()!=='I11')
    .sort((a,b)=>{ const ao=a.display_order!=null&&a.display_order!==''?Number(a.display_order):999; const bo=b.display_order!=null&&b.display_order!==''?Number(b.display_order):999; if(ao!==bo) return ao-bo; return (a.indicator_id||'').localeCompare(b.indicator_id||''); });
  if(meta) meta.textContent='';
  if(container){
    container.innerHTML='';
    indicatorOrder.forEach(ind=>{
      const rec=lookup.get(ind.indicator_id);
      const name=ind.name_ja || ind.name_en || ind.indicator_id || '';
      if(!rec){
        const article=document.createElement('article'); article.className='item planned';
        const h3=document.createElement('h3'); h3.textContent=name;
        const v=document.createElement('div'); v.className='value'; v.textContent='—';
        const d=document.createElement('div'); d.className='detail'; d.textContent='データなし';
        article.appendChild(h3); article.appendChild(v); article.appendChild(d); container.appendChild(article); return;
      }
      const {main,detail}=splitValue(rec.value); const cls=classify(main); const detailJa=translateDetailToJa(detail);
      const article=document.createElement('article'); article.className=`item ${cls}`;
      const h3=document.createElement('h3'); h3.textContent=name;
      const v=document.createElement('div'); v.className='value'; v.textContent=main;
      article.appendChild(h3); article.appendChild(v);
      if(detailJa){ const d1=document.createElement('div'); d1.className='detail'; d1.textContent=detailJa; article.appendChild(d1); }
      if(rec.tags){ const dTags=document.createElement('div'); dTags.className='detail tagsLine'; dTags.textContent=`tags: ${rec.tags}`; article.appendChild(dTags); }
      const srcs=parseSourceUrls(rec.source_url); const d2=document.createElement('div'); d2.className='detail';
      if(srcs.length){ srcs.forEach((u,i)=>{ const a=document.createElement('a'); a.href=u; a.target='_blank'; a.rel='noopener'; a.textContent=`公式出典${i+1}`; d2.appendChild(a); if(i<srcs.length-1) d2.appendChild(document.createTextNode(' / ')); }); }
      else { d2.textContent='出典なし'; }
      article.appendChild(d2);
      container.appendChild(article);
    });
  }
  if(timeline){
    const ev=(events||[]).filter(e=> normalizeCountryId(e.country_id)===countryId).slice().sort((a,b)=>(a.event_date||'').localeCompare(b.event_date||''));
    timeline.innerHTML='';
    if(!ev.length){ const none=document.createElement('div'); none.className='detail'; none.textContent='年表データがありません。'; timeline.appendChild(none); return; }
    const ul=document.createElement('ul'); ul.className='timeline';
    ev.forEach(e=>{
      const li=document.createElement('li');
      const d=document.createElement('div'); d.className='t-date'; d.textContent=e.event_date||'';
      const t=document.createElement('div'); t.className='t-title'; t.textContent=e.title||'';
      const m=document.createElement('div'); m.className='t-meta'; m.textContent=`${e.event_type||''} / ${e.severity||''}`.trim();
      const desc=document.createElement('div'); desc.className='t-desc'; desc.textContent=e.description||'';
      li.appendChild(d); li.appendChild(t); li.appendChild(m); li.appendChild(desc);
      if(e.source_url){ const src=document.createElement('div'); src.className='detail'; const a=document.createElement('a'); a.href=e.source_url; a.target='_blank'; a.rel='noopener'; a.textContent='出典'; src.appendChild(a); li.appendChild(src); }
      ul.appendChild(li);
    });
    timeline.appendChild(ul);
  }
}
/* =========================================================
 * Basic info summary (index) with per-row definition toggle
 * ======================================================= */
const BASIC_SUMMARY_IDS=['A01','A02','A03','A04','A05','A06','B01','B02','B03','C01','C02','C03'];
function buildBasicDefinitionHtml(basicId){
  const rec=basicDefsById.get(String(basicId).trim());
  const label=(BASIC_LABELS[basicId]??basicId);
  const def=String(rec?.definition_ja??'').trim();
  return `<div class="defwrap"><div class="def-title">【定義】${label}</div><div class="def-body">${def || '（定義未登録）'}</div></div>`;
}
function renderBasicSummary(countryIds,version,status){
  const mount=document.getElementById('basicSummary'); if(!mount) return; mount.innerHTML='';
  if(!countryBasic || !countryBasic.length){ const none=document.createElement('div'); none.className='detail'; none.textContent='基本情報データ（country_basic.csv）がありません。'; mount.appendChild(none); return; }
  const lookup=new Map(); countryBasic.filter(r=> r.version===version && r.review_status===status).forEach(r=>{ const cid=normalizeCountryId(r.country_id); const bid=normalizeId(r.basic_id); lookup.set(`${cid}__${bid}`, r); });
  function parseBasicNumber(val){ const {main}=splitValue(val??''); const s=String(main??'').trim(); if(!s || s.toUpperCase()==='N/A' || s==='—') return null; const num=Number(String(s).replace(/,/g,'').replace(/%/g,'').replace(/\s+/g,'')); return Number.isFinite(num)?num:null; }
  function buildRankClassMap(basicId){
    if(basicId==='A06'){
      const map=new Map(); countryIds.forEach(cid=>{ const rec=lookup.get(`${cid}__${basicId}`); const num=parseBasicNumber(rec?.value); if(num==null) return; if(num===1) map.set(cid,'planned'); else if(num===2) map.set(cid,'partial'); else if(num>=3) map.set(cid,'nationwide'); }); return map;
    }
    const vals=[]; countryIds.forEach(cid=>{ const rec=lookup.get(`${cid}__${basicId}`); const num=parseBasicNumber(rec?.value); if(num==null) return; vals.push({cid,num}); });
    vals.sort((a,b)=> (a.num-b.num) || a.cid.localeCompare(b.cid));
    const n=vals.length; const map=new Map(); if(!n) return map;
    if(n===1){ map.set(vals[0].cid,'partial'); return map; }
    if(n===2){ map.set(vals[0].cid,'planned'); map.set(vals[1].cid,'nationwide'); return map; }
    vals.forEach((x,i)=>{ const bucket=Math.floor(i*3/n); const cls=bucket===0?'planned':(bucket===1?'partial':'nationwide'); map.set(x.cid,cls); });
    return map;
  }
  const byCountry=getCountriesByIdMap();
  const wrap=document.createElement('div'); wrap.className='table-wrap';
  const table=document.createElement('table'); table.id='basicSummaryTable'; table.style.setProperty('--country-cols', String(countryIds.length));
  const thead=document.createElement('thead'); const trh=document.createElement('tr'); const th0=document.createElement('th'); th0.textContent='基本情報'; trh.appendChild(th0);
  countryIds.forEach(id=>{ const th=document.createElement('th'); const c=byCountry.get(id)||{}; appendCountryLabel(th,id,c,{size:'20x15', linkToCountryPage: true}); trh.appendChild(th); });
  thead.appendChild(trh); table.appendChild(thead);
  const tbody=document.createElement('tbody');
  BASIC_SUMMARY_IDS.forEach(bid=>{
    const rankClassMap=buildRankClassMap(bid);
    const tr=document.createElement('tr');
    const th=document.createElement('th');
    const thWrap=document.createElement('div'); thWrap.className='thcell';
    const thTitle=document.createElement('div'); thTitle.className='thtitle'; thTitle.textContent=BASIC_LABELS[bid]??bid;
    const thTools=document.createElement('div'); thTools.className='thtools';
    const btn=document.createElement('button'); btn.type='button'; btn.className='btn-toggle def-toggle'; btn.setAttribute('data-bid',bid);
    const isOpen=expandedBasicDefRows.has(bid); btn.setAttribute('aria-expanded',String(isOpen)); btn.textContent=isOpen?'定義を非表示':'定義を表示';
    btn.addEventListener('click',()=>{
      const row=tbody.querySelector(`tr.defrow[data-bid="${bid}"]`); if(!row) return;
      const willShow=row.hasAttribute('hidden');
      if(willShow){ row.removeAttribute('hidden'); expandedBasicDefRows.add(bid); }
      else { row.setAttribute('hidden',''); expandedBasicDefRows.delete(bid); }
      btn.setAttribute('aria-expanded',String(willShow));
      btn.textContent=willShow?'定義を非表示':'定義を表示';
    });
    thTools.appendChild(btn); thWrap.appendChild(thTitle); thWrap.appendChild(thTools); th.appendChild(thWrap); tr.appendChild(th);
    countryIds.forEach(cid=>{
      const rec=lookup.get(`${cid}__${bid}`); const {main,detail}=splitValue(rec?.value ?? 'N/A');
      const td=document.createElement('td'); const fixedCls=basicCellClass(bid, main); const rankCls=rankClassMap.size?(rankClassMap.get(cid)??'planned'):'partial';
      td.className=fixedCls ?? rankCls;
      const cell=document.createElement('div'); cell.className='basic-cell';
      const mainDiv=document.createElement('div'); mainDiv.className='basic-main'; mainDiv.textContent=(bid==='B02')?formatThousandsIfInt(main):(main||'N/A'); cell.appendChild(mainDiv);
      if(detail){ const detailDiv=document.createElement('div'); detailDiv.className='basic-sub basic-detail-inline'; detailDiv.textContent=detail; cell.appendChild(detailDiv); }
      const yearDiv=document.createElement('div'); yearDiv.className='basic-sub'; const y=rec?.year??'N/A'; yearDiv.textContent=(String(y).trim()&&String(y).trim()!=='N/A')?`年：${y}`:'年：N/A'; cell.appendChild(yearDiv);
      const srcDiv=document.createElement('div'); srcDiv.className='basic-sub basic-src';
      const srcs=parseSourceUrls(rec?.source_url??'');
      if(srcs.length){ srcs.forEach((u,i)=>{ const a=document.createElement('a'); a.href=u; a.target='_blank'; a.rel='noopener'; a.textContent=`出典${i+1}`; srcDiv.appendChild(a); if(i<srcs.length-1) srcDiv.appendChild(document.createTextNode(' / ')); }); }
      else { srcDiv.textContent='出典なし'; }
      cell.appendChild(srcDiv); td.appendChild(cell); tr.appendChild(td);
    });
    tbody.appendChild(tr);
    const defTr=document.createElement('tr'); defTr.className='defrow'; defTr.setAttribute('data-bid',bid); if(!expandedBasicDefRows.has(bid)) defTr.setAttribute('hidden','');
    const defTd=document.createElement('td'); defTd.colSpan=1+countryIds.length; defTd.innerHTML=buildBasicDefinitionHtml(bid);
    defTr.appendChild(defTd); tbody.appendChild(defTr);
  });
  table.appendChild(tbody); wrap.appendChild(table); mount.appendChild(wrap);
}