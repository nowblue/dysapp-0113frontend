# dysapp 구현 보고서

> **작성일**: 2025-12-15
> **프로젝트**: dysapp - AI 기반 디자인 분석 플랫폼
> **Firebase Project ID**: dysapp1210
> **Region**: asia-northeast3
> **PRD 참조**: `docs/dysapp_PRD.md`

---

## 1. 프로젝트 개요

### 1.1 목적
디자이너와 비디자이너를 위한 AI 기반 디자인 분석 플랫폼으로, 이미지 업로드 시 3-Layer 평가 체계를 통해 정량적/정성적 분석을 제공하고, AI 멘토 채팅 및 유사 디자인 검색 기능을 지원합니다.

### 1.2 기술 스택
| 구분 | 기술 |
|------|------|
| Frontend | Pure HTML/CSS/JavaScript (ES Modules) |
| Backend | Firebase Cloud Functions v2 (TypeScript) |
| Database | Firestore (Native Vector Search 지원) |
| Storage | Firebase Storage |
| Auth | Firebase Anonymous Auth |
| AI Models | Gemini 2.0 Flash (Vision/Chat), Vertex AI Multimodal Embedding |

---

## 2. 구현 완료 현황

### 2.1 태스크 진행 요약

| 단계 | 작업 내용 | 상태 |
|------|----------|------|
| Phase 1 | Firebase 프로젝트 설정 파일 생성 | ✅ 완료 |
| Phase 2 | Cloud Functions TypeScript 백엔드 구현 | ✅ 완료 |
| Phase 3 | 프론트엔드 서비스 레이어 구현 | ✅ 완료 |
| Phase 4 | 페이지별 JavaScript 모듈 구현 | ✅ 완료 |
| Phase 5 | HTML 파일 스크립트 연동 | ✅ 완료 |

---

## 3. 파일 구조 및 상세 구현

### 3.1 Firebase 설정 파일

```
dys_prototype/
├── firebase.json          # Firebase 프로젝트 통합 설정
├── .firebaserc            # 프로젝트 ID 매핑 (dysapp1210)
├── firestore.rules        # Firestore 보안 규칙
├── firestore.indexes.json # 복합 인덱스 + 벡터 인덱스 정의
└── storage.rules          # Storage 보안 규칙
```

#### firestore.indexes.json 핵심 설정
```json
{
  "indexes": [
    { "collectionGroup": "analyses", "fields": ["userId", "createdAt DESC"] },
    { "collectionGroup": "analyses", "fields": ["userId", "formatPrediction", "createdAt DESC"] }
  ],
  "fieldOverrides": [{
    "collectionGroup": "analyses",
    "fieldPath": "imageEmbedding",
    "indexes": [{
      "queryScope": "COLLECTION",
      "vectorConfig": { "dimension": 512, "flat": {} }
    }]
  }]
}
```

---

### 3.2 Cloud Functions 백엔드

```
functions/src/
├── index.ts               # 진입점 - 모든 함수 export
├── types.ts               # TypeScript 타입 정의
├── constants.ts           # 상수 (모델명, 가중치, 임계값)
├── analysis/
│   ├── analyzeDesign.ts   # 메인 분석 함수 (파이프라인 오케스트레이션)
│   ├── visionSchema.ts    # Gemini Vision JSON Schema
│   ├── converter.ts       # snake_case → camelCase 변환
│   ├── diagnose.ts        # fixScope 규칙 기반 계산
│   └── embedding.ts       # 멀티모달 임베딩 생성
├── chat/
│   └── chatWithMentor.ts  # AI 멘토 채팅 (fixScope 인식)
├── search/
│   └── searchSimilar.ts   # 벡터 유사도 검색
└── user/
    └── profileFunctions.ts # 사용자/분석 관리 (5개 함수)
```

#### 3.2.1 타입 정의 (types.ts)

**필드 네이밍 컨벤션**:
| 레이어 | 컨벤션 | 예시 |
|--------|--------|------|
| LLM 출력 | snake_case | `hierarchy_score` |
| Firestore | camelCase | `hierarchyScore` |
| BigQuery | snake_case | `hierarchy_score` |

