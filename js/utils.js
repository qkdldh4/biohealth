/* ============================================================
   MODULE: utils.js — 공용 헬퍼 · 전역 상태 · 탭 라우팅
   SVG 빌더, 포매터, 위험도 색상 스케일, 기준 주차/지역 상태, 탭 전환
   ============================================================ */

/* ---------- helpers ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function fmt(n,d=0){ if(n==null||isNaN(n)) return '—'; return Number(n).toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d}); }
function pct(n,d=1){ return (n>=0?'+':'')+n.toFixed(d)+'%'; }
function svgW(w,h,inner,extra=''){ return '<svg viewBox="0 0 '+w+' '+h+'" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block;'+extra+'">'+inner+'</svg>'; }
const LEVELS=[[0,[34,197,94]],[30,[234,179,8]],[55,[249,115,22]],[75,[239,68,68]],[100,[200,30,45]]];
function riskColor(s){ s=clamp(s,0,100); for(let i=0;i<LEVELS.length-1;i++){ const a=LEVELS[i],b=LEVELS[i+1];
  if(s<=b[0]){ const t=(s-a[0])/(b[0]-a[0]); return 'rgb('+Math.round(a[1][0]+(b[1][0]-a[1][0])*t)+','+Math.round(a[1][1]+(b[1][1]-a[1][1])*t)+','+Math.round(a[1][2]+(b[1][2]-a[1][2])*t)+')'; } }
  return 'rgb(200,30,45)'; }
function heatC(v){ v=clamp(v,0,1); return 'rgb('+Math.round(9+40*v)+','+Math.round(19+186*v)+','+Math.round(38+202*v)+')'; }
function heatV(v){ v=clamp(v,0,1); return 'rgb('+Math.round(11+150*v)+','+Math.round(18+70*v)+','+Math.round(38+142*v)+')'; }

/* ---------- state ---------- */
const S = { week:'2026-W42', region:'41110', alpha:3.2, gamma:1.8, theta:0.18 };
function weekIdx(wk){ return WEEKS.indexOf(wk); }
function curArr(){ return SERIES[S.week]; }
function topByRisk(n,wk){ return SERIES[wk||S.week].slice().sort((a,b)=>b.risk-a.risk).slice(0,n); }
function regionByCode(c){ return REGIONS.find(r=>r.code===c) || REGIONS[0]; }
const PAIRMAP = new Map();
PAIRS.forEach(p=>{ PAIRMAP.set(p.a.idx+'-'+p.b.idx,p); PAIRMAP.set(p.b.idx+'-'+p.a.idx,p); });
function pairOf(a,b){ return PAIRMAP.get(a.idx+'-'+b.idx); }

/* ---------- tabs ---------- */
const TABS=[['dashboard','대시보드','📊'],['pipeline','데이터 파이프라인','🔌'],['graph','동적 그래프','🕸'],
            ['model','STGCN 엔진','🧠'],['xai','XAI 설명','🔍'],['alerts','조기경보','🚨'],['lora','LoRA & WBS','⚙']];
(function buildTabs(){
  const nav=$('#tabs');
  nav.innerHTML=TABS.map((t,i)=>'<button data-t="'+t[0]+'"'+(i===0?' class="on"':'')+'>'+t[2]+' '+t[1]+'</button>').join('');
  nav.querySelectorAll('button').forEach(b=>b.onclick=()=>goTab(b.dataset.t));
  const sel=$('#weekSel');
  sel.innerHTML=WEEKS.map(w=>'<option value="'+w+'"'+(w===S.week?' selected':'')+'>'+w+'</option>').join('');
  sel.onchange=()=>{ S.week=sel.value; refreshAll(); };
})();
function goTab(id){
  $$('nav.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===id));
  $$('section.tab').forEach(s=>s.classList.toggle('on',s.id==='tab-'+id));
  window.scrollTo({top:0,behavior:'smooth'});
}
window.focusRegion=function(code){
  S.region=code;
  const xs=$('#xaiRegion'); if(xs) xs.value=code;
  const ms=$('#modelRegion'); if(ms) ms.value=code;
  goTab('xai'); renderXAI(); renderModel();
};

