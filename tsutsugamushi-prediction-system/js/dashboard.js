/* ============================================================
   MODULE: dashboard.js — 대시보드 (출력물 1: 주간 위험 지도)
   KPI · 버블 위험지도 · 위험등급 도넛 · Top10 · 52주 트렌드 · 시도별 바
   ============================================================ */

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard(){
  const wk=S.week, wi=weekIdx(wk), arr=curArr();
  const cur=arr.reduce((a,d)=>a+d.cases,0);
  const prev= wi>0 ? SERIES[WEEKS[wi-1]].reduce((a,d)=>a+d.cases,0) : cur;
  const chg= prev? (cur-prev)/prev*100 : 0;
  const warn=arr.filter(d=>d.risk>=55&&d.risk<75).length;
  const sev=arr.filter(d=>d.risk>=75).length;
  const top=arr.slice().sort((a,b)=>b.risk-a.risk)[0];
  const avg=arr.reduce((a,d)=>a+d.risk,0)/arr.length;
  const acc = 1 - (0.112 + 0.018*Math.sin(wi/4));

  $('#weekLabel').textContent = wk + ' 기준 · 전국 ' + arr.length + '개 시군구';
  $('#kpiRow').innerHTML = [
    ['다음 주 전국 예상 환자 수','k1',fmt(cur)+'<small>명</small>',(chg>=0?'▲ ':'▼ ')+Math.abs(chg).toFixed(1)+'% 전주 대비 (모의)'],
    ['최고 위험 시군구','k3',top.region.name+' <small>'+top.risk.toFixed(1)+'</small>','<span class="chip '+riskLevel(top.risk)+'">'+riskLevel(top.risk)+'</span> · 예상 '+fmt(top.cases)+'명'],
    ['경고·심각 등급 시군구','k2','<span class="hl2">'+(warn+sev)+'</span><small>개</small>','경고 '+warn+' · 심각 '+sev+' · 전국 평균 위험지수 '+avg.toFixed(1)],
    ['모델 예측 정확도','k4',(acc*100).toFixed(1)+'<small>%</small>','1 − MAPE 기준 · 홀드아웃 검증(모의)']
  ].map(k=>'<div class="kpi '+k[1]+'"><div class="lab">'+k[0]+'</div><div class="val">'+k[2]+'</div><div class="foot">'+k[3]+'</div></div>').join('');

  renderMap(); renderDonut(); renderTopRegions(); renderTrend(); renderSidoBars();
}

