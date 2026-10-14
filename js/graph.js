/* ============================================================
   MODULE: graph.js — 동적 그래프 (Step 2)
   Dynamic Gravity Model · 동적 인접 행렬 A_t · Sparsification · 하이퍼파라미터 슬라이더
   ============================================================ */

/* ============================================================
   DYNAMIC GRAVITY GRAPH
   ============================================================ */
function computeGraph(){
  const wi=weekIdx(S.week);
  const nodes=topByRisk(24);
  const n=nodes.length;
  const Wm=Array.from({length:n},()=>new Array(n).fill(0));
  let mx=0;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    if(i===j) continue;
    const a=nodes[i].region, b=nodes[j].region;
    const p=pairOf(a,b);
    const d = p ? p.d : haversine(a,b);
    const dh= Math.abs(a.elev-b.elev);
    const M = p ? mobility(p,wi) : 420;
    let w = (M/Math.pow(1+d,S.gamma)) * Math.exp(-S.alpha*dh/300);
    Wm[i][j]=w; if(w>mx) mx=w;
  }
  if(mx>0) for(let i=0;i<n;i++)for(let j=0;j<n;j++) Wm[i][j]/=mx;
  const thr=mx*S.theta;
  let kept=0,sum=0;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){ if(i===j){Wm[i][j]=0;continue;} if(Wm[i][j]<S.theta){Wm[i][j]=0;} else {kept++;sum+=Wm[i][j];} }
  const poss=n*(n-1);
  return {nodes,n,Wm,kept,poss,sparsity:1-kept/poss,avgDeg:kept/n,avgW:kept?sum/kept:0,mx};
}
function renderGraph(){
  const G=computeGraph();
  /* heatmap */
  (function(){
    const cw=22,ch=18,pl=92,pt=92;
    const W=pl+G.n*cw+26,H=pt+G.n*ch+20;
    let g='';
    for(let i=0;i<G.n;i++){
      const nm=G.nodes[i].region.name.slice(0,4);
      g+='<text transform="translate('+(pl+i*cw+cw/2).toFixed(1)+','+(pt-6)+') rotate(-52)" text-anchor="start" font-size="8.6" fill="#9fb3cd">'+nm+'</text>';
      g+='<text x="'+(pl-6)+'" y="'+(pt+i*ch+12)+'" text-anchor="end" font-size="9" fill="#9fb3cd">'+G.nodes[i].region.name+'</text>';
    }
    for(let i=0;i<G.n;i++)for(let j=0;j<G.n;j++){
      const v=G.Wm[i][j];
      g+='<rect class="heat-cell" x="'+(pl+j*cw).toFixed(1)+'" y="'+(pt+i*ch).toFixed(1)+'" width="'+cw+'" height="'+ch+'" fill="'+(v>0?heatC(v):'#0c1526')+'">'
        +'<title>'+G.nodes[i].region.name+' → '+G.nodes[j].region.name+'&#10;연결강도 '+(v>0?v.toFixed(3):'0 (제거됨)')+'</title></rect>';
    }
    g+='<text x="'+(W-20)+'" y="'+(H-5)+'" font-size="8.5" fill="#5f7595">정규화 연결강도 0~1</text>';
    $('#adjHeat').innerHTML=svgW(W,H,g);
  })();
  /* stats */
  const dens=(1-G.sparsity)*100;
  $('#graphStats').innerHTML=[
    ['유지된 엣지',fmt(G.kept)+' / '+fmt(G.poss),'#22d3ee'],
    ['Sparsity (희소도)',(G.sparsity*100).toFixed(1)+'%','#a78bfa'],
    ['평균 차수 (degree)',G.avgDeg.toFixed(1),'#4f8cff'],
    ['평균 연결강도',G.avgW.toFixed(3),'#22c55e'],
    ['그래프 밀도',dens.toFixed(1)+'%','#f97316'],
    ['노드 수',G.n+'개 (위험 상위)','#8298b6']
  ].map(x=>'<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #16223a;font-size:12px"><span style="color:#8298b6">'+x[0]+'</span><b style="color:'+x[2]+';font-variant-numeric:tabular-nums">'+x[1]+'</b></div>').join('');
  $('#gravityFormula').innerHTML='w_ij = [ M_ij^(t) / (1 + d_ij)^&gamma; ] &times; exp( &minus;&alpha; &middot; &Delta;h_ij / 300 )'
    +'<br><span style="color:#8298b6">현재 &alpha;='+S.alpha.toFixed(1)+' · &gamma;='+S.gamma.toFixed(1)+' · &theta;='+S.theta.toFixed(2)+' &nbsp;|&nbsp; w_ij &lt; &theta;&middot;max &rarr; 0 으로 제거(Sparsification)</span>';
  /* edge list */
  (function(){
    const E=[];
    for(let i=0;i<G.n;i++)for(let j=i+1;j<G.n;j++){
      const a=G.nodes[i], b=G.nodes[j], w=Math.max(G.Wm[i][j],G.Wm[j][i]);
      if(w<=0) continue;
      const d=haversine(a.region,b.region), dh=Math.abs(a.region.elev-b.region.elev);
      E.push({a:a.region,b:b.region,w,d,dh});
    }
    E.sort((x,y)=>y.w-x.w);
    let h='<table><thead><tr><th>#</th><th>출발 → 도착</th><th class="r">거리</th><th class="r">고도차</th><th class="r">연결강도</th></tr></thead><tbody>';
    E.slice(0,15).forEach((e,i)=>{
      h+='<tr><td style="color:#5f7595">'+(i+1)+'</td><td>'+e.a.name+' <span style="color:#5f7595">→</span> '+e.b.name+'</td>'
        +'<td class="r">'+e.d.toFixed(1)+'km</td><td class="r">'+fmt(e.dh)+'m</td>'
        +'<td class="r"><div style="display:flex;align-items:center;gap:6px;justify-content:flex-end"><div style="width:52px;height:5px;background:#0e1a2c;border-radius:3px;overflow:hidden"><div style="width:'+(e.w*100).toFixed(0)+'%;height:100%;background:linear-gradient(90deg,#22d3ee,#a78bfa)"></div></div><b style="color:#9fd8e8;width:38px;text-align:right">'+e.w.toFixed(3)+'</b></div></td></tr>';
    });
    $('#edgeList').innerHTML=h+'</tbody></table>';
  })();
  /* elevation / resistance curve */
  (function(){
    const W=600,H=260,pl=54,pr=18,pt=18,pb=40;
    const X=v=>pl+(v/600)*(W-pl-pr);
    const Y=v=>H-pb-(v/1.05)*(H-pt-pb);
    let g='';
    for(let k=0;k<=5;k++){ const v=k/5, y=Y(v);
      g+='<line x1="'+pl+'" y1="'+y.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+y.toFixed(1)+'" stroke="#16223a"/>';
      g+='<text x="'+(pl-6)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" class="axis">'+v.toFixed(1)+'</text>'; }
    for(let k=0;k<=6;k++){ const v=k*100, x=X(v);
      g+='<line x1="'+x.toFixed(1)+'" y1="'+pt+'" x2="'+x.toFixed(1)+'" y2="'+(H-pb)+'" stroke="#131e33"/>';
      g+='<text x="'+x.toFixed(1)+'" y="'+(H-pb+14)+'" text-anchor="middle" class="axis">'+v+'m</text>'; }
    let cu='';
    for(let k=0;k<=120;k++){ const dh=k*5, r=Math.exp(-S.alpha*dh/300); cu+=(k===0?'M':'L')+X(dh).toFixed(1)+','+Y(r).toFixed(1)+' '; }
    g+='<path d="'+cu+'" fill="none" stroke="#f97316" stroke-width="2"/>';
    /* 실제 엣지 산포 */
    const G2=computeGraph();
    for(let i=0;i<G2.n;i++)for(let j=i+1;j<G2.n;j++){
      const a=G2.nodes[i].region,b=G2.nodes[j].region;
      const dh=Math.abs(a.elev-b.elev), r=Math.exp(-S.alpha*dh/300);
      g+='<circle cx="'+X(Math.min(dh,600)).toFixed(1)+'" cy="'+Y(r).toFixed(1)+'" r="2.6" fill="#22d3ee" fill-opacity=".7"><title>'+a.name+'–'+b.name+' : Δh='+dh+'m, 저항계수='+r.toFixed(3)+'</title></circle>';
    }
    g+='<text x="'+(pl+(W-pl-pr)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="9" fill="#8298b6">시군구 간 평균 고도차 Δh (m)</text>';
    g+='<text x="12" y="'+(pt+8)+'" font-size="9" fill="#8298b6">저항 감쇠</text>';
    $('#elevChart').innerHTML=svgW(W,H,g)+'<div class="legend" style="margin-top:6px"><span><i style="background:#f97316"></i>저항 감쇠 함수 exp(−αΔh/300)</span><span><i style="background:#22d3ee"></i>실제 엣지 분포</span><span style="margin-left:auto;color:#8298b6">고도차 300m당 저항 약 '+(100*(1-Math.exp(-S.alpha))).toFixed(0)+'% 감소</span></div>';
  })();
}
['gAlpha','gGamma','gTheta'].forEach((id,k)=>{
  const map={gAlpha:'alpha',gGamma:'gamma',gTheta:'theta'};
  const inp=$('#'+id), lab=$('#'+id+'Val');
  inp.value=S[map[id]];
  lab.textContent=(+S[map[id]]).toFixed(2);
  inp.oninput=()=>{ S[map[id]]=parseFloat(inp.value); lab.textContent=(+inp.value).toFixed(2); renderGraph(); };
});