**핵심 타입**:
```typescript
interface AnalysisDocument {
  userId: string;
  fileName: string;
  imageUrl: string;
  formatPrediction: FormatPrediction;  // UX_UI | Editorial | Poster | ...
  layer1Metrics: PerformanceMetrics;   // 50% 가중치
  layer2Metrics: FormMetrics;          // 30% 가중치
  layer3Metrics: CommunicativeMetrics; // 20% 가중치
  overallScore: number;
  fixScope: FixScope;                  // StructureRebuild | DetailTuning
  imageEmbedding?: number[];           // 512차원 벡터
  nextActions: string[];               // AI 추천 개선 액션 (3개)
  createdAt: Timestamp;
}
```

#### 3.2.2 분석 파이프라인 (analyzeDesign.ts)

```
[이미지 업로드]
    ↓
[Storage 저장] → imageUrl 생성
    ↓
[Gemini Vision 분석] → JSON Schema 기반 구조화된 출력
    ↓
[converter.ts] → snake_case → camelCase 변환
    ↓
[diagnose.ts] → fixScope 규칙 기반 검증/오버라이드
    ↓
[embedding.ts] → 512차원 멀티모달 임베딩 생성
    ↓
[Firestore 저장] → analyses 컬렉션
    ↓
[결과 반환] → { success, analysisId, overallScore, fixScope }
```

#### 3.2.3 fixScope 결정 로직 (diagnose.ts)

PRD 4.5 기반 규칙:

```typescript
function computeFixScope(l1: PerformanceMetrics, l2: FormMetrics): FixScope {
  // StructureRebuild 조건
  if (l1.hierarchyScore < 50) return "StructureRebuild";
  if (l1.goalClarityScore < 50) return "StructureRebuild";
  if (l1.scanabilityScore < 50) return "StructureRebuild";
  if (l1.hierarchyScore >= 50 && l1.hierarchyScore < 60) return "StructureRebuild";

  // 위 조건 미충족 시
  return "DetailTuning";
}
```

**검증 프로세스**:
1. LLM이 fixScope 제안
2. 규칙 기반 computeFixScope() 계산
3. 두 값이 다르면 규칙 기반 값으로 오버라이드
4. 로그에 오버라이드 기록

---

### 3.3 프론트엔드 서비스 레이어

```
services/
├── firebaseService.js    # Firebase SDK 초기화 및 Auth 관리
└── apiService.js         # Cloud Functions API 래퍼

utils/
└── dataAdapter.js        # API 응답 → UI 데이터 변환
```

#### 3.3.1 firebaseService.js

```javascript
// ES Modules CDN import
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "...";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "...";

// 주요 export
export { initializeFirebase, ensureAuth, signOut, onAuthChange, callFunction, getCurrentUser };
```

#### 3.3.2 apiService.js

| 함수 | 용도 | 입력 | 출력 |
|------|------|------|------|
| `analyzeDesign()` | 디자인 분석 | imageData, mimeType, fileName | analysisId, overallScore |
| `getAnalysis()` | 단일 분석 조회 | analysisId | analysis object |
| `getAnalyses()` | 히스토리 조회 | limit, offset, filters | analyses array |
| `deleteAnalysis()` | 분석 삭제 | analysisId | success |
| `chatWithMentor()` | AI 멘토 채팅 | analysisId, message, sessionId | response, sessionId |
| `searchSimilar()` | 유사 검색 | analysisId, limit, filters | results array |
| `getUserProfile()` | 프로필 조회 | - | profile object |
| `updateUserProfile()` | 프로필 수정 | displayName, preferences | success |

#### 3.3.3 dataAdapter.js

**변환 함수**:
- `adaptAnalysisResponse()` - 분석 결과 UI 포맷 변환
- `adaptSearchResponse()` - 검색 결과 변환
- `adaptUserProfile()` - 프로필 데이터 변환
- `adaptAnalysesResponse()` - 히스토리 목록 변환

**레이블 상수**:
```javascript
export const FORMAT_LABELS = {
  UX_UI: "UX/UI 디자인",
  Editorial: "에디토리얼",
  Poster: "포스터",
  Thumbnail: "썸네일",
  Card: "카드",
  BI_CI: "BI/CI"
};

export const FIX_SCOPE_LABELS = {
  StructureRebuild: "구조 재설계 필요",
  DetailTuning: "디테일 튜닝"
};
```

---

### 3.4 페이지별 스크립트