/* ---------- 지도 ---------- */
const MB={minLng:125.8,maxLng:129.7,minLat:33.0,maxLat:38.7};
const OUTLINE=[[126.62,37.80],[126.75,37.95],[126.95,38.15],[127.15,38.30],[127.45,38.32],[127.70,38.30],[127.90,38.35],[128.10,38.45],[128.35,38.60],[128.55,38.35],[128.62,38.10],[128.90,37.55],[129.05,37.10],[129.30,36.30],[129.42,35.75],[129.45,35.30],[129.35,35.05],[129.10,34.90],[128.85,34.85],[128.60,34.80],[128.35,34.90],[128.05,34.80],[127.80,34.55],[127.55,34.35],[127.30,34.30],[127.00,34.28],[126.75,34.32],[126.50,34.40],[126.28,34.55],[126.35,34.75],[126.48,34.90],[126.55,35.10],[126.42,35.28],[126.30,35.50],[126.42,35.72],[126.52,35.95],[126.40,36.15],[126.50,36.40],[126.42,36.65],[126.58,36.90],[126.55,37.15],[126.62,37.40],[126.55,37.62],[126.62,37.80]];
const JEJU=[[126.20,33.35],[126.35,33.55],[126.60,33.60],[126.85,33.55],[127.00,33.45],[126.95,33.28],[126.70,33.22],[126.45,33.20],[126.20,33.35]];
const MMW=390, MMH=672, MSC=(MMH-44)/633, MOX=22, MOY=22;
function proj(lat,lng){ return [MOX+(lng-MB.minLng)*90*MSC, MOY+(MB.maxLat-lat)*111*MSC]; }
function renderMap(){
  const arr=curArr();
  const outline='M'+OUTLINE.map(p=>proj(p[1],p[0]).join(',')).join(' L')+' Z';
  const jeju='M'+JEJU.map(p=>proj(p[1],p[0]).join(',')).join(' L')+' Z';
  let inner='<defs><filter id="gl" x="-60%" y="-60%" width="220%" height="220%">'
    +'<feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
    +'<linearGradient id="landg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#132238"/><stop offset="1" stop-color="#0c1727"/></linearGradient></defs>';
  inner+='<path d="'+outline+'" fill="url(#landg)" stroke="#2b3f60" stroke-width="1.1"/>';
  inner+='<path d="'+jeju+'" fill="url(#landg)" stroke="#2b3f60" stroke-width="1.1"/>';
  const maxC=Math.max.apply(null,arr.map(d=>d.cases));
  const sorted=arr.slice().sort((a,b)=>b.risk-a.risk);
  const labelSet=new Set(sorted.slice(0,7).map(d=>d.region.code));
  let labels='';
  sorted.forEach(d=>{
    const [x,y]=proj(d.region.lat,d.region.lng);
    const r=clamp(3.4+Math.sqrt(d.cases/maxC)*15,3.4,17.5);
    inner+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r.toFixed(1)+'" fill="'+riskColor(d.risk)+'" fill-opacity="0.5" stroke="'+riskColor(d.risk)+'" stroke-width="1.2" filter="url(#gl)" style="cursor:pointer" onclick="focusRegion(\''+d.region.code+'\')"><title>'+d.region.name+' ('+d.region.code+')&#10;위험지수 '+d.risk.toFixed(1)+' · '+riskLevel(d.risk)+'&#10;예상 환자 '+fmt(d.cases)+'명</title></circle>';
    if(labelSet.has(d.region.code)){
      const lx = d.region.lng>128.6 ? x-r-4 : x+r+4;
      labels+='<text x="'+lx.toFixed(1)+'" y="'+(y+3).toFixed(1)+'" font-size="8.6" fill="#cfe0f2" text-anchor="'+(d.region.lng>128.6?'end':'start')+'" style="pointer-events:none">'+d.region.name+'</text>';
    }
  });
  $('#mapWrap').innerHTML = svgW(MMW,MMH,inner+labels+'<text x="14" y="'+ (MMH-8) +'" font-size="8.5" fill="#5f7595">투영: 위경도 등거리(1°경도≈90km, 1°위도≈111km) · 경계는 개략 형상</text>');
}

/* ---------- 도넛 ---------- */
function renderDonut(){
  const arr=curArr();
  const order=['관심','주의','경고','심각'];
  const cnt=order.map(l=>({l,n:arr.filter(d=>riskLevel(d.risk)===l).length}));
  const total=arr.length, R=62, r=42, cx=90, cy=90;
  let a0=-Math.PI/2, inner='';
  cnt.forEach(c=>{
    const frac=c.n/total, a1=a0+frac*Math.PI*2;
    const p=(ang,rad)=>[(cx+Math.cos(ang)*rad).toFixed(2),(cy+Math.sin(ang)*rad).toFixed(2)];
    const big=frac>0.5?1:0;
    if(c.n>0){
      const A=p(a0,R),B=p(a1,R),C=p(a1,r),D=p(a0,r);
      inner+='<path d="M'+A+' A'+R+','+R+' 0 '+big+' 1 '+B+' L'+C+' A'+r+','+r+' 0 '+big+' 0 '+D+' Z" fill="'+LEVEL_COLOR[c.l]+'" fill-opacity=".82" stroke="#0b1220" stroke-width="1"/>';
    }
    a0=a1;
  });
  inner+='<text x="'+cx+'" y="'+(cy-4)+'" text-anchor="middle" font-size="22" font-weight="800" fill="#e6edf7">'+total+'</text>';
  inner+='<text x="'+cx+'" y="'+(cy+13)+'" text-anchor="middle" font-size="9" fill="#8298b6">전국 시군구</text>';
  const subEl=$('#donutSub'); if(subEl) subEl.textContent='전국 시군구 '+total+'개 기준';
  let lg='<div style="display:grid;gap:7px;margin-top:6px">';
  cnt.forEach(c=>{ lg+='<div style="display:flex;align-items:center;gap:8px;font-size:11.5px"><i style="width:9px;height:9px;border-radius:3px;background:'+LEVEL_COLOR[c.l]+';display:inline-block"></i><span style="flex:1;color:#8298b6">'+c.l+'</span><b style="font-variant-numeric:tabular-nums">'+c.n+'개</b><span style="color:#5f7595;width:44px;text-align:right">'+(c.n/total*100).toFixed(1)+'%</span></div>'; });
  lg+='</div>';
  $('#riskDonut').innerHTML = '<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div style="width:180px;flex:none">'+svgW(180,180,inner)+'</div><div style="flex:1;min-width:150px">'+lg+'</div></div>';
}

