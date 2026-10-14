/* ============================================================
   MODULE: model.js — 예측 엔진 (Step 3)
   STGCN 아키텍처 · Temporal Lag · 예측 vs 실측 · Attention · 성능 지표
   ============================================================ */

/* ============================================================
   STGCN MODEL
   ============================================================ */
function renderModel(){
  /* 아키텍처 */
  (function(){
    const W=900,H=190;
    const box=(x,y,w,h,t,s,c)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="9" fill="'+c+'1c" stroke="'+c+'" stroke-width="1.2"/>'
      +'<text x="'+(x+w/2)+'" y="'+(y+21)+'" text-anchor="middle" font-size="10.5" font-weight="700" fill="'+c+'">'+t+'</text>'
      +(s?'<text x="'+(x+w/2)+'" y="'+(y+36)+'" text-anchor="middle" font-size="8.6" fill="#8298b6">'+s+'</text>':'');
    let g='<defs><marker id="ma" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#3f5878"/></marker></defs>';
    const ar=(x1,x2,y)=>{ let s=''; for(let x=x1;x<x2;x+=10) s+='<path d="M'+x+','+y+' L'+(x+6)+','+y+'" stroke="#3f5878" stroke-width="1.4" marker-end="url(#ma)"/>'; return s; };
    const y=66,h=46;
    g+=box(14,y,138,h,'입력 텐서','B × T × N × C','#4f8cff');
    g+=box(166,y,148,h,'Temporal Conv 1D','Causal GLU · 시차 학습','#22d3ee');
    g+=box(328,y,152,h,'Spatial Graph Conv','Chebyshev · A_t 기반','#a78bfa');
    g+=box(494,y,158,h,'Spatio-Temporal','Attention','#f472b6');
    g+=box(666,y,130,h,'출력 헤드','위험지수 + 환자수','#22c55e');
    g+=ar(152,166,y+h/2)+ar(314,328,y+h/2)+ar(480,494,y+h/2)+ar(652,666,y+h/2);
    g+=box(166,138,148,34,'정적 노드 임베딩 e_i^static','PCA+GMM 산출','#22d3ee');
    g+=box(328,138,152,34,'동적 인접 행렬 A_t','Dynamic Gravity','#f97316');
    g+='<path d="M240,138 L240,112" stroke="#22d3ee" stroke-width="1.2" marker-end="url(#ma)"/>';
    g+='<path d="M404,138 L404,112" stroke="#f97316" stroke-width="1.2" marker-end="url(#ma)"/>';
    g+=box(666,138,220,34,'LoRA Adapter (Temporal Conv)','학습 파라미터 0.33% · 5 Epoch','#eab308');
    g+='<path d="M776,138 L776,112" stroke="#eab308" stroke-width="1.2" marker-end="url(#ma)"/>';
    g+='<text x="14" y="24" font-size="10" font-weight="800" fill="#8298b6">FORWARD PASS · 파라미터 12,480,512 (백본 동결) + 41,216 (LoRA)</text>';
    g+='<text x="14" y="40" font-size="9" fill="#5f7595">Loss = Huber(위험지수) + 0.4 · PoissonNLL(환자수)</text>';
    $('#archDiagram').innerHTML=svgW(W,H,g);
  })();

  /* Lag effect */
  (function(){
    const feats=[['처방량 급증',[0.08,0.19,0.41,0.66,0.52,0.27],'#a78bfa'],
                 ['상대습도 충족',[0.14,0.33,0.58,0.71,0.44,0.21],'#22d3ee'],
                 ['유동인구 유입',[0.05,0.12,0.26,0.38,0.30,0.16],'#22c55e']];
    const W=620,H=250,pl=48,pr=16,pt=18,pb=44;
    const gw=(W-pl-pr)/6;
    const Y=v=>H-pb-v*(H-pt-pb);
    let g='';
    for(let k=0;k<=4;k++){ const v=k/4,y=Y(v);
      g+='<line x1="'+pl+'" y1="'+y.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+y.toFixed(1)+'" stroke="#16223a"/>';
      g+='<text x="'+(pl-6)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" class="axis">'+v.toFixed(2)+'</text>'; }
    for(let L=0;L<6;L++) g+='<text x="'+(pl+L*gw+gw/2).toFixed(1)+'" y="'+(H-pb+15)+'" text-anchor="middle" class="axis">'+(L===0?'동시':'LAG '+L)+'</text>';
    feats.forEach(f=>{
      let p='';
      f[1].forEach((v,L)=>{ const x=pl+L*gw+gw/2, y=Y(v); p+=(L===0?'M':'L')+x.toFixed(1)+','+y.toFixed(1)+' '; });
      g+='<path d="'+p+'" fill="none" stroke="'+f[2]+'" stroke-width="2.1"/>';
      f[1].forEach((v,L)=>{ const x=pl+L*gw+gw/2, y=Y(v);
        g+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="3" fill="'+f[2]+'"><title>'+f[0]+' LAG'+L+' : '+v.toFixed(2)+'</title></circle>'; });
    });
    g+='<line x1="'+(pl+3*gw+gw/2)+'" y1="'+pt+'" x2="'+(pl+3*gw+gw/2)+'" y2="'+(H-pb)+'" stroke="#ef4444" stroke-width="1" stroke-dasharray="3 3"/>';
    g+='<text x="'+(pl+3*gw+gw/2+5)+'" y="'+(pt+11)+'" font-size="8.6" fill="#ef4444">피크 LAG 3주</text>';
    g+='<text x="12" y="'+(pt+8)+'" font-size="9" fill="#8298b6">상관계수</text>';
    $('#lagChart').innerHTML=svgW(W,H,g)+'<div class="legend" style="margin-top:6px">'+feats.map(f=>'<span><i style="background:'+f[2]+'"></i>'+f[0]+'</span>').join('')+'<span style="margin-left:auto;color:#8298b6">처방·습도 신호는 3주 후 확진과 최대 상관</span></div>';
  })();

  /* 예측 vs 실측 */
  (function(){
    const card=$('#predChart').closest('.card');
    if(!$('#modelRegion')){
      const wrap=document.createElement('div');
      wrap.style.cssText='display:flex;gap:8px;align-items:center;margin-bottom:10px;font-size:11px;color:#8298b6';
      wrap.innerHTML='대상 시군구 <select id="modelRegion" style="flex:1"></select>';
      card.insertBefore(wrap,card.querySelector('#predChart'));
      const s=$('#modelRegion');
      s.innerHTML=REGIONS.slice().sort((a,b)=>a.sido.localeCompare(b.sido)||a.name.localeCompare(b.name))
        .map(r=>'<option value="'+r.code+'">'+r.sido+' '+r.name+' ('+r.code+')</option>').join('');
      s.value=S.region;
      s.onchange=()=>{ S.region=s.value; const x=$('#xaiRegion'); if(x)x.value=S.region; renderModel(); renderXAI(); };
    } else { $('#modelRegion').value=S.region; }

    const reg=regionByCode(S.region);
    const wi=weekIdx(S.week);
    const from=Math.max(0,wi-17), to=Math.min(WEEKS.length-1,wi+1);
    const pts=[];
    for(let i=from;i<=to;i++){
      const d=SERIES[WEEKS[i]].find(x=>x.region===reg);
      pts.push({i,wk:WEEKS[i],act:d.actual,pred:d.cases});
    }
    const W=620,H=250,pl=48,pr=16,pt=18,pb=40;
    const mx=Math.max.apply(null,pts.flatMap(p=>[p.pred,p.act==null?0:p.act]))*1.25||1;
    const X=i=>pl+((i-from)/(to-from))*(W-pl-pr);
    const Y=v=>H-pb-(v/mx)*(H-pt-pb);
    let g='';
    for(let k=0;k<=4;k++){ const v=mx*k/4,y=Y(v);
      g+='<line x1="'+pl+'" y1="'+y.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+y.toFixed(1)+'" stroke="#16223a"/>';
      g+='<text x="'+(pl-6)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" class="axis">'+Math.round(v)+'</text>'; }
    pts.forEach((p,k)=>{ if(k%4===0) g+='<text x="'+X(p.i).toFixed(1)+'" y="'+(H-pb+15)+'" text-anchor="middle" class="axis">W'+p.wk.slice(-2)+'</text>'; });
    let band='';
    pts.forEach((p,k)=>{ band+=(k===0?'M':'L')+X(p.i).toFixed(1)+','+Y(p.pred*1.22).toFixed(1)+' '; });
    for(let k=pts.length-1;k>=0;k--) band+='L'+X(pts[k].i).toFixed(1)+','+Y(pts[k].pred*0.78).toFixed(1)+' ';
    band+='Z';
    g+='<path d="'+band+'" fill="#22d3ee" fill-opacity=".1"/>';
    g+='<path d="'+pts.map((p,k)=>(k===0?'M':'L')+X(p.i).toFixed(1)+','+Y(p.pred).toFixed(1)).join(' ')+'" fill="none" stroke="#22d3ee" stroke-width="1.8" stroke-dasharray="5 3"/>';
    const ac=pts.filter(p=>p.act!=null);
    if(ac.length) g+='<path d="'+ac.map((p,k)=>(k===0?'M':'L')+X(p.i).toFixed(1)+','+Y(p.act).toFixed(1)).join(' ')+'" fill="none" stroke="#a78bfa" stroke-width="2.2"/>';
    const last=pts[pts.length-1];
    g+='<circle cx="'+X(last.i).toFixed(1)+'" cy="'+Y(last.pred).toFixed(1)+'" r="4" fill="#eab308" stroke="#070b14" stroke-width="1.6"/>';
    g+='<text x="'+(X(last.i)-6).toFixed(1)+'" y="'+(Y(last.pred)-9).toFixed(1)+'" text-anchor="end" font-size="9.5" font-weight="700" fill="#eab308">'+fmt(last.pred)+'명</text>';
    $('#predChart').innerHTML='<div style="font-size:11px;color:#8298b6;margin-bottom:6px">'+reg.sido+' '+reg.name+' ('+reg.code+') · 평균고도 '+fmt(reg.elev)+'m · 기준주차 '+S.week+'</div>'+svgW(W,H,g);
  })();

  /* 예상 환자수 상위 */
  (function(){
    const rows=curArr().slice().sort((a,b)=>b.cases-a.cases).slice(0,18);
    const W=620,rowH=19,H=rows.length*rowH+14,pl=88,pr=52;
    const mx=rows[0].cases||1;
    let g='';
    rows.forEach((d,i)=>{
      const y=i*rowH+4, bw=(d.cases/mx)*(W-pl-pr);
      g+='<text x="'+(pl-7)+'" y="'+(y+11)+'" text-anchor="end" font-size="9.6" fill="#9fb3cd">'+d.region.name+'</text>';
      g+='<rect x="'+pl+'" y="'+y+'" width="'+(W-pl-pr)+'" height="11" rx="3" fill="#0e1a2c"/>';
      g+='<rect x="'+pl+'" y="'+y+'" width="'+bw.toFixed(1)+'" height="11" rx="3" fill="'+riskColor(d.risk)+'" fill-opacity=".85"><title>'+d.region.name+' · '+fmt(d.cases)+'명 · 위험지수 '+d.risk.toFixed(1)+'</title></rect>';
      g+='<text x="'+(pl+bw+6).toFixed(1)+'" y="'+(y+10)+'" font-size="9.6" font-weight="700" fill="#cfe0f2">'+fmt(d.cases)+'</text>';
    });
    $('#caseBar').innerHTML=svgW(W,H,g);
  })();

  /* Attention heatmap */
  (function(){
    const labels=['W+1','W+2','W+3','W+4','W+5','W+6','W+7','W+8','W+9','W+10','W+11','W+12'];
    const regs=topByRisk(14);
    const cw=27,ch=19,pl=78,pt=64;
    const W=pl+regs.length*cw+20,H=pt+labels.length*ch+18;
    const mx=Math.max.apply(null,ATT.flat());
    let g='';
    regs.forEach((d,j)=>g+='<text transform="translate('+(pl+j*cw+cw/2).toFixed(1)+','+(pt-6)+') rotate(-50)" text-anchor="start" font-size="8.4" fill="#9fb3cd">'+d.region.name.slice(0,4)+'</text>');
    labels.forEach((l,i)=>{
      g+='<text x="'+(pl-6)+'" y="'+(pt+i*ch+13)+'" text-anchor="end" font-size="9" fill="#9fb3cd">'+l+'</text>';
      regs.forEach((d,j)=>{
        const v=ATT[i][j]/mx;
        g+='<rect class="heat-cell" x="'+(pl+j*cw).toFixed(1)+'" y="'+(pt+i*ch).toFixed(1)+'" width="'+cw+'" height="'+ch+'" fill="'+heatV(v)+'"><title>'+l+' × '+d.region.name+' : '+ATT[i][j].toFixed(2)+'</title></rect>';
      });
    });
    $('#attHeat').innerHTML=svgW(W,H,g)+'<div class="note">예측 기준주차 기준으로 W+3~W+5 구간과 위험 상위 지역에 가중치가 집중되며, 이는 관측된 LAG 효과와 일치합니다.</div>';
  })();

  /* 성능 지표 */
  (function(){
    const rows=[
      ['MAE (위험지수)','8.41','6.92','−17.7%'],
      ['RMSE (위험지수)','11.36','9.18','−19.2%'],
      ['MAE (환자수)','2.87','2.31','−19.5%'],
      ['MAPE','12.8%','10.4%','−2.4%p'],
      ['R² (결정계수)','0.781','0.846','+0.065'],
      ['Spearman 순위상관','0.803','0.871','+0.068'],
      ['주간 학습 시간','—','48초','5 Epoch'],
      ['학습 파라미터','12,480,512','41,216','0.33%']
    ];
    let h='<table><thead><tr><th>지표</th><th class="r">STGCN 백본</th><th class="r">+ LoRA 미세조정</th><th class="r">개선</th></tr></thead><tbody>';
    rows.forEach(r=>{
      const good=r[3].indexOf('−')===0||r[3].indexOf('+')===0;
      h+='<tr><td>'+r[0]+'</td><td class="r" style="color:#9fb3cd">'+r[1]+'</td><td class="r"><b>'+r[2]+'</b></td><td class="r"><span style="color:'+(good?'#4ade80':'#8298b6')+';font-weight:700">'+r[3]+'</span></td></tr>';
    });
    $('#metricsTable').innerHTML=h+'</tbody></table><div class="note">홀드아웃 검증(최근 12주) · 모의 산출값. LoRA 적용 후 모든 오차 지표가 개선되며, 순위 상관이 향상되어 고위험 시군구 식별 정확도가 높아집니다.</div>';
  })();
}

