# 쯔쯔가무시증 시공간 예측 시스템 v4.0 — 웹앱 프로토타입

URL: https://qkdldh4.github.io/biohealth/

> **기술명세서 v4.0**([Tech Spec.md])에 정의된 엔드투엔드 시공간 ML/DL 파이프라인을 **브라우저에서 실제로 동작시켜 보는 웹 프로토타입**입니다.
> 의존성 0개 · 빌드 0단계 · 단일 폴더를 열면 바로 실행됩니다.

| 항목 | 내용 |
| :--- | :--- |
| 대상 질병 | 쯔쯔가무시증 (Scrub Typhus, 3급 법정감염병, ICD-10 **A75.3**) |
| 예측 단위 | 전국 **184개 시·군·구** × **주간(52주)** |
| 예측 산출물 | 발생 **위험지수(0~100)** 및 **다음 주 예상 환자 수** |
| 데이터 | **가상(Mock)** — 시드 기반 생성, 실제 공공 API 미연동 |
| 기술 스택 | Vanilla JavaScript (ES5+ 문법) · 인라인 SVG · 외부 라이브러리 없음 |
| 실행 환경 | 최신 Chrome / Edge / Safari / Firefox (`file://` 직접 열기 가능) |

---

## 1. 개요 (Overview)

본 프로젝트는 기상청(KMA), 건강보험심사평가원(HIRA), 질병관리청(KDCA), Vworld(지형), 지자체 유동인구 OpenAPI를 통합 연계하여
전국 시·군·구 단위의 쯔쯔가무시증 주간 발생 위험도와 확진자 수를 예측하는 시스템을 **화면과 상호작용 수준에서 재현**합니다.

기술명세서가 제시한 3대 과제를 모두 UI에 반영했습니다.

1. **공공 의료데이터의 Data Lag(1~2년 시차) 극복** → 이원화(Two-Tier) 구조로 시각화하고, Tier 1이 산출하는 16차원 정적 노드 임베딩을 히트맵으로 확인
2. **지형·유동인구 기반 동적 감염 확산 모델링** → α·γ·θ 슬라이더를 움직이면 동적 인접 행렬 `A_t`가 실시간 재계산
3. **설명 가능한 AI(XAI) 및 지속적 보정** → Integrated Gradients 기여도 리포트와 LoRA 주간 미세조정 시뮬레이션 제공

### 1.1 이원화(Two-Tier) 분석 구조

| 구분 | Tier 1 · 정적 기저 인코더 (Static Context) | Tier 2 · 동적 신호 텐서 (Dynamic Signal) |
| :--- | :--- | :--- |
| 대상 데이터 | 과거 1~2년 전 심평원 주부상병/의약품 처방 통계 + 과거 기상 데이터 | 질병청 주간 확진자 수 + 실시간 기상청 관측치 + 지자체 유동인구 |
| 분석 기법 | **PCA**(차원축소·다중공선성 제거) + **GMM**(날씨상 계절 추론) | **Dynamic Gravity Model**(고도차 지형저항 × 인구 이동) |
| 핵심 역할 | 공공 의료데이터의 1~2년 시차(Data Lag) 한계 극복 | 실시간/주간 단위 기상 변화 및 감염병 확산 신호 측정 |
| 산출 결과물 | 지역별 고유 보건 체질을 반영한 **정적 노드 임베딩 벡터 `e_i^static ∈ R^16`** | **3차원 시공간 입력 텐서 `B × T × N × C` + 동적 인접 행렬 `A_t`** |

### 1.2 5대 분석기법 연쇄 파이프라인

```
[HIRA 과거 의료데이터 + 과거 기상] ──> [PCA 차원축소 + GMM 군집화] ──> [정적 노드 임베딩 벡터]
                                                                              │
[KDCA 주간 확진자 + KMA 실시간 기상] ──> [Dynamic Feature Matrix] ────────────┼──> [STGCN + Attention]
                                                                              │          │
[Vworld 고도차 + 유동인구 이동량] ────> [Dynamic Gravity Model] ──> [동적 인접 행렬]      │
                                                                                         ▼
[XAI 기여도 리포트] <── [Integrated Gradients] <── [LoRA Fine-Tuning] <── [주간 위험도 & 환자수 예측]
```

