/* ============================================================
   smoke-test.mjs — jsdom 기반 렌더/상호작용 스모크 테스트
   실행:  npm install jsdom && node test/smoke-test.mjs
   검증:  33개 렌더 지점 + 탭 전환 · 주차 변경 · 슬라이더 · 지역 선택 · 경보 · LoRA
   기대:  모든 항목 OK, ERRORS (0)
   ============================================================ */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const errs = [];

const dom = new JSDOM(html, {
  url: 'file://' + root + '/index.html',
  runScripts: 'dangerously',
  resources: 'usable',          // 외부 css/js 를 실제로 로드하여 검증
  pretendToBeVisual: true,
  beforeParse(w) {
    w.addEventListener('error', e => errs.push('ERR: ' + (e.message || e.error)));
    w.console.error = (...a) => errs.push('console.error: ' + a.join(' '));
    w.scrollTo = () => {};
  }
});

await new Promise(r => {
  if (dom.window.document.readyState === 'complete') return r();
  dom.window.addEventListener('load', r);
  setTimeout(r, 4000);
});

const d = dom.window.document, q = s => d.querySelector(s), out = [];
function chk(name, sel) {
  const el = q(sel);
  out.push((el && el.innerHTML.trim().length > 50 ? 'OK  ' : 'FAIL') + '  ' + name +
           '  (' + (el ? el.innerHTML.length : 0) + ' chars)');
}
[['KPI cards','#kpiRow'],['Map svg','#mapWrap'],['Donut','#riskDonut'],['Top regions','#topRegions'],
 ['Trend chart','#trendChart'],['Sido bars','#sidoBars'],['Source grid','#sourceGrid'],
 ['Tier diagram','#tierDiagram'],['PCA chart','#pcaChart'],['GMM chart','#gmmChart'],
 ['Embed heat','#embedHeat'],['Feat table','#featTable'],['Adj heat','#adjHeat'],
 ['Graph stats','#graphStats'],['Edge list','#edgeList'],['Elev chart','#elevChart'],
 ['Arch diagram','#archDiagram'],['Lag chart','#lagChart'],['Pred chart','#predChart'],
 ['Case bar','#caseBar'],['Att heat','#attHeat'],['Metrics table','#metricsTable'],
 ['XAI meta','#xaiMeta'],['XAI bars','#xaiBars'],['XAI waterfall','#xaiWaterfall'],
 ['XAI narrative','#xaiNarrative'],['Alert stats','#alertStats'],['Alert feed','#alertFeed'],
 ['Cluster list','#clusterList'],['Alert table','#alertTable'],['Loss chart','#lossChart'],
 ['WBS timeline','#wbsTimeline'],['Stack list','#stackList']
].forEach(([n,s]) => chk(n,s));

const tabs = [...d.querySelectorAll('nav.tabs button')];
out.push('tabs: ' + tabs.length);
tabs.forEach(b => b.onclick && b.onclick());
out.push('active section: ' + (d.querySelector('section.tab.on') || {}).id);

const ws = q('#weekSel'); ws.value = '2026-W46'; ws.onchange && ws.onchange();
out.push('week switch -> ' + q('#weekLabel').textContent);
const g = q('#gAlpha'); g.value = '6.5'; g.oninput && g.oninput();
out.push('alpha slider -> ' + q('#gAlphaVal').textContent);
const xs = q('#xaiRegion'); xs.value = '42190'; xs.onchange && xs.onchange();
out.push('xai region switch -> meta ' + q('#xaiMeta').innerHTML.length + ' chars');
const ms = q('#modelRegion'); ms.value = '31110'; ms.onchange && ms.onchange();
out.push('model region switch -> ok');
q('#alertPush').onclick && q('#alertPush').onclick();
out.push('alert push -> feed children ' + q('#alertFeed').children.length);
q('#loraRun').onclick && q('#loraRun').onclick();
out.push('lora run -> started');
q('nav.tabs button[data-t="xai"]').onclick();

console.log(out.join('\n'));
console.log('\n--- ERRORS (' + errs.length + ') ---');
console.log(errs.slice(0, 25).join('\n'));
process.exit(errs.length ? 1 : 0);