```
scripts/
├── app.js       # 전역 초기화, 로딩, 토스트, 네비게이션
├── upload.js    # index.html - 이미지 업로드/분석 시작
├── analyze.js   # analyze.html - 분석 결과/AI 채팅
├── search.js    # searchTab.html - 유사 디자인 검색
└── mypage.js    # mypage.html - 프로필/히스토리
```

#### 3.4.1 app.js (전역)

```javascript
// 전역 상태
window.dysapp = { initialized: false, user: null, loading: false };

// 주요 기능
- initApp()           // Firebase 초기화, Auth 설정
- showLoading(msg)    // 로딩 오버레이 표시
- hideLoading()       // 로딩 숨김
- toast.success/error/warning/info()  // 토스트 알림
- navigateToAnalysis(id)  // 분석 페이지 이동
- navigateToSearch()      // 검색 페이지 이동
- navigateToUpload()      // 업로드 페이지 이동

// 초기화 완료 시 이벤트 발행
window.dispatchEvent(new CustomEvent("dysapp:ready"));
```

#### 3.4.2 upload.js (index.html)

**DOM 바인딩**:
- `.uploadBox` - 드래그앤드롭 영역
- `.upload_input` - 파일 입력
- `.prompt` - 프롬프트 텍스트
- `.send_btn` - 분석 시작 버튼
- `#promptModal` - 히스토리 모달

**주요 기능**:
1. 파일 선택/드래그앤드롭
2. 이미지 프리뷰 표시
3. `analyzeDesign()` API 호출
4. 결과 페이지로 자동 이동

#### 3.4.3 analyze.js (analyze.html)

**DOM 바인딩**:
- `#mainDescription` - 메인 설명
- `#mainTags` - 키워드 태그
- `#dataBoxContainer` - 6개 데이터박스 컨테이너
- `#chatInput`, `#chatSendBtn` - 채팅 입력
- `#chatContainer` - 채팅 메시지 영역
- `#suggestionBox` - 채팅 제안 버튼

**렌더링 함수**:
```javascript
renderAnalysisResults()
├── renderHeader()           // 메인 설명
├── renderKeywords()         // 키워드 태그
├── renderDataBoxes()
│   ├── renderColorPalette()      // 색상 팔레트
│   ├── renderDetectedObjects()   // 감지된 객체
│   ├── renderUsageSuggestions()  // 활용 제안
│   ├── renderLayoutMetrics()     // 레이아웃 메트릭
│   ├── renderTypographyMetrics() // 타이포그래피
│   └── renderLanguageData()      // 언어/텍스트
├── renderAISuggestion()     // AI 추천
└── renderChatSuggestions()  // 채팅 제안 버튼
```

#### 3.4.4 search.js (searchTab.html)

**DOM 바인딩**:
- `.search` - 검색 입력
- `.searchIcon` - 검색 버튼
- `.uploadIcon` - 이미지 업로드 버튼
- `.filter` - 필터 버튼
- `.searchImgBox` - 결과 그리드
- `.filenameBox` - 카테고리 탭

**검색 플로우**:
```
[이미지 업로드] → analyzeDesign() → searchSimilar() → 결과 렌더링
      또는
[마지막 분석 ID] → searchSimilar() → 결과 렌더링
```

#### 3.4.5 mypage.js (mypage.html)

**DOM 바인딩**:
- `.profile-section` - 프로필 영역
- `.history-section` - 히스토리 영역
- `.history-grid` - 히스토리 그리드
- `.load-more-btn` - 더 보기 버튼

**주요 기능**:
1. 프로필 표시/수정 모달
2. 분석 히스토리 그리드 (페이지네이션)
3. 분석 삭제 (확인 후 삭제)
4. 로그아웃

---

### 3.5 HTML 수정 사항

| 파일 | 추가된 스크립트 | 추가된 DOM ID |
|------|----------------|---------------|
| index.html | app.js, upload.js | - |
| analyze.html | app.js, analyze.js | mainDescription, mainTags, dataBoxContainer, colorPaletteContent, detectedObjectsContent, usageSuggestionsContent, layoutContent, typographyContent, languageContent, aiRecommendation, chatContainer, suggestionBox, chatInput, chatSendBtn |
| searchTab.html | app.js, search.js | - |
| mypage.html | app.js, mypage.js | profile-section, history-section, history-grid, load-more-btn |

---

## 4. 메트릭스 가중치 설정

### 4.1 Overall Score 계산

