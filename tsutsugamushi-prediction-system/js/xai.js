/* ============================================================
   MODULE: xai.js — 설명가능 AI (출력물 3)
   Integrated Gradients 기여도 · 워터폴 · 방역 의사결정 해설
   ============================================================ */

/* ============================================================
   XAI
   ============================================================ */
(function initXaiSelect(){
  const s=$('#xaiRegion');
  s.innerHTML=REGIONS.slice().sort((a,b)=>a.sido.localeCompare(b.sido)||a.name.localeCompare(b.name))
    .map(r=>'<option value="'+r.code+'">'+r.sido+' '+r.name+' ('+r.code+')</option>').join('');
  s.value=S.region;
  s.onchange=()=>{ S.region=s.value; const m=$('#modelRegion'); if(m)m.value=S.region; renderXAI(); renderModel(); };
})();
function renderXAI(){
  const reg=regionByCode(S.region);
  const d=curArr().find(x=>x.region===reg);
  const lv=riskLevel(d.risk);
  $('#xaiRegion').value=reg.code;
  $('#xaiMeta').innerHTML='<div style="display:grid;gap:9px;margin-bottom:12px">'
    +'<div><div style="font-size:17px;font-weight:800">'+reg.sido+' '+reg.name+'</div><div style="font-size:11px;color:#5f7595">지역코드 '+reg.code+' · 평균고도 '+fmt(reg.elev)+'m · 기준주차 '+S.week+'</div></div>'
    +'<div style="display:flex;gap:9px;flex-wrap:wrap">'
    +'<div style="flex:1;min-width:96px;background:#101a2c;border:1px solid #1e2d49;border-radius:9px;padding:9px 11px"><div style="font-size:10px;color:#8298b6">위험지수</div><div style="font-size:20px;font-weight:800;color:'+riskColor(d.risk)+'">'+d.risk.toFixed(1)+'</div></div>'
    +'<div style="flex:1;min-width:96px;background:#101a2c;border:1px solid #1e2d49;border-radius:9px;padding:9px 11px"><div style="font-size:10px;color:#8298b6">위험등급</div><div style="margin-top:5px"><span class="chip '+lv+'">'+lv+'</span></div></div>'
    +'<div style="flex:1;min-width:96px;background:#101a2c;border:1px solid #1e2d49;border-radius:9px;padding:9px 11px"><div style="font-size:10px;color:#8298b6">다음 주 예상 환자</div><div style="font-size:20px;font-weight:800">'+fmt(d.cases)+'</div></div>'
    +'</div></div>';
  /* bars */
  (function(){
    const W=620,rowH=34,H=reg.factors.length*rowH+10,pl=8,pr=70;
    let g='';
    reg.factors.forEach((v,i)=>{
      const y=i*rowH+6, bw=v*(W-pl-pr);
      g+='<text x="'+pl+'" y="'+(y+11)+'" font-size="11" fill="#cfe0f2">'+FACTOR_NAMES[i]+'</text>';
      g+='<rect x="'+pl+'" y="'+(y+17)+'" width="'+(W-pl-pr)+'" height="9" rx="4" fill="#0e1a2c"/>';
      g+='<rect x="'+pl+'" y="'+(y+17)+'" width="'+bw.toFixed(1)+'" height="9" rx="4" fill="url(#xg'+i+')"><title>'+(v*100).toFixed(1)+'%</title></rect>';
      g+='<defs><linearGradient id="xg'+i+'" x1="0" x2="1"><stop offset="0" stop-color="#4f8cff"/><stop offset="1" stop-color="'+(i<3?'#22d3ee':'#a78bfa')+'"/></linearGradient></defs>';
      g+='<text x="'+(W-pr+8)+'" y="'+(y+26)+'" font-size="11.5" font-weight="800" fill="'+(i<3?'#22d3ee':'#a78bfa')+'">'+(v*100).toFixed(1)+'%</text>';
    });
    $('#xaiBars').innerHTML=svgW(W,H,g);
  })();
  /* waterfall */
  (function(){
    const top=reg.factors.map((v,i)=>({n:FACTOR_NAMES[i].split(' ')[0],v,i})).sort((a,b)=>b.v-a.v).slice(0,6);
    const base=d.risk*0.34;
    const steps=[{n:'정적 기저',v:base,type:'base'}];
    let acc=base;
    const total=top.reduce((a,b)=>a+b.v,0);
    top.forEach(t=>{ const inc=t.v/total*(d.risk-base); steps.push({n:t.n,v:inc,type:'add',from:acc,to:acc+inc}); acc+=inc; });
    const W=620,H=270,pl=44,pr=16,pt=20,pb=58;
    const Y=v=>H-pb-(v/100)*(H-pt-pb);
    const gw=(W-pl-pr)/steps.length;
    let g='';
    for(let k=0;k<=4;k++){ const v=k*25,y=Y(v);
      g+='<line x1="'+pl+'" y1="'+y.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+y.toFixed(1)+'" stroke="#16223a"/>';
      g+='<text x="'+(pl-6)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" class="axis">'+v+'</text>'; }
    steps.forEach((s,i)=>{
      const x=pl+i*gw+gw*0.2, w=gw*0.6;
      if(s.type==='base'){
        g+='<rect x="'+x.toFixed(1)+'" y="'+Y(s.v).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(H-pb-Y(s.v)).toFixed(1)+'" rx="3" fill="#4f8cff" fill-opacity=".75"/>';
        g+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(Y(s.v)-6).toFixed(1)+'" text-anchor="middle" font-size="9.4" font-weight="700" fill="#4f8cff">'+s.v.toFixed(1)+'</text>';
      } else {
        g+='<rect x="'+x.toFixed(1)+'" y="'+Y(s.to).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+(Y(s.from)-Y(s.to)).toFixed(1)+'" rx="3" fill="#22d3ee" fill-opacity=".8"/>';
        g+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(Y(s.to)-5).toFixed(1)+'" text-anchor="middle" font-size="9.4" font-weight="700" fill="#22d3ee">+'+s.v.toFixed(1)+'</text>';
        if(i<steps.length-1) g+='<path d="M'+(x+w).toFixed(1)+','+Y(s.to).toFixed(1)+' L'+(pl+(i+1)*gw+gw*0.2).toFixed(1)+','+Y(s.to).toFixed(1)+'" stroke="#3f5878" stroke-width="1" stroke-dasharray="2 2"/>';
      }
      g+='<text transform="translate('+(x+w/2).toFixed(1)+','+(H-pb+12)+') rotate(-38)" text-anchor="end" font-size="8.8" fill="#9fb3cd">'+s.n+'</text>';
    });
    g+='<line x1="'+pl+'" y1="'+Y(d.risk).toFixed(1)+'" x2="'+(W-pr)+'" y2="'+Y(d.risk).toFixed(1)+'" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="4 3"/>';
    g+='<text x="'+(W-pr-4)+'" y="'+(Y(d.risk)-6).toFixed(1)+'" text-anchor="end" font-size="9.6" font-weight="700" fill="#ef4444">최종 위험지수 '+d.risk.toFixed(1)+'</text>';
    $('#xaiWaterfall').innerHTML=svgW(W,H,g);
  })();
  /* narrative */
  (function(){
    const f=reg.factors, top3=[0,1,2].map(i=>({n:FACTOR_NAMES[i],v:f[i]}));
    const lv=riskLevel(d.risk);
    const act = d.risk>=75 ? '즉시 대응' : d.risk>=55 ? '선제 대응' : d.risk>=30 ? '모니터링 강화' : '정기 감시';
    const nm=d.risk>=75?'심각':lv;
    $('#xaiNarrative').innerHTML=''
      +'<div class="alert" style="margin-bottom:11px"><span class="sev" style="background:'+riskColor(d.risk)+'"></span><div><div class="ttl">'+reg.sido+' '+reg.name+' · '+nm+' ('+d.risk.toFixed(1)+')</div>'
      +'<div class="meta">'+S.week+' 기준 · 다음 주 예상 환자 '+fmt(d.cases)+'명 · 권고 조치 <b style="color:#eab308">'+act+'</b></div></div></div>'
      +'<div style="font-size:12.5px;line-height:1.85;color:#c3d3e6">'
      +'본 지역의 위험지수 상승에 가장 크게 기여한 요인은 <span class="hl">'+top3[0].n+'</span>('+(top3[0].v*100).toFixed(1)+'%)입니다. '
      +'이는 과거 1~2년 심평원 처방 통계 대비 최근 처방량이 유의하게 증가했음을 의미하며, 실제 진단은 통상 1~3주 후에 발생하므로 선제적 경보 근거로 활용할 수 있습니다.<br><br>'
      +'두 번째 요인은 <span class="hl2">'+top3[1].n+'</span>('+(top3[1].v*100).toFixed(1)+'%)로, GMM이 추론한 위험 환경 성분(중온·고습)에 현재 주차가 근접해 있습니다. '
      +'세 번째 요인 <span class="hl2">'+top3[2].n+'</span>('+(top3[2].v*100).toFixed(1)+'%)은 동적 중력 모델의 이동 가중치 상승과 연결되며, 인접 시군구의 위험도가 동반 상승할 경우 클러스터 확산 가능성이 있습니다.<br><br>'
      +'권고: 해당 시군구 및 인접 지역 보건소에 야외활동 주의 안내를 배포하고, 진드기 매개 감염병 감시체계를 주 1회에서 주 2회로 강화할 것을 권장합니다.'
      +'</div>';
  })();
}