| 단계 | 기법 | 화면 탭 | 구현 모듈 |
| :--- | :--- | :--- | :--- |
| Step 0 | 공공 OpenAPI 수집 | 데이터 파이프라인 | `js/pipeline.js` |
| Step 1 | PCA (45 → 16) + GMM (k=4) | 데이터 파이프라인 | `js/pipeline.js` |
| Step 2 | Dynamic Gravity Model + Sparsification | 동적 그래프 | `js/graph.js` |
| Step 3 | STGCN + Spatio-Temporal Attention | STGCN 엔진 | `js/model.js` |
| Step 4 | LoRA 온라인 미세조정 | LoRA & WBS | `js/lora.js` |
| Step 4 | Integrated Gradients XAI | XAI 설명 | `js/xai.js` |

---

## 2. 시스템 최종 출력물 3종

기술명세서 5장에 정의된 3종 출력물이 각각 실제 화면으로 구현되어 있습니다.

### 출력물 1 · 주간 위험 지도 (GeoJSON / Spatial Risk Index)
- **화면**: `대시보드` 탭 좌측 버블 지도 + `동적 그래프` 탭
- **내용**: 시군구별 발생 위험 지수(0~100)와 위험 등급(관심/주의/경고/심각) 4단계, 다음 주 예상 환자 수
- **상호작용**: 버블 크기 = 예상 환자 수, 버블 클릭 → 해당 지역 XAI 리포트로 이동
- **대응 API 스펙**: `GET /api/v1/risk-map?week={YYYY-Www}`

### 출력물 2 · 조기경보 Alert (Early Warning & Trend Forecast)
- **화면**: `조기경보` 탭
- **내용**: 다음 주 예상 환자 수, 급증 위험 시군구 **클러스터** 알림, 전주 대비 변동률
- **상호작용**: `실시간 스트림 시작` → 1.4초 주기로 경보 카드가 슬라이드인 / `경보 1건 강제 발행` → 단건 즉시 생성
- **대응 API 스펙**: `GET /api/v1/alerts`, WebSocket `/ws/v1/alerts`

### 출력물 3 · XAI 리포트 (Feature Contribution Breakdown)
- **화면**: `XAI 설명` 탭
- **내용**: 위험도 상승을 유발한 원인 피처 **상위 8개 기여도**(합계 1.0), 기저 → 최종 위험지수 **워터폴**, 보건당국용 자동 해설
- **상호작용**: 시군구 셀렉터 변경 시 즉시 재계산
- **대응 API 스펙**: `GET /api/v1/explainability/{region_code}`

---

## 3. 프로젝트 구조

```
tsutsugamushi-prediction-system/
├── index.html                     # 진입점 — HTML 마크업(7개 탭 섹션) + 스크립트 로드 순서
├── README.md                      # 본 문서
├── css/
│   └── styles.css                 # 디자인 토큰(:root) · 레이아웃 · 컴포넌트 스타일
├── js/
│   ├── data.js                    # [데이터 계층] 시드 기반 가상 데이터 생성기
│   ├── utils.js                   # [공용] 헬퍼 · 전역 상태 · 탭 라우팅
│   ├── dashboard.js               # [화면] 대시보드 (출력물 1)
│   ├── pipeline.js                # [화면] 데이터 파이프라인 (Step 0~1)
│   ├── graph.js                   # [화면] 동적 그래프 (Step 2)
│   ├── model.js                   # [화면] STGCN 엔진 (Step 3)
│   ├── xai.js                     # [화면] XAI 설명 (출력물 3)
│   ├── alerts.js                  # [화면] 조기경보 (출력물 2)
│   ├── lora.js                    # [화면] LoRA 미세조정 + 15주 WBS (Step 4)
│   └── main.js                    # [부트스트랩] 초기 렌더 · 전역 갱신 · 고지문
└── test/
    └── smoke-test.mjs             # jsdom 기반 렌더/상호작용 스모크 테스트
```

### 3.1 모듈별 역할