```
Overall Score = Layer1 × 0.5 + Layer2 × 0.3 + Layer3 × 0.2
```

### 4.2 Layer별 세부 메트릭

#### Layer 1: Performance (50%)
| 메트릭 | 범위 | 평가 기준 |
|--------|------|----------|
| hierarchy_score | 0-100 | 정보 계층 구조 명확성 |
| goal_clarity_score | 0-100 | 디자인 목표 전달력 |
| scanability_score | 0-100 | 정보 스캔 용이성 |

**Layer1 Score** = (hierarchy + goal_clarity + scanability) / 3

#### Layer 2: Form (30%)
| 메트릭 | 범위 | 평가 기준 |
|--------|------|----------|
| color_harmony_score | 0-100 | 색상 조화도 |
| typography_quality_score | 0-100 | 타이포그래피 품질 |
| grid_alignment_score | 0-100 | 그리드 정렬도 |
| balance_score | 0-100 | 시각적 균형 |

**Layer2 Score** = (color + typography + grid + balance) / 4

#### Layer 3: Communicative (20%)
| 메트릭 | 타입 | 평가 기준 |
|--------|------|----------|
| tone_label | string | 디자인 톤 (모던, 클래식 등) |
| trend_alignment_score | 0-100 | 트렌드 부합도 |
| originality_score | 0-100 | 독창성 |

**Layer3 Score** = (trend_alignment + originality) / 2

### 4.3 fixScope 결정 규칙

| 조건 | fixScope |
|------|----------|
| hierarchy_score < 50 | StructureRebuild |
| goal_clarity_score < 50 | StructureRebuild |
| scanability_score < 50 | StructureRebuild |
| 50 ≤ hierarchy_score < 60 | StructureRebuild |
| 위 조건 모두 미충족 | DetailTuning |

---

## 5. API 엔드포인트 정리

### 5.1 Cloud Functions 엔드포인트

**Base URL**: `https://asia-northeast3-dysapp1210.cloudfunctions.net`

| 함수명 | 메서드 | Timeout | Memory | 용도 |
|--------|--------|---------|--------|------|
| analyzeDesign | onCall | 540s | 1GiB | 이미지 분석 |
| chatWithMentor | onCall | 120s | 512MiB | AI 채팅 |
| searchSimilar | onCall | 60s | 512MiB | 유사 검색 |
| getAnalyses | onCall | 30s | 256MiB | 히스토리 조회 |
| getAnalysis | onCall | 30s | 256MiB | 단일 분석 조회 |
| deleteAnalysis | onCall | 30s | 256MiB | 분석 삭제 |
| getUserProfile | onCall | 30s | 256MiB | 프로필 조회 |
| updateUserProfile | onCall | 30s | 256MiB | 프로필 수정 |
| healthCheck | onCall | 10s | 128MiB | 상태 확인 |

### 5.2 API 입출력 스펙

#### analyzeDesign
```typescript
// Input
{ imageData: string, mimeType: string, fileName: string, userPrompt?: string }

// Output
{ success: boolean, analysisId: string, overallScore: number, fixScope: string, formatPrediction: string }
```

#### chatWithMentor
```typescript
// Input
{ analysisId: string, message: string, sessionId?: string }

// Output
{ success: boolean, response: string, sessionId: string }
```

#### searchSimilar
```typescript
// Input
{ analysisId: string, limit?: number, filterFormat?: string, filterFixScope?: string, minScore?: number }

// Output
{ success: boolean, results: SearchResult[], count: number }
```

---

## 6. 의존성 그래프

### 6.1 프론트엔드 → 백엔드

```
HTML Pages
    ↓
scripts/*.js
    ↓
services/apiService.js
    ↓
services/firebaseService.js
    ↓
Firebase SDK (CDN)
    ↓
Cloud Functions (asia-northeast3)
```

### 6.2 백엔드 내부

```
index.ts
    ├── analysis/analyzeDesign.ts
    │       ├── visionSchema.ts
    │       ├── converter.ts
    │       ├── diagnose.ts
    │       └── embedding.ts
    ├── chat/chatWithMentor.ts
    ├── search/searchSimilar.ts
    └── user/profileFunctions.ts

모든 모듈 공통 의존:
    ├── types.ts
    └── constants.ts
```

---

## 7. 생성/수정된 파일 목록

