# dysapp TSD (Technical Specification Document)

> **Version:** 1.0 (Created: 2025-01-27)
> **Status:** Initial Draft
> **Single Source of Truth:** `docs/postdocs/baseline_spec.md`
> **프로젝트명:** dysapp (Firebase Project ID: dysapp1210)

---

## 📌 0. 문서 정보

| 항목 | 내용 |
|------|------|
| **프로젝트명** | dysapp (Design Intelligence Support System) |
| **문서 유형** | Technical Specification Document (TSD) |
| **관련 문서** | dysapp_PRD.md, dysapp_SRD.md, dysapp_FRD.md |
| **작성 목적** | SRD의 기술 요구사항을 실제 구현 가능한 구체적인 기술 명세로 변환하며, 개발자가 바로 사용할 수 있는 수준의 상세 명세 제공 |

---

## 🎯 1. 개요 및 목적

### 1.1 문서 목적

본 TSD는 **dysapp**의 기술적 구현 명세를 정의합니다. 이 문서는:

- SRD의 기술 요구사항을 실제 구현 가능한 수준으로 상세화
- API 명세, 데이터베이스 스키마, 알고리즘, 컴포넌트 설계를 구체적으로 정의
- 순수 HTML/CSS/JavaScript 환경에 맞춘 구현 가이드 제공
- Firebase SDK 통합 및 백엔드 연동 상세 명세

### 1.2 문서 범위

**포함 범위**:
- 기술 스택 상세 명세
- 클라이언트 레이어 구조 (HTML/JS)
- Firebase SDK 통합 방법
- API 통신 레이어 설계
- 데이터 변환 레이어 (어댑터 패턴)
- 백엔드 연동 상세
- 마이그레이션 전략

**제외 범위**:
- 백엔드 Cloud Functions 구현 상세 (기존 코드 재사용)
- BigQuery 구현 상세 (향후)

### 1.3 인프라 정보

- **Firebase Project ID**: `dysapp1210`
- **프로젝트 번호**: `702244172468`
- **Storage Bucket**: `gs://dysapp1210.firebasestorage.app`
- **Storage 리전**: `asia-northeast3` (서울)
- **Firestore 데이터베이스 ID**: `dysapp`
- **Firestore 리전**: `nam5` (예외)
- **Cloud Functions 리전**: `asia-northeast3`
- **Authentication**: 익명 인증만 사용 (v1)

---

## 📋 목차

