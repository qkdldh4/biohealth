/* ============================================================
   MODULE: main.js — 부트스트랩 · 전체 갱신 · 고지문
   모듈 초기 렌더 순서와 기준 주차 변경 시 전역 갱신 진입점
   ============================================================ */

/* ============================================================
   REFRESH
   ============================================================ */
function refreshAll(){
  renderDashboard(); renderGraph(); renderModel(); renderXAI(); renderAlerts();
}
renderPipeline();
refreshAll();

/* footer */
(function(){
  const f=document.createElement('div');
  f.style.cssText='margin-top:26px;padding:16px 18px;border:1px dashed #26375a;border-radius:12px;background:#0c1424;font-size:11.5px;color:#8298b6;line-height:1.7';
  f.innerHTML='<b style="color:#eab6f7">⚠ 모의(Mock) 데이터 고지</b><br>본 웹앱은 <b>기술명세서 v4.0</b>의 아키텍처와 출력물 3종(위험지도 · 조기경보 · XAI 리포트)을 실제로 동작시켜 보기 위한 <b>프로토타입</b>입니다. '
    +'화면의 모든 수치(확진자 수·처방량·기상값·고도·유동인구·모델 지표)는 시드 기반으로 생성된 <b>가상 데이터</b>이며, 실제 질병관리청·심평원·기상청·Vworld 데이터가 아닙니다. '
    +'실제 배포 시에는 공공 OpenAPI 연동과 STGCN 학습 파이프라인(PyTorch Geometric)으로 대체됩니다.';
  document.querySelector('main').appendChild(f);
})();