| 파일 | 역할 | 주요 심볼 |
| :--- | :--- | :--- |
| `js/data.js` | **가상 데이터 생성 계층.** 시드 고정 난수(`mulberry32`)로 184개 시군구 마스터(행정표준코드·위경도·평균고도·인구지표), 52주 주차 배열, 계절 계수, 정적 노드 임베딩 16차원, 위험요인 기여 프로파일, 주차별 위험지수/예상 환자/실측치, 시군구 쌍 거리·고도차·주간 유동인구를 생성 | `REGIONS`, `WEEKS`, `SERIES`, `PAIRS`, `SOURCES`, `PCA`, `GMM`, `ATT`, `seasonFactor()` |
| `js/utils.js` | SVG 문자열 빌더, 숫자/퍼센트 포매터, 위험지수 → 색상 보간, 히트맵 색상 스케일, 전역 상태 객체, 탭 전환, 지역 포커스 이동 | `$`, `$$`, `fmt()`, `pct()`, `svgW()`, `riskColor()`, `heatC()`, `heatV()`, `S`, `goTab()`, `focusRegion()` |
| `js/dashboard.js` | KPI 카드 4종, 경위도 등거리 투영 버블 지도, 위험등급 도넛, 위험 상위 Top 10 표, 52주 트렌드(실측/예측/95% 구간), 시도별 위험지수 바 | `renderDashboard()`, `renderMap()`, `renderDonut()`, `renderTrend()`, `renderSidoBars()` |
| `js/pipeline.js` | OpenAPI 수집 상태 카드, Two-Tier 구조도, PCA 스크리 플롯 + 누적 분산, GMM 산점도 + 성분표, 임베딩 히트맵, 45개 기저 피처 목록 | `renderPipeline()` |
| `js/graph.js` | **Dynamic Gravity Model 계산 코어.** `w_ij = [M_ij/(1+d_ij)^γ] · exp(−α·Δh_ij/300)` → 정규화 → Sparsification → `A_t`. 히트맵, 희소화 통계, 상위 엣지 15개, 저항 감쇠 곡선 | `computeGraph()`, `renderGraph()` |
| `js/model.js` | STGCN 아키텍처 다이어그램, LAG 효과 곡선, 예측 vs 실측 + 예측구간, 시군구별 예상 환자수, Attention 히트맵, 백본 vs LoRA 성능표 | `renderModel()` |
| `js/xai.js` | Integrated Gradients 기여도 바, 워터폴 차트, 위험등급별 권고 조치가 포함된 자동 해설문 생성 | `renderXAI()` |
| `js/alerts.js` | 경보 스트림(인터벌 기반 시뮬레이션), 인접 시군구 기반 클러스터 탐지, 최근 8주 경보 이력 | `makeAlert()`, `alertCard()`, `renderAlerts()` |
| `js/lora.js` | 5 Epoch 학습 로그·진행바·학습 곡선 애니메이션, 15주 WBS 타임라인, 4계층 테크 스택 | IIFE 초기화 |
| `js/main.js` | 최초 렌더 호출 순서 정의, 기준 주차 변경 시 `refreshAll()`, 모의 데이터 고지문 삽입 | `refreshAll()` |

---

## 4. 실행 방법

### 4.1 가장 간단한 방법 (권장)
1. 폴더를 내려받아 압축을 해제합니다.
2. `index.html`을 더블클릭하거나 브라우저로 끌어다 놓습니다.
3. 별도 설치·빌드·서버가 필요하지 않습니다. (`file://` 프로토콜에서 동작)

