/* ============================================================
   MODULE: lora.js — 온라인 미세조정 (Step 4) + 개발 로드맵
   LoRA 어댑터 학습 시뮬레이션 · 학습 곡선 · 15주 WBS · 테크 스택
   ============================================================ */

/* ============================================================
   LoRA / WBS
   ============================================================ */
(function initLora(){
  const loss=[{e:1,tr:0.4124,va:8.61},{e:2,tr:0.3418,va:7.84},{e:3,tr:0.2987,va:7.32},{e:4,tr:0.2701,va:7.04},{e:5,tr:0.2519,va:6.92}];
  function drawLoss(upTo){
    const W=560,H=230,pl=48,pr=46,pt=20,pb=38;
    const mx=0.5, my=10;
    const X=e=>pl+((e-1)/4)*(W-pl-pr);
    const Y=v=>H-pb-(v/mx)*(H-pt-pb);
    const Y2=v=>H-pb-(v/my)*(H-pt-pb);
    let g='';
    for(let k=0;k<=4;k++){ const v=mx*k/4,y=Y(v);
      g+='<line x1="'+pl+'" y1="'+y.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+y.toFixed(1)+'" stroke="#16223a"/>';
      g+='<text x="'+(pl-6)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" class="axis">'+v.toFixed(2)+'</text>'; }
    for(let k=0;k<=4;k++){ const v=my*k/4,y=Y2(v);
      g+='<text x="'+(W-pr+6)+'" y="'+(y+3).toFixed(1)+'" class="axis" fill="#eab308">'+v.toFixed(1)+'</text>'; }
    for(let e=1;e<=5;e++) g+='<text x="'+X(e).toFixed(1)+'" y="'+(H-pb+15)+'" text-anchor="middle" class="axis">Epoch '+e+'</text>';
    const pts=loss.slice(0,upTo);
    if(pts.length){
      g+='<path d="'+pts.map((p,i)=>(i===0?'M':'L')+X(p.e).toFixed(1)+','+Y(p.tr).toFixed(1)).join(' ')+'" fill="none" stroke="#22d3ee" stroke-width="2.2"/>';
      g+='<path d="'+pts.map((p,i)=>(i===0?'M':'L')+X(p.e).toFixed(1)+','+Y2(p.va).toFixed(1)).join(' ')+'" fill="none" stroke="#eab308" stroke-width="2.2"/>';
      pts.forEach(p=>{
        g+='<circle cx="'+X(p.e).toFixed(1)+'" cy="'+Y(p.tr).toFixed(1)+'" r="3.2" fill="#22d3ee"/>';
        g+='<circle cx="'+X(p.e).toFixed(1)+'" cy="'+Y2(p.va).toFixed(1)+'" r="3.2" fill="#eab308"/>';
      });
      const lp=pts[pts.length-1];
      g+='<text x="'+X(lp.e).toFixed(1)+'" y="'+(Y(lp.tr)-8).toFixed(1)+'" text-anchor="middle" font-size="9.4" font-weight="700" fill="#22d3ee">'+lp.tr.toFixed(4)+'</text>';
    }
    g+='<text x="12" y="'+(pt+8)+'" font-size="9" fill="#8298b6">Train Loss</text>';
    $('#lossChart').innerHTML=svgW(W,H,g)+'<div class="legend" style="margin-top:6px"><span><i style="background:#22d3ee"></i>Training Loss (Huber + PoissonNLL)</span><span><i style="background:#eab308"></i>Validation MAE (우측축)</span></div>';
  }
  drawLoss(0);
  $('#loraMetrics').innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-top:11px">'
    +['어댑터 rank|8','alpha|16','target|TemporalConv1d','학습 파라미터|41,216','백본 동결|12,480,512','Epoch 상한|5'].map(x=>{
      const [a,b]=x.split('|');
      return '<div style="background:#101a2c;border:1px solid #1e2d49;border-radius:8px;padding:8px 10px"><div style="font-size:9.6px;color:#8298b6">'+a+'</div><div style="font-size:12.5px;font-weight:700;margin-top:2px">'+b+'</div></div>';
    }).join('')+'</div>';

  let running=false;
  $('#loraRun').onclick=()=>{
    if(running) return; running=true;
    const btn=$('#loraRun'); btn.disabled=true;
    const log=$('#loraLog'), prog=$('#loraProgress');
    const msgs=[
      '<b>[epoch 1/5]</b> LoRA 어댑터 학습 시작 — lr=3e-4, batch=32, 데이터 '+(WEEKS.length)+'주 × 185 시군구',
      '<b>[epoch 1/5]</b> train_loss=0.4124 · val_MAE=8.61 · 소요 11.2s',
      '<b>[epoch 2/5]</b> train_loss=0.3418 · val_MAE=7.84 · 소요 9.8s',
      '<b>[epoch 3/5]</b> train_loss=0.2987 · val_MAE=7.32 · 소요 9.1s',
      '<b>[epoch 4/5]</b> train_loss=0.2701 · val_MAE=7.04 · 소요 8.9s',
      '<b>[epoch 5/5]</b> train_loss=0.2519 · val_MAE=6.92 · 소요 9.0s',
      '<b>[merge]</b> 어댑터 가중치 백본 병합 완료 (W = W0 + BA)',
      '<b>[save]</b> 체크포인트 저장 — stgcn_lora_'+S.week.replace('-','').toLowerCase()+'.pt (164KB)',
      '<b>[done]</b> 주간 미세조정 완료 · MAE 8.41 → 6.92 (−17.7%) · Concept Drift 보정 반영'
    ];
    let i=0;
    log.innerHTML='';
    const t=setInterval(()=>{
      log.insertAdjacentHTML('beforeend',msgs[i]+'<br>');
      log.scrollTop=log.scrollHeight;
      if(i>=1&&i<=5) drawLoss(i);
      prog.style.width=((i+1)/msgs.length*100)+'%';
      i++;
      if(i>=msgs.length){
        clearInterval(t); running=false; btn.disabled=false; btn.textContent='주간 Fine-Tuning 재실행';
        $('#loraState').innerHTML='완료 · 마지막 업데이트 <b style="color:#4ade80">'+S.week+'</b> · val_MAE 6.92';
      }
    },620);
  };

  /* WBS */
  const WBS=[
    ['W 1~3','Data Ingestion','KDCA · HIRA · KMA · Vworld OpenAPI 수집 파이프라인 및 DB 스키마 구축'],
    ['W 4~6','Feature Engineering','HIRA 과거 데이터 전처리, PCA 차원축소 및 GMM 계절 추론 모듈 개발'],
    ['W 7~9','Graph Modeling','Vworld 고도차 기반 Dynamic Gravity Model 및 동적 인접 행렬 생성기 개발'],
    ['W 10~12','Model Building','PyTorch Geometric 기반 STGCN + Spatio-Temporal Attention 구현 및 학습'],
    ['W 13~14','LoRA & XAI','LoRA 경량 미세조정 루틴 및 Integrated Gradients XAI API 개발'],
    ['W 15','Integration & API','FastAPI 서비스 연동, GeoJSON 배포 API 구축 및 최종 테스트']
  ];
  $('#wbsTimeline').innerHTML=WBS.map(w=>
    '<div class="it done"><div class="wk">'+w[0]+' · '+w[1]+'</div><div class="tx">'+w[2]+'</div></div>').join('');

  const STACK=[
    ['Presentation & API','#4f8cff',['FastAPI (REST / gRPC)','GeoJSON Service','React 18 + Mapbox GL JS']],
    ['Analytics & Model','#a78bfa',['STGCN Engine (PyTorch Geometric)','LoRA Online Fine-Tuner','Dynamic Gravity Graph','Integrated Gradients XAI']],
    ['Preprocessing & Feature','#22d3ee',['PCA Dimension Reducer','GMM Climate Season Classifier']],
    ['Data Ingestion & Storage','#f97316',['PostgreSQL 15 + PostGIS','TimescaleDB (시계열)','Apache Airflow 2.8 ETL']]
  ];
  $('#stackList').innerHTML=STACK.map(s=>
    '<div style="border:1px solid #1e2d49;border-left:3px solid '+s[1]+';border-radius:9px;padding:10px 12px;margin-bottom:9px;background:#101a2c">'
    +'<div style="font-size:12px;font-weight:800;color:'+s[1]+';margin-bottom:6px">'+s[0]+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+s[2].map(x=>'<span class="chip" style="background:#0e1a2c;color:#9fb3cd;border:1px solid #26375a">'+x+'</span>').join('')+'</div></div>').join('');
})();