### 7.1 생성된 파일 (24개)

**Firebase 설정 (5개)**
- `firebase.json`
- `.firebaserc`
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`

**Functions 설정 (3개)**
- `functions/package.json`
- `functions/tsconfig.json`
- `functions/.eslintrc.js`

**Functions 코어 (3개)**
- `functions/src/index.ts`
- `functions/src/types.ts`
- `functions/src/constants.ts`

**Functions 분석 모듈 (5개)**
- `functions/src/analysis/analyzeDesign.ts`
- `functions/src/analysis/visionSchema.ts`
- `functions/src/analysis/converter.ts`
- `functions/src/analysis/diagnose.ts`
- `functions/src/analysis/embedding.ts`

**Functions 기타 모듈 (3개)**
- `functions/src/chat/chatWithMentor.ts`
- `functions/src/search/searchSimilar.ts`
- `functions/src/user/profileFunctions.ts`

**프론트엔드 서비스 (2개)**
- `services/firebaseService.js`
- `services/apiService.js`

**유틸리티 (1개)**
- `utils/dataAdapter.js`

**페이지 스크립트 (5개)**
- `scripts/app.js`
- `scripts/upload.js`
- `scripts/analyze.js`
- `scripts/search.js`
- `scripts/mypage.js`

### 7.2 수정된 파일 (4개)

- `index.html` - 스크립트 모듈 추가
- `analyze.html` - 스크립트 모듈 + 동적 콘텐츠 ID 추가
- `searchTab.html` - 스크립트 모듈 추가
- `mypage.html` - 스크립트 모듈 + 섹션 구조 추가

---

## 8. 배포 가이드

### 8.1 사전 요구사항

1. Node.js 20.x 이상
2. Firebase CLI (`npm install -g firebase-tools`)
3. Firebase 프로젝트 생성 (dysapp1210)

### 8.2 Firebase API 키 설정

`services/firebaseService.js`의 `firebaseConfig` 객체에 실제 값 입력:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",           // ← 실제 값으로 교체
  authDomain: "dysapp1210.firebaseapp.com",
  projectId: "dysapp1210",
  storageBucket: "dysapp1210.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",  // ← 실제 값으로 교체
  appId: "YOUR_APP_ID"              // ← 실제 값으로 교체
};
```

### 8.3 Cloud Functions 배포

```bash
# 1. 의존성 설치
cd functions
npm install

# 2. 빌드 테스트
npm run build

# 3. 배포
cd ..
firebase deploy --only functions
```

### 8.4 Firestore 벡터 인덱스 생성

Firebase Console에서 수동 생성 필요:

1. Firestore → Indexes → Vector indexes
2. Collection: `analyses`
3. Field: `imageEmbedding`
4. Dimension: `512`
5. Distance measure: `COSINE`

### 8.5 호스팅 배포

```bash
firebase deploy --only hosting
```

---

## 9. 테스트 체크리스트

### 9.1 기능 테스트

- [ ] 이미지 업로드 및 분석
- [ ] 분석 결과 표시 (6개 데이터박스)
- [ ] AI 멘토 채팅
- [ ] 유사 디자인 검색
- [ ] 분석 히스토리 조회
- [ ] 분석 삭제
- [ ] 프로필 조회/수정

### 9.2 에뮬레이터 테스트

```bash
# 에뮬레이터 시작
firebase emulators:start

# 접속
# Functions: http://localhost:5001
# Firestore: http://localhost:8080
# Auth: http://localhost:9099
```

---

## 10. 향후 개선 사항

1. **BigQuery 연동**: 분석 데이터 → BigQuery 스트리밍 (PRD 참조)
2. **구독 시스템**: 무료/프로 플랜 분기 처리
3. **북마크 기능**: 유사 검색 결과 저장
4. **소셜 로그인**: Google/Apple OAuth 추가
5. **실시간 알림**: FCM 푸시 알림

---

## 11. 참고 문서

- PRD: `docs/dysapp_PRD.md`
- API 스펙: `docs/dysapp_APISPEC.md`
- 기능 요구사항: `docs/dysapp_FRD.md`
- 기술 설계: `docs/dysapp_TSD.md`
- 시스템 요구사항: `docs/dysapp_SRD.md`

---

*본 보고서는 PRD 기반 전체 구현 작업의 결과물을 정리한 문서입니다.*
