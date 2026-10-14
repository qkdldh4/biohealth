/* ============================================================
   MODULE: alerts.js — 조기경보 (출력물 2)
   경보 스트림 · 급증 클러스터 탐지 · 경보 이력
   ============================================================ */

/* ============================================================
   ALERTS
   ============================================================ */
let alertTimer=null, alertList=[];
function makeAlert(){
  const wi=weekIdx(S.week);
  const arr=SERIES[WEEKS[wi]];
  const r=arr[Math.floor(rnd()*arr.length)];
  const chg=(rnd()*46-10);
  const nw=Math.min(52, wi+2);
  return { id:'ALT-'+S.week.slice(-2)+'-'+Math.floor(rnd()*900+100), target:'2026-W'+String(nw).padStart(2,'0'),
           region:r.region, risk:r.risk, cases:r.cases, chg, lv:riskLevel(r.risk), t:new Date() };
}
function alertCard(a,fresh){
  const c=riskColor(a.risk);
  return '<div class="alert'+(fresh?' new':'')+'"><span class="sev" style="background:'+c+'"></span><div style="flex:1;min-width:0">'
    +'<div class="ttl">'+a.region.sido+' '+a.region.name+' <span class="chip '+a.lv+'">'+a.lv+'</span> '
    +'<span style="font-size:10.5px;color:#5f7595;font-weight:500">'+a.id+'</span></div>'
    +'<div class="meta">target_week <b style="color:#8fb3c9">'+a.target+'</b> · 위험지수 '+a.risk.toFixed(1)+' · 예상 환자 '+fmt(a.cases)+'명 · '
    +'전주 대비 <b style="color:'+(a.chg>=0?'#fb7185':'#4ade80')+'">'+pct(a.chg)+'</b></div></div>'
    +'<div style="font-size:10px;color:#5f7595;white-space:nowrap">'+a.t.toTimeString().slice(0,8)+'</div></div>';
}
function renderAlerts(){
  const arr=curArr();
  const warn=arr.filter(d=>d.risk>=55&&d.risk<75).length;
  const sev=arr.filter(d=>d.risk>=75).length;
  const avgChg=arr.reduce((a,d,i)=>a+d.risk,0)/arr.length;
  $('#alertStats').innerHTML=[
    ['총 발령 경보','k1',fmt(warn+sev)+'<small>건</small>','기준주차 '+S.week],
    ['심각 등급','k3',fmt(sev)+'<small>개 시군구</small>','위험지수 75 이상'],
    ['경고 등급','k2',fmt(warn)+'<small>개 시군구</small>','위험지수 55~75'],
    ['전국 평균 위험지수','k4',avgChg.toFixed(1),'0~100 스케일']
  ].map(k=>'<div class="kpi '+k[1]+'"><div class="lab">'+k[0]+'</div><div class="val">'+k[2]+'</div><div class="foot">'+k[3]+'</div></div>').join('');

  if(!alertList.length) alertList=[makeAlert(),makeAlert(),makeAlert(),makeAlert(),makeAlert()].map(a=>({...a,t:new Date(Date.now()-Math.floor(rnd()*3600e3))}));
  $('#alertFeed').innerHTML=alertList.slice(0,30).map(a=>alertCard(a,false)).join('');

  /* 클러스터 */
  (function(){
    const top=topByRisk(10);
    const cl=[];
    top.forEach(d=>{
      const nb=[];
      PAIRS.forEach(p=>{
        if(p.a.idx===d.region.idx||p.b.idx===d.region.idx){
          const o = p.a.idx===d.region.idx? p.b : p.a;
          const od = arr.find(x=>x.region.idx===o.idx);
          if(od && od.risk>=52) nb.push({r:o,risk:od.risk});
        }
      });
      if(nb.length>=2 && cl.length<6) cl.push({c:d,nb:nb.sort((a,b)=>b.risk-a.risk).slice(0,4)});
    });
    if(!cl.length){ $('#clusterList').innerHTML='<div style="font-size:12px;color:#5f7595;padding:8px 0">해당 주차에 형성된 고위험 클러스터가 없습니다.</div>'; return; }
    $('#clusterList').innerHTML=cl.map((x,i)=>{
      const avg=x.nb.reduce((a,b)=>a+b.risk,0)/x.nb.length;
      return '<div style="border:1px solid #1e2d49;border-radius:10px;padding:11px 12px;margin-bottom:9px;background:#101a2c">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="font-size:12.5px">CLUSTER-'+String(i+1).padStart(2,'0')+'</b>'
      +'<span class="chip '+riskLevel(x.c.risk)+'">'+riskLevel(x.c.risk)+'</span>'
      +'<span style="margin-left:auto;font-size:11px;color:#8298b6">중심 '+x.c.region.name+' · 주변 평균 '+avg.toFixed(1)+'</span></div>'
      +'<div style="font-size:11px;color:#8298b6;margin-bottom:7px">중심 위험지수 '+x.c.risk.toFixed(1)+' · 인접 고위험 '+x.nb.length+'개 시군구</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+x.nb.map(n=>'<span class="chip" style="background:#0e1a2c;color:'+riskColor(n.risk)+';border:1px solid #26375a">'+n.r.name+' '+n.risk.toFixed(1)+'</span>').join('')+'</div></div>';
    }).join('');
  })();

  /* 이력 테이블 */
  (function(){
    const wi=weekIdx(S.week);
    const from=Math.max(0,wi-7);
    let h='<table><thead><tr><th>target_week</th><th class="r">발령 건수</th><th class="r">심각</th><th class="r">최대 변동률</th><th class="c">최고 등급</th></tr></thead><tbody>';
    for(let i=from;i<=wi;i++){
      const wk=WEEKS[i], a=SERIES[wk];
      const cnt=a.filter(d=>d.risk>=55).length, sv=a.filter(d=>d.risk>=75).length;
      const prev= i>0? SERIES[WEEKS[i-1]] : a;
      let mxc=0, mxl='관심';
      a.forEach((d,k)=>{ const c=(d.risk-prev[k].risk)/prev[k].risk*100; if(c>mxc){mxc=c;mxl=riskLevel(d.risk);} });
      h+='<tr><td><b>'+wk.replace('2026-','')+'</b><span style="color:#5f7595;font-size:10px"> '+wk+'</span></td>'
        +'<td class="r">'+cnt+'</td><td class="r">'+sv+'</td><td class="r">'+pct(mxc)+'</td>'
        +'<td class="c"><span class="chip '+mxl+'">'+mxl+'</span></td></tr>';
    }
    $('#alertTable').innerHTML=h+'</tbody></table>';
  })();

  /* 스트림 컨트롤 */
  const btn=$('#alertToggle'), conn=$('#alertConn');
  btn.onclick=()=>{
    if(alertTimer){ clearInterval(alertTimer); alertTimer=null; btn.textContent='실시간 스트림 시작'; btn.classList.add('ghost'); conn.textContent='연결 대기'; conn.style.color='#8298b6'; return; }
    btn.textContent='실시간 스트림 중지'; btn.classList.remove('ghost'); conn.textContent='● WebSocket 연결됨 (/ws/v1/alerts)'; conn.style.color='#4ade80';
    alertTimer=setInterval(()=>{
      const a=makeAlert(); alertList.unshift(a); if(alertList.length>40) alertList.pop();
      const feed=$('#alertFeed'); feed.insertAdjacentHTML('afterbegin',alertCard(a,true));
      if(feed.children.length>30) feed.removeChild(feed.lastChild);
    },1400);
  };
  $('#alertPush').onclick=()=>{
    const a=makeAlert(); alertList.unshift(a);
    const feed=$('#alertFeed'); feed.insertAdjacentHTML('afterbegin',alertCard(a,true));
    if(feed.children.length>30) feed.removeChild(feed.lastChild);
  };
}