/* ---------- 상위 지역 ---------- */
function renderTopRegions(){
  const top=topByRisk(10);
  let h='<table><thead><tr><th>#</th><th>시군구</th><th class="c">등급</th><th class="r">위험지수</th><th class="r">예상 환자</th></tr></thead><tbody>';
  top.forEach((d,i)=>{
    h+='<tr style="cursor:pointer" onclick="focusRegion(\''+d.region.code+'\')"><td style="color:#5f7595">'+(i+1)+'</td>'
      +'<td><b>'+d.region.name+'</b><span style="color:#5f7595;font-size:10px"> '+d.region.sido+' · '+d.region.code+'</span></td>'
      +'<td class="c"><span class="chip '+riskLevel(d.risk)+'">'+riskLevel(d.risk)+'</span></td>'
      +'<td class="r"><b style="color:'+riskColor(d.risk)+'">'+d.risk.toFixed(1)+'</b></td>'
      +'<td class="r">'+fmt(d.cases)+'</td></tr>';
  });
  $('#topRegions').innerHTML=h+'</tbody></table>';
}

/* ---------- 트렌드 ---------- */
function renderTrend(){
  const W=660,H=250,pl=52,pr=16,pt=16,pb=30;
  const rows=WEEKS.map((wk,i)=>{
    const arr=SERIES[wk]; let pred=0,act=0,has=false;
    arr.forEach(d=>{ pred+=d.cases; if(d.actual!=null){ act+=d.actual; has=true; } });
    return {wk,pred,act:has?act:null,i};
  });
  const all=rows.flatMap(r=>[r.pred,r.act==null?0:r.act]);
  const mx=Math.max.apply(null,all)*1.12, mn=0;
  const X=i=>pl+(i/(rows.length-1))*(W-pl-pr);
  const Y=v=>H-pb-((v-mn)/(mx-mn))*(H-pt-pb);
  let g='';
  for(let k=0;k<=4;k++){ const v=mn+(mx-mn)*k/4, y=Y(v);
    g+='<line x1="'+pl+'" y1="'+y.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+y.toFixed(1)+'" stroke="#182742" stroke-width="1"/>';
    g+='<text x="'+(pl-7)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" class="axis">'+fmt(Math.round(v))+'</text>'; }
  rows.forEach((r,i)=>{ if(i%6===0){ const x=X(i);
    g+='<line x1="'+x.toFixed(1)+'" y1="'+pt+'" x2="'+x.toFixed(1)+'" y2="'+(H-pb)+'" stroke="#141f36" stroke-width="1"/>';
    g+='<text x="'+x.toFixed(1)+'" y="'+(H-pb+14)+'" text-anchor="middle" class="axis">W'+r.wk.slice(-2)+'</text>'; } });
  /* 예측 구간 */
  let band='', dline='', aline='';
  rows.forEach((r,i)=>{ const x=X(i), up=Y(r.pred*1.18), dn=Y(r.pred*0.82);
    band += (i===0?'M':'L')+x.toFixed(1)+','+up.toFixed(1)+' '; });
  for(let i=rows.length-1;i>=0;i--){ const r=rows[i]; band+='L'+X(i).toFixed(1)+','+Y(r.pred*0.82).toFixed(1)+' '; }
  band+='Z';
  dline = rows.map((r,i)=>(i===0?'M':'L')+X(i).toFixed(1)+','+Y(r.pred).toFixed(1)).join(' ');
  const acts=rows.filter(r=>r.act!=null);
  aline = acts.map((r,i)=>(i===0?'M':'L')+X(r.i).toFixed(1)+','+Y(r.act).toFixed(1)).join(' ');
  g+='<path d="'+band+'" fill="#22d3ee" fill-opacity="0.10"/>';
  g+='<path d="'+dline+'" fill="none" stroke="#22d3ee" stroke-width="1.8" stroke-dasharray="5 3"/>';
  g+='<path d="'+aline+'" fill="none" stroke="#a78bfa" stroke-width="2.1"/>';
  /* 예측 시작 지점 */
  const sw=42, xs=X(sw);
  g+='<line x1="'+xs.toFixed(1)+'" y1="'+pt+'" x2="'+xs.toFixed(1)+'" y2="'+(H-pb)+'" stroke="#f97316" stroke-width="1" stroke-dasharray="3 3"/>';
  g+='<text x="'+(xs+4).toFixed(1)+'" y="'+(pt+10)+'" font-size="8.5" fill="#f97316">예측 구간 시작 (W43)</text>';
  const sel=weekIdx(S.week), sx=X(sel);
  g+='<line x1="'+sx.toFixed(1)+'" y1="'+pt+'" x2="'+sx.toFixed(1)+'" y2="'+(H-pb)+'" stroke="#eab308" stroke-width="1.2"/>';
  g+='<circle cx="'+sx.toFixed(1)+'" cy="'+Y(rows[sel].pred).toFixed(1)+'" r="3.6" fill="#eab308" stroke="#070b14" stroke-width="1.5"/>';
  const selRow=rows[sel];
  g+='<rect x="'+(sx-1).toFixed(1)+'" y="'+(pt)+'" width="0" height="0"/>';
  let lg='<div class="legend" style="margin-top:8px"><span><i style="background:#a78bfa"></i>실측 확진자 수</span><span><i style="background:#22d3ee"></i>STGCN 예측</span><span><i style="background:rgba(34,211,238,.25)"></i>95% 예측구간</span><span style="margin-left:auto;color:#8298b6">선택 주차 '+S.week+' · 전국 예상 '+fmt(selRow.pred)+'명</span></div>';
  $('#trendChart').innerHTML=svgW(W,H,g)+lg;
}

/* ---------- 시도 바 ---------- */
function renderSidoBars(){
  const arr=curArr(), m={};
  arr.forEach(d=>{ (m[d.region.sido]=m[d.region.sido]||[]).push(d.risk); });
  const rows=Object.keys(m).map(k=>({k,avg:m[k].reduce((a,b)=>a+b,0)/m[k].length,n:m[k].length})).sort((a,b)=>b.avg-a.avg);
  const W=600, rowH=21, H=rows.length*rowH+18, pl=76, pr=64;
  let g='';
  rows.forEach((r,i)=>{
    const y=i*rowH+6, bw=(r.avg/100)*(W-pl-pr);
    g+='<text x="'+(pl-8)+'" y="'+(y+12)+'" text-anchor="end" font-size="10.5" fill="#9fb3cd">'+r.k+'</text>';
    g+='<rect x="'+pl+'" y="'+y+'" width="'+(W-pl-pr)+'" height="13" rx="3" fill="#0e1a2c"/>';
    g+='<rect x="'+pl+'" y="'+y+'" width="'+bw.toFixed(1)+'" height="13" rx="3" fill="'+riskColor(r.avg)+'" fill-opacity=".85"/>';
    g+='<text x="'+(pl+bw+7).toFixed(1)+'" y="'+(y+11)+'" font-size="10.5" font-weight="700" fill="'+riskColor(r.avg)+'">'+r.avg.toFixed(1)+'</text>';
    g+='<text x="'+(W-4)+'" y="'+(y+11)+'" text-anchor="end" font-size="9" fill="#5f7595">'+r.n+'개</text>';
  });
  $('#sidoBars').innerHTML=svgW(W,H,g);
}

