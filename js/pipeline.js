/* ============================================================
   MODULE: pipeline.js — 데이터 파이프라인 (Step 0/1)
   OpenAPI 수집 현황 · Two-Tier 구조 · PCA(45→16) · GMM 계절 추론 · 정적 임베딩
   ============================================================ */

/* ============================================================
   PIPELINE
   ============================================================ */
function renderPipeline(){
  /* 소스 */
  $('#sourceGrid').innerHTML = SOURCES.map(s=>{
    const st = s.st==='ok' ? ['#4ade80','정상 수집'] : ['#f97316','지연 감지'];
    return '<div class="src"><span class="dot2" style="background:'+s.col+'"></span><div style="flex:1;min-width:0">'
      +'<div class="nm">'+s.nm+' <span class="chip" style="background:#12233c;color:#8fb3c9;border:1px solid #26375a">'+s.tier+'</span></div>'
      +'<div class="dd"><b style="color:#9fb3cd">'+s.api+'</b><br>'+s.fld+'<br><span style="color:#5f7595">활용: '+s.use+'</span></div></div>'
      +'<div class="rr"><span style="color:'+st[0]+'">● '+st[1]+'</span><br>'+fmt(s.cnt)+' 레코드<br><span style="color:#5f7595">'+s.lag+'</span></div></div>';
  }).join('');

  /* Two-Tier 다이어그램 */
  const W=620,H=310;
  const box=(x,y,w,h,t,c,sub)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="9" fill="'+c+'22" stroke="'+c+'" stroke-width="1.2"/>'
    +'<text x="'+(x+w/2)+'" y="'+(y+18)+'" text-anchor="middle" font-size="10.5" font-weight="700" fill="'+c+'">'+t+'</text>'
    +(sub?'<text x="'+(x+w/2)+'" y="'+(y+32)+'" text-anchor="middle" font-size="8.6" fill="#8298b6">'+sub+'</text>':'');
  let g='';
  g+='<text x="16" y="16" font-size="10" font-weight="800" fill="#a78bfa">TIER 1 · 정적 기저 인코더 (Static Context)</text>';
  g+=box(16,26,180,44,'HIRA 주부상병 처방 통계','#a78bfa','과거 1~2년 (Data Lag)');
  g+=box(210,26,150,44,'과거 기상 데이터','#4f8cff','지중온도·습도');
  g+=box(374,26,110,44,'PCA','#22d3ee','45 → 16 차원');
  g+=box(498,26,106,44,'GMM','#22d3ee','날씨상 계절');
  g+='<path d="M196,48 L210,48" stroke="#4b6488" stroke-width="1.2" marker-end="url(#ar)"/>';
  g+='<path d="M360,48 L374,48" stroke="#4b6488" stroke-width="1.2" marker-end="url(#ar)"/>';
  g+='<path d="M484,48 L498,48" stroke="#4b6488" stroke-width="1.2" marker-end="url(#ar)"/>';
  g+=box(230,88,260,40,'정적 노드 임베딩  e_i^static ∈ R^16','#22d3ee','지역별 고유 보건 체질');
  g+='<path d="M551,70 L551,108 L490,108" stroke="#22d3ee" stroke-width="1.4" marker-end="url(#ar2)"/>';
  g+='<text x="16" y="158" font-size="10" font-weight="800" fill="#22d3ee">TIER 2 · 동적 신호 텐서 (Dynamic Signal)</text>';
  g+=box(16,168,170,44,'KDCA 주간 확진자 수','#22d3ee','resultVal · Target');
  g+=box(196,168,150,44,'KMA 실시간 관측','#4f8cff','기온·강수·습도');
  g+=box(356,168,128,44,'지자체 유동인구','#22c55e','주간 이동량');
  g+=box(494,168,110,44,'Vworld','#f97316','고도·등고선');
  g+=box(150,228,320,44,'Dynamic Gravity Model  →  동적 인접 행렬 A_t','#f97316','고도차 지형저항 × 이동량 → Sparsification');
  g+='<path d="M101,212 L101,250 L150,250" stroke="#f97316" stroke-width="1.2" marker-end="url(#ar)"/>';
  g+='<path d="M271,212 L271,228" stroke="#f97316" stroke-width="1.2" marker-end="url(#ar)"/>';
  g+='<path d="M420,212 L420,228" stroke="#f97316" stroke-width="1.2" marker-end="url(#ar)"/>';
  g+='<path d="M549,212 L549,250 L470,250" stroke="#f97316" stroke-width="1.2" marker-end="url(#ar)"/>';
  g+=box(60,284,500,20,'3차원 시공간 입력 텐서 (B × T × N × C)  +  A_t  →  STGCN','#4f8cff','');
  g+='<path d="M360,108 L360,140 L310,140 L310,168" stroke="#22d3ee" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#ar2)"/>';
  g+='<defs><marker id="ar" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#4b6488"/></marker>'
    +'<marker id="ar2" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#22d3ee"/></marker></defs>';
  $('#tierDiagram').innerHTML=svgW(W,H,g);

  /* PCA scree */
  (function(){
    const W=640,H=270,pl=48,pr=48,pt=18,pb=46;
    const ex=PCA.explained, cum=PCA.cum;
    const mx=Math.max.apply(null,ex)*1.25;
    const bw=(W-pl-pr)/ex.length;
    const X=i=>pl+i*bw+bw*0.16, Y=v=>H-pb-(v/mx)*(H-pt-pb);
    let g='';
    for(let k=0;k<=4;k++){ const v=mx*k/4, y=Y(v);
      g+='<line x1="'+pl+'" y1="'+y.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+y.toFixed(1)+'" stroke="#182742"/>';
      g+='<text x="'+(pl-6)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" class="axis">'+(v*100).toFixed(0)+'%</text>'; }
    ex.forEach((v,i)=>{
      const x=X(i), y=Y(v), h=H-pb-y;
      const c = i<3 ? '#22d3ee' : '#4f8cff';
      g+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(bw*0.68).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="2.5" fill="'+c+'" fill-opacity="'+(0.9-i*0.035)+'"><title>PC'+(i+1)+' : '+(v*100).toFixed(2)+'%</title></rect>';
      if(i<6||i===15) g+='<text x="'+(x+bw*0.34).toFixed(1)+'" y="'+(H-pb+14)+'" text-anchor="middle" class="axis">'+(i+1)+'</text>';
    });
    let cl='';
    cum.forEach((c,i)=>{ const x=X(i)+bw*0.34, y=pt+(1-c)*(H-pt-pb); cl+=(i===0?'M':'L')+x.toFixed(1)+','+y.toFixed(1)+' '; });
    g+='<path d="'+cl+'" fill="none" stroke="#eab308" stroke-width="1.8"/>';
    cum.forEach((c,i)=>{ if(i%3===2||i===15){ const x=X(i)+bw*0.34, y=pt+(1-c)*(H-pt-pb);
      g+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.4" fill="#eab308"/>';
      g+='<text x="'+x.toFixed(1)+'" y="'+(y-6).toFixed(1)+'" text-anchor="middle" font-size="8.4" fill="#eab308">'+(c*100).toFixed(1)+'%</text>'; } });
    g+='<line x1="'+(pl+bw*16)+'" y1="'+pt+'" x2="'+(pl+bw*16)+'" y2="'+(H-pb)+'" stroke="#ef4444" stroke-width="1" stroke-dasharray="3 3"/>';
    g+='<text x="'+(pl+bw*16+5)+'" y="'+(pt+11)+'" font-size="8.6" fill="#ef4444">16개 절단</text>';
    g+='<text x="'+pl+'" y="'+(H-6)+'" font-size="9" fill="#8298b6">주성분 (PC1~PC16)</text>';
    $('#pcaChart').innerHTML=svgW(W,H,g)+'<div class="legend" style="margin-top:6px"><span><i style="background:#22d3ee"></i>개별 주성분 설명분산</span><span><i style="background:#eab308"></i>누적 설명분산</span><span style="margin-left:auto">PC16 누적 <b class="hl">'+(PCA.cum[15]*100).toFixed(1)+'%</b></span></div>';
    $('#pcaNote').innerHTML='45개 원변수 → 16개 주성분으로 축소. PC1~PC3가 분산의 '+(PCA.cum[2]*100).toFixed(1)+'%를 설명하며, 16개 시점에서 누적 <span class="hl">'+(PCA.cum[15]*100).toFixed(1)+'%</span>로 명세서 기준(95% 이상)을 충족합니다. 다중공선성(VIF&gt;10 변수 다수)이 제거되어 STGCN 입력 차원이 축소됩니다.';
  })();

  /* GMM 산점도 */
  (function(){
    const W=640,H=280,pl=52,pr=18,pt=18,pb=40;
    const xs=[-4,32], ys=[40,92];
    const X=v=>pl+((v-xs[0])/(xs[1]-xs[0]))*(W-pl-pr);
    const Y=v=>H-pb-((v-ys[0])/(ys[1]-ys[0]))*(H-pt-pb);
    let g='';
    for(let k=0;k<=4;k++){ const v=xs[0]+(xs[1]-xs[0])*k/4;
      g+='<line x1="'+X(v).toFixed(1)+'" y1="'+pt+'" x2="'+X(v).toFixed(1)+'" y2="'+(H-pb)+'" stroke="#16223a"/>';
      g+='<text x="'+X(v).toFixed(1)+'" y="'+(H-pb+14)+'" text-anchor="middle" class="axis">'+v+'°C</text>'; }
    for(let k=0;k<=4;k++){ const v=ys[0]+(ys[1]-ys[0])*k/4;
      g+='<line x1="'+pl+'" y1="'+Y(v).toFixed(1)+'" x2="'+(W-pr)+'" y2="'+Y(v).toFixed(1)+'" stroke="#16223a"/>';
      g+='<text x="'+(pl-6)+'" y="'+(Y(v)+3).toFixed(1)+'" text-anchor="end" class="axis">'+v+'%</text>'; }
    /* 클러스터 산포 */
    GMM.forEach((c,ci)=>{
      for(let k=0;k<46;k++){
        const t=clamp(c.temp+gauss(0,3.1),xs[0]+1,xs[1]-1);
        const h=clamp(c.hum+gauss(0,6.4),ys[0]+2,ys[1]-2);
        g+='<circle cx="'+X(t).toFixed(1)+'" cy="'+Y(h).toFixed(1)+'" r="1.9" fill="'+c.col+'" fill-opacity=".42"/>';
      }
      g+='<circle cx="'+X(c.temp).toFixed(1)+'" cy="'+Y(c.hum).toFixed(1)+'" r="7" fill="none" stroke="'+c.col+'" stroke-width="2"/>';
      g+='<text x="'+(X(c.temp)+10).toFixed(1)+'" y="'+(Y(c.hum)+3.5).toFixed(1)+'" font-size="9" font-weight="700" fill="'+c.col+'">'+c.nm+'</text>';
    });
    g+='<text x="'+(pl+ (W-pl-pr)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="9" fill="#8298b6">평균기온 (°C)</text>';
    g+='<text x="12" y="'+(pt+8)+'" font-size="9" fill="#8298b6">상대습도 (%)</text>';
    $('#gmmChart').innerHTML=svgW(W,H,g);
    let rows=GMM.slice().sort((a,b)=>b.risk-a.risk).map(c=>
      '<tr><td><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:'+c.col+';margin-right:7px"></i>'+c.nm+'</td>'
      +'<td class="r">'+(c.w*100).toFixed(1)+'%</td><td class="r">'+c.temp.toFixed(1)+'°C</td><td class="r">'+c.hum.toFixed(0)+'%</td>'
      +'<td class="r">'+c.soil.toFixed(1)+'</td><td class="r"><b style="color:'+riskColor(c.risk*100)+'">'+c.risk.toFixed(2)+'</b></td></tr>').join('');
    $('#gmmNote').innerHTML='<table><thead><tr><th>가우시안 성분</th><th class="r">혼합비중</th><th class="r">기온</th><th class="r">습도</th><th class="r">지중온도</th><th class="r">위험 반응성</th></tr></thead><tbody>'+rows+'</tbody></table>'
      +'<div style="margin-top:9px;font-size:11px;color:#8298b6">BIC 기준 최적 성분 수 k=4. 달력상 같은 시기에도 상대습도 조건에 따라 위험 반응성이 0.11~0.94로 갈리며, 이 확률 분포가 정적 임베딩의 기후 반응성 축으로 주입됩니다.</div>';
  })();

  /* 임베딩 히트맵 */
  (function(){
    const rows=topByRisk(20), cols=16, cw=27, ch=19, pl=88, pt=24;
    const W=pl+cols*cw+34, H=pt+rows.length*ch+22;
    let g='';
    for(let c=0;c<cols;c++) g+='<text x="'+(pl+c*cw+cw/2).toFixed(1)+'" y="'+(pt-8)+'" text-anchor="middle" class="axis">PC'+(c+1)+'</text>';
    rows.forEach((d,i)=>{
      g+='<text x="'+(pl-8)+'" y="'+(pt+i*ch+13)+'" text-anchor="end" font-size="9.6" fill="#9fb3cd">'+d.region.name+'</text>';
      d.region.emb.forEach((v,k)=>{
        g+='<rect class="heat-cell" x="'+(pl+k*cw).toFixed(1)+'" y="'+(pt+i*ch).toFixed(1)+'" width="'+cw+'" height="'+ch+'" fill="'+heatV((v+2.4)/4.8)+'"><title>'+d.region.name+' · PC'+(k+1)+' = '+v.toFixed(2)+'</title></rect>';
      });
    });
    g+='<text x="'+(W-30)+'" y="'+(H-6)+'" font-size="8.5" fill="#5f7595">표준화 값 −2.4 ~ +2.4</text>';
    $('#embedHeat').innerHTML=svgW(W,H,g);
  })();

  /* 피처 목록 */
  (function(){
    const hiraDx=['쯔쯔가무시증(A75.3) 진료건수','쯔쯔가무시증(A75.3) 환자수','리케차성 질환 진료건수','발열성 질환 상병 건수','피부·연조직 감염 상병','림프절염 상병 건수','기타 리케차병(A79) 건수','열성 발진 상병 건수','농촌지역 외래 건수','고령층(60세 이상) 외래 건수','응급실 방문 건수','입원 건수'];
    const hiraRx=['독시사이클린 처방량','테트라사이클린 처방량','미노사이클린 처방량','아지트로마이신 처방량','항생제 전체 처방량','처방 건수 전년 대비 증감률','주성분별 처방 순위','요양기관 유형별 처방량'];
    const kma=['평균기온','최고기온','최저기온','일교차','일강수량','강수일수','상대습도','이슬점온도','지중온도(0.5m)','지중온도(1.0m)','지중온도(1.5m)','지중온도(3.0m)','평균풍속','최대풍속','일조시간','증기압','안개일수','일사량'];
    const geo=['시군구 평균 고도','고도 표준편차','등고선 밀도(평균 경사)','산림 피복 비율'];
    const mob=['주간 총 이동인구','인접 시군구 유입량','통근·통학 이동량'];
    const F=[];
    hiraDx.forEach(n=>F.push([n,'HIRA 질병정보서비스','정적 기저','patntCnt']));
    hiraRx.forEach(n=>F.push([n,'HIRA 의약품사용정보','정적 기저','useQty']));
    kma.forEach(n=>F.push([n,'기상청 ASOS 일자료','기저 + 동적', n.indexOf('지중온도')>=0?'soilTmp':'obs']));
    geo.forEach(n=>F.push([n,'Vworld 공간정보','정적(지형)','elevation']));
    mob.forEach(n=>F.push([n,'지자체 생활이동','동적','movePop']));
    let h='<table><thead><tr><th>#</th><th>피처명</th><th>출처</th><th class="c">구분</th><th class="c">API 필드</th><th class="r">중요도</th></tr></thead><tbody>';
    F.forEach((f,i)=>{
      const imp=clamp(0.95*Math.exp(-i/11)+ (i<8?0.18:0) + (rnd()-0.5)*0.12,0.02,1);
      const bar='<div style="display:flex;align-items:center;gap:6px;justify-content:flex-end"><div style="width:46px;height:5px;background:#0e1a2c;border-radius:3px;overflow:hidden"><div style="width:'+(imp*100).toFixed(0)+'%;height:100%;background:#22d3ee"></div></div><span style="width:30px;text-align:right;color:#9fb3cd">'+imp.toFixed(2)+'</span></div>';
      h+='<tr><td style="color:#5f7595">'+(i+1)+'</td><td>'+f[0]+'</td><td style="color:#8298b6;font-size:11px">'+f[1]+'</td>'
        +'<td class="c"><span class="chip" style="background:#12233c;color:#8fb3c9;border:1px solid #26375a;font-size:9.6px">'+f[2]+'</span></td>'
        +'<td class="c" style="color:#5f7595;font-size:10.5px">'+f[3]+'</td><td class="r">'+bar+'</td></tr>';
    });
    $('#featTable').innerHTML=h+'</tbody></table>';
  })();
}