### 4.2 로컬 서버로 실행 (선택)
```bash
cd tsutsugamushi-prediction-system
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

### 4.3 스모크 테스트 실행 (선택 · Node.js 필요)
```bash
npm install jsdom
node test/smoke-test.mjs
```
33개 렌더 지점과 탭 전환·주차 변경·슬라이더 조작·지역 선택·경보 발행·LoRA 실행을 검증하고,
콘솔 오류 건수를 출력합니다. 기대 결과: **모든 항목 `OK`, `ERRORS (0)`**

---

## 5. 화면 구성 (7개 탭)

| 탭 | 내용 | 대응 명세 |
| :--- | :--- | :--- |
| **대시보드** | KPI 4종, 버블 위험지도, 위험등급 도넛, Top 10, 52주 트렌드, 시도별 바 | 출력물 1 |
| **데이터 파이프라인** | OpenAPI 6종 수집 상태, Two-Tier 구조도, PCA, GMM, 임베딩 히트맵, 피처 목록 | 2장 · Step 1 |
| **동적 그래프** | 동적 인접 행렬 `A_t`, α/γ/θ 슬라이더, Sparsification 통계, 상위 엣지, 고도차 저항 곡선 | 3장 Step 2 |
| **STGCN 엔진** | 아키텍처 다이어그램, LAG 효과, 예측 vs 실측, 예상 환자수, Attention, 성능 지표 | 3장 Step 3 |
| **XAI 설명** | 기여도 상위 8개, 워터폴, 자동 해설 | 출력물 3 · Step 4 |
| **조기경보** | 경보 스트림, 급증 클러스터, 8주 이력 | 출력물 2 |
| **LoRA & WBS** | 5 Epoch 미세조정 시뮬레이션, 학습 곡선, 15주 WBS, 테크 스택 | 6장 |

### 5.1 추천 탐색 시나리오
1. 상단 **기준 주차**를 `2026-W43`(유행 시작) → `2026-W46`(피크)으로 바꾸며 지도 색이 심각 등급으로 확산되는 양상 비교
2. 지도에서 **심각 등급 버블 클릭** → XAI 탭에서 해당 지역 기여도 Top-3 확인
3. **동적 그래프** 탭에서 `α(고도차 저항)`를 6.5로 올려 산악 지역 엣지가 끊기는 Sparsification 확인
4. **STGCN 엔진** 탭에서 대상 시군구를 산간 지역으로 변경 → LAG 3주 피크와 예측구간 확인
5. **조기경보** 탭에서 `실시간 스트림 시작` → 경보 카드 실시간 유입 관찰
6. **LoRA & WBS** 탭에서 `주간 Fine-Tuning 실행` → 학습 곡선과 MAE 개선(−17.7%) 확인

---

## 6. 파라미터 커스터마이징

### 6.1 화면에서 조정 (코드 수정 불필요)
| 파라미터 | 위치 | 의미 | 범위 |
| :--- | :--- | :--- | :--- |
| 기준 주차 | 상단 셀렉터 | `2026-W01` ~ `2026-W52` | 52주 |
| α (고도차 저항 계수) | 동적 그래프 탭 | 클수록 고도차가 큰 지역 간 연결 급감 | 0.0 ~ 10.0 |
| γ (거리 감쇠 지수) | 동적 그래프 탭 | 클수록 원거리 연결 급감 | 0.5 ~ 3.0 |
| θ (Sparsification 임계값) | 동적 그래프 탭 | 임계값 이하 미세 연결 제거 | 0.00 ~ 0.60 |
| 대상 시군구 | STGCN 엔진 / XAI 탭 | 예측·설명 대상 지역 | 184개 |

### 6.2 코드에서 조정
| 목적 | 파일 | 수정 지점 |
| :--- | :--- | :--- |
| 난수 시드 변경(다른 가상 시나리오) | `js/data.js` | `const RNG = mulberry32(20261014);` 의 숫자 |
| 시군구 추가/삭제 | `js/data.js` | `const REGIONS = [...]` 배열 |
| 계절 유행 곡선 조정 | `js/data.js` | `seasonFactor()` 내 `curve` 객체 (주차 → 계수) |
| 위험지수 포화 정도 | `js/data.js` | `100 * (1 - Math.exp(-1.92*raw))` 의 `1.92` |
| 위험 등급 경계값 | `js/data.js` | `riskLevel()` 의 30 / 55 / 75 |
| 시도별 위험 성향 | `js/data.js` | `SIDO_PROFILE` 의 `base` · `elev` · `pop` |
| 인접 판정 거리(그래프 엣지 생성) | `js/data.js` | `if(d<=78)` 의 78(km) |
| PCA/GMM 성분 수·혼합비중 | `js/data.js` | `PCA`, `GMM` 상수 |
| 기여도 기본 프로파일 | `js/data.js` | `r.factors` 생성부의 8개 계수 |
| 시뮬레이션 속도 | `js/alerts.js`, `js/lora.js` | `setInterval(..., 1400)` / `..., 620` |
| 색상·타이포그래피 | `css/styles.css` | `:root` 디자인 토큰 |

---

## 7. 제약사항 및 주의사항

### 7.1 데이터 관련 (중요)
> **본 웹앱의 모든 수치는 가상(Mock) 데이터입니다.**
> 확진자 수, 처방량, 기상값, 평균 고도, 유동인구, 모델 성능 지표는 모두 **시드 기반으로 생성된 난수**이며,
> 실제 질병관리청·심평원·기상청·Vworld 데이터가 **아닙니다**. 역학적 해석이나 방역 의사결정에 사용할 수 없습니다.
> 화면 하단에 동일한 고지문이 상시 표시됩니다.

### 7.2 기능적 한계
- **실제 API 미연동**: 공공 OpenAPI 호출·인증·페이징 로직이 없습니다. 수집 상태 카드는 명세서 스펙을 표현한 목업입니다.
- **딥러닝 미탑재**: STGCN·LoRA·Integrated Gradients는 **연산하지 않습니다.** 명세서의 수식·지표·출력 형태를 화면으로 재현한 시뮬레이션입니다.
- **지도 경계 근사**: 지도는 위경도 등거리 투영(1°경도 ≈ 90km, 1°위도 ≈ 111km) 위에 그린 **개략 형상**이며, 실제 행정경계 GeoJSON이 아닙니다.
- **시군구 수**: 184개로, 전국 실제 시·군·구(약 250개) 전체를 포함하지 않습니다.
- **주차 표기**: ISO 주차가 아닌 단순 순차 주차(`2026-W01` ~ `2026-W52`)입니다.
- **반응형**: 1240px 이하에서 그리드가 1열로 전환되지만, 모바일 소형 화면에 최적화되어 있지 않습니다.
- **상태 저장 없음**: 새로고침 시 모든 상태(기준 주차·조정 파라미터)가 초기값으로 돌아갑니다.

### 7.3 성능
- 동적 인접 행렬은 기준 주차 변경·슬라이더 조작 시마다 재계산되며, 상위 위험 24개 시군구 기준 **576셀**로 제한했습니다.
- 임베딩 히트맵(20×16), Attention 히트맵(12×14)은 정적 렌더입니다.
- 전체 페이지는 단일 로드 후 추가 네트워크 요청이 없습니다.

---

## 8. 실제 배포 시 전환 계획

본 프로토타입을 실서비스로 전환할 때 대체해야 하는 지점입니다.

| 계층 | 프로토타입 | 실서비스 (명세서 6장) |
| :--- | :--- | :--- |
| 데이터 수집 | `SOURCES` 상수 (목업) | Apache Airflow 2.8 DAG + KDCA/HIRA/KMA/Vworld OpenAPI |
| 저장 | 인메모리 배열 | PostgreSQL 15 + PostGIS + TimescaleDB |
| PCA / GMM | `PCA`, `GMM` 상수 | Scikit-Learn `PCA(n_components=16)`, `GaussianMixture(k=4)` |
| 동적 그래프 | `computeGraph()` (JS) | Vworld 고도차 기반 Dynamic Gravity 생성기 (Python) |
| 예측 엔진 | `js/model.js` 렌더 | PyTorch 2.2 + PyTorch Geometric STGCN + Spatio-Temporal Attention |
| 보정 / XAI | 애니메이션 시뮬레이션 | LoRA 경량 미세조정 루틴, Integrated Gradients API |
| 서빙 | 정적 HTML | FastAPI (REST/gRPC) + React 18 + Mapbox GL JS |

---

## 9. 참고 문서

- 기술명세서 v4.0 — 시스템 아키텍처 및 개발 가이드 (`Tech Spec.md`)
- 발표 자료 — 엔드투엔드 분석 파이프라인 및 시스템 아키텍처 (`쯔쯔가무시증 예측 프로그램.pptx`)

---

## 10. 라이선스 및 고지

본 프로토타입은 기술 검증 목적의 데모입니다. 코드는 자유롭게 참고·수정할 수 있으나,
**내장된 가상 데이터의 수치를 실제 역학 통계로 인용하지 마십시오.**
실제 데이터 사용 시에는 각 공공기관(질병관리청·건강보험심사평가원·기상청·국토교통부 Vworld)의
OpenAPI 이용약관 및 공공데이터 개방 정책을 준수해야 합니다.