1. [기술 스택](#1-기술-스택)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [클라이언트 레이어 구조](#3-클라이언트-레이어-구조)
4. [Firebase SDK 통합](#4-firebase-sdk-통합)
5. [API 통신 레이어](#5-api-통신-레이어)
6. [데이터 변환 레이어](#6-데이터-변환-레이어)
7. [백엔드 연동 상세](#7-백엔드-연동-상세)
8. [마이그레이션 전략](#8-마이그레이션-전략)
9. [에러 처리 전략](#9-에러-처리-전략)
10. [성능 최적화](#10-성능-최적화)

---

## 1. 기술 스택

### 1.1 프론트엔드

| 기술 | 버전 | 용도 | 설정 |
|------|------|------|------|
| **HTML5** | - | 마크업 | 순수 HTML |
| **CSS3** | - | 스타일링 | 순수 CSS (`common.css`) |
| **JavaScript** | ES Modules | 로직 | 순수 JavaScript (ES Modules) |
| **Firebase SDK** | 12.6.0 | Firebase 서비스 연동 | Functions, Auth, Firestore, Storage |

**특징**:
- 빌드 도구 없음 (전략 A: 최소 변경)
- ES Modules 사용 (`type="module"`)
- `includHTML.js`를 통한 컴포넌트 로드

### 1.2 백엔드

| 기술 | 버전 | 용도 | 설정 |
|------|------|------|------|
| **Node.js** | 20 | 런타임 | - |
| **Firebase Cloud Functions** | v2 | 서버리스 함수 | asia-northeast3 리전 |
| **Firebase Admin SDK** | 13.0.1 | 서버 사이드 Firebase 연동 | - |
| **TypeScript** | 5.x | 타입 안정성 | - |

**재사용 범위**:
- 기존 `C:\dysprototype\functions\` 코드 그대로 사용
- Firebase 프로젝트 ID만 변경 (dysproto → dysapp1210)

### 1.3 데이터베이스 및 스토리지

| 기술 | 용도 | 설정 |
|------|------|------|
| **Firestore** | NoSQL 데이터베이스 | nam5 리전, 데이터베이스 ID: `dysapp` |
| **Firebase Storage** | 파일 저장소 | asia-northeast3 리전 |
| **BigQuery** | 데이터 웨어하우스 | (향후) |

### 1.4 AI 서비스

| 서비스 | 모델 | 용도 | 설정 |
|--------|------|------|------|
| **Gemini** | gemini-3-pro-preview | Vision 분석 | 3-Layer 평가 |
| **Gemini** | gemini-2.5-flash | Chat/Tutor | 멘토링 챗봇 |
| **Gemini** | multimodalembedding@001 | Image Embedding | 512-dim 벡터 |

---

## 2. 시스템 아키텍처

### 2.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (HTML/CSS/JavaScript)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ index.html  │  │analyze.html │  │searchTab.html│  │mypage.html │        │
│  │  (Upload)   │  │  (Report)   │  │  (Search)    │  │  (Profile)  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         └────────────────┴────────────────┴────────────────┘                │
│                            │                                                │
│                            ▼                                                │
│         ┌─────────────────────────────────────┐                             │
│         │  services/firebaseService.js        │                             │
│         │  - Firebase SDK 초기화              │                             │
│         │  - 익명 인증                        │                             │
│         └─────────────────────────────────────┘                             │
│                            │                                                │
│                            ▼                                                │
│         ┌─────────────────────────────────────┐                             │
│         │  services/apiService.js             │                             │
│         │  - Cloud Functions 호출             │                             │
│         │  - API 엔드포인트 매핑              │                             │
│         └─────────────────────────────────────┘                             │
│                            │                                                │
│                            ▼                                                │
│         ┌─────────────────────────────────────┐                             │
│         │  utils/dataAdapter.js              │                             │
│         │  - Firestore → 프론트엔드 변환      │                             │
│         │  - 3-Layer 구조 변환               │                             │
│         └─────────────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FIREBASE FUNCTIONS v2                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  analyzeDesign  │  │  chatWithMentor │  │  searchSimilar  │             │
│  │  (Vision + BQ)  │  │  (RAG + Chat)   │  │  (Vector KNN)   │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│  ┌─────────────────┐  ┌─────────────────┐                                  │
│  │  getAnalyses    │  │  getUserProfile │                                  │
│  │  (Query)        │  │  (Query)        │                                  │
│  └────────┬────────┘  └────────┬────────┘                                  │
└───────────┼────────────────────┼───────────────────────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                        AI MODEL LAYER                              │
│  ┌─────────────────────┐  ┌─────────────────────┐                 │
│  │  gemini-3-pro-      │  │  gemini-2.5-flash   │                 │
│  │  preview (Vision)   │  │  (Chat/Tutor)       │                 │
│  └─────────────────────┘  └─────────────────────┘                 │
│  ┌─────────────────────────────────────────────┐                  │
│  │  multimodalembedding@001 (512-dim)          │                  │
│  └─────────────────────────────────────────────┘                  │
└───────────────────────────────────────────────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Firestore (nam5 리전) - Real-time + Vector Search         │  │
│  │  ├── analyses/{id}         (AnalysisDocument + embedding)   │  │
│  │  ├── chatSessions/{id}     (ChatSessionDocument)            │  │
│  │  ├── bookmarks/{id}        (BookmarkDocument)               │  │
│  │  ├── collections/{id}      (CollectionDocument)             │  │
│  │  └── users/{uid}           (UserDocument)                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Cloud Storage (asia-northeast3)                            │  │
│  │  └── design-uploads/{uid}/{filename}                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

---

## 3. 클라이언트 레이어 구조

### 3.1 파일 구조

```
C:\dysapp\dys_prototype\
├── index.html              # 업로드 페이지
├── analyze.html            # 분석 결과 페이지
├── searchTab.html          # 검색 페이지
├── filter.html             # 필터 페이지
├── mypage.html             # 마이페이지 (비어있음)
├── search_detail_tab.html  # 검색 상세
├── nav.html                # 네비게이션 컴포넌트
├── common.css              # 전역 스타일
├── includHTML.js           # HTML include 유틸리티
├── services/               # (생성 필요)
│   ├── firebaseService.js  # Firebase SDK 초기화
│   └── apiService.js       # API 호출 함수들
└── utils/                  # (생성 필요)
    └── dataAdapter.js      # 데이터 구조 변환 어댑터
```

### 3.2 모듈 시스템

**ES Modules 사용**:
```html
<!-- index.html -->
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
  import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-functions.js';
  import { callAnalyzeDesign } from './services/apiService.js';
  
  // 사용 예시
  const result = await callAnalyzeDesign(imageData, mimeType, fileName);
</script>
```

### 3.3 컴포넌트 로드

**includHTML.js 사용**:
```html
<!-- nav.html 로드 -->
<nav data-include-path="nav.html"></nav>

<script src="./includHTML.js" defer></script>
```

---

## 4. Firebase SDK 통합

### 4.1 Firebase 초기화

**services/firebaseService.js**:
```javascript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-functions.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyBIAU8_4IxFVO4XpeHHggn8nIIbzWLBiRw",
  authDomain: "dysapp1210.firebaseapp.com",
  projectId: "dysapp1210",
  storageBucket: "dysapp1210.firebasestorage.app",
  messagingSenderId: "702244172468",
  appId: "1:702244172468:web:795097d671c2b7944a9de1",
  measurementId: "G-H9VK5Q2LXN"
};

const app = initializeApp(firebaseConfig);
export const functions = getFunctions(app, 'asia-northeast3');
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 익명 인증 초기화
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInAnonymously(auth);
  }
});
```

### 4.2 인증 플로우

**익명 인증 자동 실행**:
- 페이지 로드 시 자동으로 익명 인증 수행
- 인증 상태 변경 감지 (`onAuthStateChanged`)
- 인증되지 않은 사용자 자동 인증

---

## 5. API 통신 레이어

### 5.1 API 서비스 구조

**services/apiService.js**:
```javascript
import { functions, httpsCallable } from './firebaseService.js';

/**
 * 이미지 분석 API 호출
 * @param {string} imageData - base64 인코딩된 이미지 데이터
 * @param {string} mimeType - 이미지 MIME 타입 (image/jpeg, image/png)
 * @param {string} fileName - 파일명
 * @returns {Promise<Object>} 분석 결과 (AnalysisDocument)
 */
export async function callAnalyzeDesign(imageData, mimeType, fileName) {
  const analyzeDesign = httpsCallable(functions, 'analyzeDesign', { timeout: 300000 });
  try {
    const result = await analyzeDesign({ imageData, mimeType, fileName });
    return result.data;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

/**
 * AI 멘토 채팅 API 호출
 * @param {string} message - 사용자 메시지
 * @param {string|null} sessionId - 세션 ID (선택사항)
 * @param {string} analysisContext - 분석 컨텍스트 (analysisId)
 * @returns {Promise<Object>} 채팅 응답
 */
export async function callChatWithMentor(message, sessionId, analysisContext) {
  const chatWithMentor = httpsCallable(functions, 'chatWithMentor');
  try {
    const result = await chatWithMentor({
      message,
      sessionId: sessionId || null,
      analysisContext
    });
    return result.data;
  } catch (error) {
    console.error('Chat failed:', error);
    throw error;
  }
}

/**
 * 유사 디자인 검색 API 호출
 * @param {string} analysisId - 분석 ID
 * @param {number} limit - 결과 개수 (기본값: 10)
 * @param {string|null} filterFormat - 포맷 필터 (선택사항)
 * @param {string|null} filterFixScope - fixScope 필터 (선택사항)
 * @returns {Promise<Array>} 유사 디자인 리스트
 */
export async function callSearchSimilar(analysisId, limit = 10, filterFormat = null, filterFixScope = null) {
  const searchSimilar = httpsCallable(functions, 'searchSimilar');
  try {
    const result = await searchSimilar({
      analysisId,
      limit,
      filterFormat,
      filterFixScope
    });
    return result.data;
  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
}

/**
 * 분석 결과 조회 API 호출
 * @param {string} analysisId - 분석 ID
 * @returns {Promise<Object>} 분석 결과 (AnalysisDocument)
 */
export async function callGetAnalysis(analysisId) {
  const getAnalysis = httpsCallable(functions, 'getAnalysis');
  try {
    const result = await getAnalysis({ analysisId });
    return result.data;
  } catch (error) {
    console.error('Get analysis failed:', error);
    throw error;
  }
}

/**
 * 사용자 분석 목록 조회 API 호출
 * @param {string} userId - 사용자 ID
 * @param {number} limit - 결과 개수 (기본값: 20)
 * @param {number} offset - 오프셋 (기본값: 0)
 * @returns {Promise<Array>} 분석 목록
 */
export async function callGetAnalyses(userId, limit = 20, offset = 0) {
  const getAnalyses = httpsCallable(functions, 'getAnalyses');
  try {
    const result = await getAnalyses({ userId, limit, offset });
    return result.data;
  } catch (error) {
    console.error('Get analyses failed:', error);
    throw error;
  }
}

/**
 * 사용자 프로필 조회 API 호출
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 사용자 프로필 (UserDocument)
 */
export async function callGetUserProfile(userId) {
  const getUserProfile = httpsCallable(functions, 'getUserProfile');
  try {
    const result = await getUserProfile({ userId });
    return result.data;
  } catch (error) {
    console.error('Get user profile failed:', error);
    throw error;
  }
}

/**
 * 텍스트 기반 이미지 검색 API 호출
 * @param {string} query - 검색어
 * @param {number} limit - 결과 개수 (기본값: 10)
 * @returns {Promise<Array>} 검색 결과 리스트
 */
export async function callSearchImages(query, limit = 10) {
  const searchImages = httpsCallable(functions, 'searchImages');
  try {
    const result = await searchImages({ query, limit });
    return result.data;
  } catch (error) {
    console.error('Search images failed:', error);
    throw error;
  }
}
```

---

## 6. 데이터 변환 레이어

### 6.1 데이터 어댑터 구조

**utils/dataAdapter.js**:
```javascript
/**
 * Firestore AnalysisDocument를 프론트엔드 표시 형식으로 변환
 * @param {Object} backendResult - 백엔드에서 받은 AnalysisDocument
 * @returns {Object} 프론트엔드 표시 형식
 */
export function adaptAnalysisResult(backendResult) {
  return {
    // 기본 정보
    analysisId: backendResult.analysisId || backendResult.id,
    imageUrl: backendResult.imageUrl,
    formatPrediction: backendResult.formatPrediction,
    overallScore: backendResult.overallScore,
    fixScope: backendResult.fixScope,

    // Layer 1: Performance & Information (50%)
    layer1: {
      hierarchyScore: backendResult.layer1Metrics.hierarchyScore,
      scanabilityScore: backendResult.layer1Metrics.scanabilityScore,
      goalClarityScore: backendResult.layer1Metrics.goalClarityScore,
      accessibility: backendResult.layer1Metrics.accessibility,
      diagnosisSummary: backendResult.layer1Metrics.diagnosisSummary
    },

    // Layer 2: Form & Aesthetic (30%)
    layer2: {
      gridConsistency: backendResult.layer2Metrics.gridConsistency,
      visualBalance: backendResult.layer2Metrics.visualBalance,
      colorHarmony: backendResult.layer2Metrics.colorHarmony,
      typographyQuality: backendResult.layer2Metrics.typographyQuality
    },

    // Layer 3: Communicative Impact (20%)
    layer3: {
      trustVibe: backendResult.layer3Metrics.trustVibe,
      engagementPotential: backendResult.layer3Metrics.engagementPotential,
      emotionalTone: backendResult.layer3Metrics.emotionalTone
    },

    // 기타
    colorPalette: backendResult.colorPalette,
    detectedKeywords: backendResult.detectedKeywords,
    nextActions: backendResult.nextActions
  };
}
```

---

## 7. 백엔드 연동 상세

### 7.1 Cloud Functions 엔드포인트 매핑

| 프론트엔드 함수 | Cloud Function | 리전 | 타임아웃 |
|----------------|----------------|------|----------|
| `callAnalyzeDesign` | `analyzeDesign` | asia-northeast3 | 300초 |
| `callChatWithMentor` | `chatWithMentor` | asia-northeast3 | 120초 |
| `callSearchSimilar` | `searchSimilar` | asia-northeast3 | 60초 |
| `callGetAnalysis` | `getAnalysis` | asia-northeast3 | 30초 |
| `callGetAnalyses` | `getAnalyses` | asia-northeast3 | 30초 |
| `callGetUserProfile` | `getUserProfile` | asia-northeast3 | 30초 |
| `callSearchImages` | `searchImages` | asia-northeast3 | 30초 |

### 7.2 기존 백엔드 코드 재사용

**재사용 범위**:
- `C:\dysprototype\functions\src\index.ts` - Cloud Functions 코드 그대로 사용
- `C:\dysprototype\functions\src\types.ts` - 타입 정의 그대로 사용
- `C:\dysprototype\functions\src\analysis\` - 분석 로직 그대로 사용
- `C:\dysprototype\functions\src\search\` - 검색 로직 그대로 사용

**변경 사항**:
- Firebase 프로젝트 ID 변경 (dysproto → dysapp1210)
- Firestore 데이터베이스 ID 변경 (dysproto → dysapp)
- Storage Bucket 변경 (dysproto → dysapp1210)

---

## 8. 마이그레이션 전략

### 8.1 마이그레이션 파일 생성

**위치**: `C:\dysprototype\migration\`

**생성할 파일들**:
1. `firebaseConfig.js` - 새 프로젝트 Firebase 설정
2. `apiService.js` - API 호출 함수들 (ES Modules)
3. `firebaseService.js` - Firebase SDK 초기화
4. `dataAdapter.js` - 데이터 구조 변환 어댑터
5. `migration-guide.md` - 마이그레이션 가이드

### 8.2 마이그레이션 절차

1. **마이그레이션 파일 생성** (`C:\dysprototype\migration\`)
   - Firebase 설정 파일 생성
   - API 서비스 레이어 생성
   - 데이터 어댑터 생성

2. **PowerShell 전송**
   - 마이그레이션 파일들을 `C:\dysapp\dys_prototype\`로 전송
   - 디렉토리 구조 생성 (services/, utils/)

3. **백엔드 재배포**
   - 기존 Cloud Functions 코드를 새 프로젝트에 배포
   - Firebase 프로젝트 설정 변경

4. **프론트엔드 연결**
   - HTML 파일에 Firebase SDK 통합
   - API 호출 로직 추가
   - 데이터 어댑터 적용

---

## 9. 에러 처리 전략

### 9.1 전역 에러 핸들러

```javascript
// services/errorHandler.js
export function handleApiError(error) {
  if (error.code === 'unauthenticated') {
    // 익명 인증 자동 재시도
    return { type: 'auth', message: '인증이 필요합니다. 잠시 후 다시 시도해주세요.' };
  } else if (error.code === 'not-found') {
    return { type: 'not-found', message: '요청한 데이터를 찾을 수 없습니다.' };
  } else if (error.code === 'permission-denied') {
    return { type: 'permission', message: '권한이 없습니다.' };
  } else if (error.code === 'resource-exhausted') {
    return { type: 'quota', message: 'API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.' };
  } else {
    return { type: 'unknown', message: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
  }
}
```

### 9.2 재시도 로직

```javascript
// utils/retry.js
export async function retryApiCall(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 지수 백오프
    }
  }
}
```

---

## 10. 성능 최적화

### 10.1 이미지 최적화

- 업로드 전 이미지 리사이즈 (최대 1920px)
- base64 인코딩 최적화
- 압축된 이미지 형식 사용 (WebP 지원 시)

### 10.2 API 호출 최적화

- 분석 결과 캐싱 (localStorage)
- 중복 요청 방지 (debounce)
- 배치 요청 (여러 분석 조회 시)

### 10.3 렌더링 최적화

- 지연 로딩 (Lazy Loading)
- 가상 스크롤 (대량 결과 표시 시)
- CSS 최적화 (불필요한 스타일 제거)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-27 | Initial TSD for dysapp project |

---

*Generated for dysapp project (Firebase Project ID: dysapp1210)*

