# dysapp 프론트엔드 개발자 온보딩 가이드

**작성일**: 2025-01-27  
**프로젝트**: dysapp (디자인 분석 AI 플랫폼)  
**대상**: 신규 프론트엔드 개발자

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [개발 환경 설정](#4-개발-환경-설정)
5. [주요 파일 설명](#5-주요-파일-설명)
6. [개발 워크플로우](#6-개발-워크플로우)
7. [주요 기능 가이드](#7-주요-기능-가이드)
8. [API 사용 가이드](#8-api-사용-가이드)
9. [스타일 가이드](#9-스타일-가이드)
10. [문제 해결 가이드](#10-문제-해결-가이드)
11. [참고 자료](#11-참고-자료)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 소개

**dysapp**은 디자인 이미지를 AI 기반으로 분석하고, 객관적인 피드백을 제공하는 웹 애플리케이션입니다.

**핵심 기능:**
- 🖼️ **디자인 이미지 분석**: AI가 디자인의 색상, 레이아웃, 타이포그래피 등을 분석
- 💬 **AI 멘토 채팅**: 분석 결과에 대한 질문 및 답변
- 🔍 **유사 디자인 검색**: 업로드한 이미지와 유사한 디자인 검색
- 📊 **분석 히스토리**: 과거 분석 결과 관리 및 비교

### 1.2 기술적 특징

- **순수 HTML/CSS/JavaScript**: 프레임워크 없이 바닐라 JavaScript 사용
- **ES Modules**: `import/export` 문법 사용
- **Firebase 통합**: Firebase Functions, Firestore, Storage, Authentication 사용
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원

### 1.3 사용자 플로우

```
1. 이미지 업로드 (index.html)
   ↓
2. AI 분석 실행 (analyzeDesign API)
   ↓
3. 분석 결과 확인 (analyze.html)
   ↓
4. AI 멘토와 채팅 (chatWithMentor API)
   ↓
5. 유사 디자인 검색 (searchTab.html)
```

---

## 2. 기술 스택

### 2.1 프론트엔드

- **언어**: JavaScript (ES6+)
- **모듈 시스템**: ES Modules (`import/export`)
- **스타일**: CSS3 (CSS Variables 사용)
- **폰트**: Google Fonts (Rubik), SUITE 폰트

### 2.2 백엔드 연동

- **Firebase Functions**: Cloud Functions v2 (Callable Functions)
- **Firebase Firestore**: NoSQL 데이터베이스
- **Firebase Storage**: 이미지 파일 저장
- **Firebase Authentication**: 익명 인증

### 2.3 개발 도구

- **로컬 서버**: Firebase Emulators 또는 간단한 HTTP 서버
- **브라우저**: Chrome, Firefox, Safari, Edge (최신 버전)
- **에디터**: VS Code 권장

---

## 3. 프로젝트 구조

### 3.1 전체 디렉토리 구조

```
dys_prototype/
├── 📄 HTML 파일들 (루트)
│   ├── index.html          # 메인 업로드 페이지
│   ├── analyze.html        # 분석 결과 페이지
│   ├── searchTab.html      # 검색 페이지
│   ├── mypage.html         # 마이페이지
│   ├── settings.html       # 설정 페이지
│   ├── subscribe.html      # 구독 페이지
│   ├── nav.html            # 네비게이션 컴포넌트
│   ├── filter.html         # 필터 페이지
│   └── search_detail_tab.html  # 검색 상세 페이지
│
├── 📁 scripts/             # 페이지별 JavaScript 로직
│   ├── app.js              # 앱 초기화 및 공통 기능
│   ├── upload.js           # 파일 업로드 처리
│   ├── analyze.js          # 분석 결과 렌더링 및 채팅
│   ├── search.js           # 검색 기능
│   ├── mypage.js           # 마이페이지 로직
│   ├── settings.js         # 설정 페이지 로직
│   └── subscribe.js        # 구독 페이지 로직
│
├── 📁 services/            # API 서비스 레이어
│   ├── apiService.js       # Cloud Functions 호출 래퍼
│   ├── firebaseService.js  # Firebase 초기화 및 인증
│   └── errorHandler.js     # 에러 처리
│
├── 📁 utils/               # 유틸리티 함수들
│   ├── dataAdapter.js      # 데이터 변환 및 어댑터
│   ├── domHelper.js        # DOM 조작 헬퍼
│   ├── eventManager.js     # 이벤트 관리
│   ├── performance.js      # 성능 최적화 유틸리티
│   └── stateManager.js     # 상태 관리 (localStorage/sessionStorage)
│
├── 📁 img/                 # 이미지 리소스
│   └── *.svg, *.png        # 아이콘 및 이미지 파일들
│
├── 📄 common.css           # 전역 스타일시트
├── 📄 includHTML.js        # HTML 컴포넌트 포함 유틸리티
│
└── 📁 functions/           # 백엔드 (Firebase Functions)
    └── src/                # TypeScript 소스 코드
```

### 3.2 파일 역할 설명

#### HTML 파일들

| 파일명 | 역할 | 주요 기능 |
|--------|------|----------|
| `index.html` | 메인 업로드 페이지 | 이미지 업로드, 프롬프트 입력 |
| `analyze.html` | 분석 결과 페이지 | 분석 결과 표시, AI 멘토 채팅 |
| `searchTab.html` | 검색 페이지 | 이미지/텍스트 검색, 결과 표시 |
| `mypage.html` | 마이페이지 | 프로필 관리, 분석 히스토리 |
| `settings.html` | 설정 페이지 | 사용자 설정 관리 |
| `subscribe.html` | 구독 페이지 | 구독 플랜 선택 |
| `nav.html` | 네비게이션 컴포넌트 | 사이드바 메뉴 (공통 컴포넌트) |
| `filter.html` | 필터 페이지 | 검색 필터 설정 |

#### JavaScript 파일들

**scripts/ 폴더:**
- `app.js`: 앱 전역 초기화, 로딩 상태 관리, Toast 알림, 네비게이션 관리
- `upload.js`: 파일 업로드 처리, 이미지 분석 시작
- `analyze.js`: 분석 결과 로드 및 렌더링, AI 멘토 채팅
- `search.js`: 검색 기능 (이미지/텍스트), 결과 렌더링
- `mypage.js`: 프로필 관리, 분석 히스토리 표시
- `settings.js`: 설정 페이지 로직
- `subscribe.js`: 구독 플랜 렌더링 및 결제 처리

**services/ 폴더:**
- `apiService.js`: 모든 Cloud Functions 호출 래퍼 함수들
- `firebaseService.js`: Firebase 초기화, 인증, Functions 호출
- `errorHandler.js`: 에러 처리 및 사용자 친화적 메시지 표시

**utils/ 폴더:**
- `dataAdapter.js`: 백엔드 데이터를 프론트엔드 형식으로 변환
- `domHelper.js`: DOM 조작 헬퍼 함수들
- `eventManager.js`: 이벤트 리스너 관리 및 정리
- `performance.js`: 성능 최적화 유틸리티 (debounce, throttle 등)
- `stateManager.js`: localStorage/sessionStorage 관리

---

## 4. 개발 환경 설정

### 4.1 필수 요구사항

- **Node.js**: 20.x 이상 (Firebase Functions용)
- **Firebase CLI**: 최신 버전
- **브라우저**: 최신 버전 (Chrome 권장)

### 4.2 개발 환경 설정 단계

#### 1단계: 저장소 클론

```bash
git clone <repository-url>
cd dys_prototype
```

#### 2단계: Firebase CLI 설치 및 로그인

```bash
# Firebase CLI 설치 (전역)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 확인
firebase projects:list
```

#### 3단계: 로컬 개발 서버 실행

**옵션 1: Firebase Emulators 사용 (권장)**

```bash
# Firebase Emulators 시작
firebase emulators:start

# 브라우저에서 접속
# Hosting: http://localhost:5000
# Functions: http://localhost:5001
# Firestore: http://localhost:8080
# Storage: http://localhost:9199
```

**옵션 2: 간단한 HTTP 서버 사용**

```bash
# Python 3 사용
python -m http.server 8000

# 또는 Node.js http-server 사용
npx http-server -p 8000

# 브라우저에서 접속
# http://localhost:8000
```

**주의사항:**
- ES Modules를 사용하므로 `file://` 프로토콜로는 실행할 수 없습니다.
- 반드시 HTTP 서버를 통해 실행해야 합니다.

#### 4단계: 브라우저에서 확인

1. 브라우저에서 `http://localhost:5000` (또는 `http://localhost:8000`) 접속
2. 개발자 도구 열기 (F12)
3. 콘솔에서 에러 확인

---

## 5. 주요 파일 설명

### 5.1 app.js - 앱 초기화

**위치**: `scripts/app.js`

**역할**: 애플리케이션의 전역 초기화 및 공통 기능 제공

**주요 함수:**

```javascript
// 앱 초기화 (모든 페이지에서 호출)
import { initApp } from './scripts/app.js';
initApp();

// 로딩 상태 표시
import { showLoading, hideLoading } from './scripts/app.js';
showLoading("처리 중...");
hideLoading();

// Toast 알림 표시
import { toast } from './scripts/app.js';
toast.success("성공!");
toast.error("에러 발생");
toast.warning("경고");
```

**사용 예시:**

```javascript
// HTML 파일에서
<script type="module">
  import { initApp } from './scripts/app.js';
  initApp();
</script>
```

### 5.2 apiService.js - API 호출

**위치**: `services/apiService.js`

**역할**: 모든 Cloud Functions 호출을 위한 래퍼 함수 제공

**주요 함수:**

```javascript
// 이미지 분석
import { analyzeDesign } from './services/apiService.js';
const result = await analyzeDesign({
  imageData: base64String,
  mimeType: 'image/jpeg',
  fileName: 'design.jpg',
  userPrompt: '차분한 느낌으로' // 선택사항
});

// 분석 결과 조회
import { getAnalysis } from './services/apiService.js';
const analysis = await getAnalysis(analysisId);

// AI 멘토 채팅
import { chatWithMentor } from './services/apiService.js';
const response = await chatWithMentor({
  analysisId: 'xxx',
  message: '이 디자인의 문제점은?',
  sessionId: 'yyy' // 선택사항
});

// 유사 디자인 검색
import { searchSimilar } from './services/apiService.js';
const results = await searchSimilar({
  analysisId: 'xxx',
  limit: 10
});
```

**에러 처리:**

모든 API 함수는 자동으로 에러를 처리하며, 사용자에게 친화적인 메시지를 표시합니다.

```javascript
// 에러 발생 시 자동으로 Toast 메시지 표시됨
try {
  const result = await analyzeDesign({ ... });
  // 성공 처리
} catch (error) {
  // 에러는 이미 errorHandler.js에서 처리됨
}
```

### 5.3 firebaseService.js - Firebase 초기화

**위치**: `services/firebaseService.js`

**역할**: Firebase SDK 초기화 및 인증 관리

**주요 함수:**

```javascript
// Firebase 초기화
import { initializeFirebase } from './services/firebaseService.js';
initializeFirebase();

// 인증 확인 (자동으로 익명 인증 시도)
import { ensureAuth } from './services/firebaseService.js';
await ensureAuth();

// 현재 사용자 가져오기
import { getCurrentUser } from './services/firebaseService.js';
const user = getCurrentUser();
```

**Firebase Config:**

Firebase 설정은 `firebaseService.js` 파일 내부에 하드코딩되어 있습니다. 이는 클라이언트 SDK용 공개 설정이므로 보안 문제가 없습니다.

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBIAU8_4IxFVO4XpeHHggn8nIIbzWLBiRw",
  authDomain: "dysapp1210.firebaseapp.com",
  projectId: "dysapp1210",
  storageBucket: "dysapp1210.firebasestorage.app",
  // ...
};
```

### 5.4 common.css - 전역 스타일

**위치**: `common.css`

**역할**: 모든 페이지에서 공통으로 사용되는 스타일 정의

**주요 섹션:**

1. **Design Tokens (CSS Variables)**
   - 색상, 타이포그래피, 간격, 그림자 등 디자인 값의 단일 소스
   - `:root`에 정의된 CSS 변수 사용

2. **Base Styles & Reset**
   - 전역 스타일 리셋
   - 기본 타이포그래피 설정

3. **Navigation Components**
   - 사이드바 네비게이션 스타일

4. **Page-specific Styles**
   - 각 페이지별 컴포넌트 스타일

5. **Responsive Design**
   - 태블릿 및 모바일 반응형 스타일

**CSS Variables 사용 예시:**

```css
/* Design Tokens 사용 */
.my-element {
  color: var(--purpleMain);
  font-size: var(--text-medium);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-md);
}
```

### 5.5 includHTML.js - HTML 컴포넌트 포함

**위치**: `includHTML.js`

**역할**: HTML 파일을 다른 HTML 파일에 동적으로 포함시키는 유틸리티

**사용 방법:**

```html
<!-- nav.html을 포함하려면 -->
<nav data-include-path="nav.html"></nav>
```

**동작 원리:**

1. 페이지 로드 시 `includeHTML()` 함수 자동 실행
2. `data-include-path` 속성을 가진 요소 찾기
3. 해당 경로의 HTML 파일을 읽어서 요소 안에 삽입
4. 재귀적으로 처리하여 중첩된 include도 지원

**이벤트:**

```javascript
// nav.html이 로드되었을 때 이벤트 발생
window.addEventListener('dysapp:navLoaded', () => {
  console.log('네비게이션이 로드되었습니다!');
});
```

---

## 6. 개발 워크플로우

### 6.1 새 기능 추가하기

#### 예시: 새로운 페이지 추가

**1단계: HTML 파일 생성**

```html
<!-- newpage.html -->
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>새 페이지 - Dys</title>
    <link rel="stylesheet" href="./common.css">
    <script src="./includHTML.js" defer></script>
    <script type="module" src="./scripts/app.js"></script>
    <script type="module" src="./scripts/newpage.js"></script>
</head>
<body>
    <div class="wrap">
        <nav data-include-path="nav.html"></nav>
        <main class="newpage_main">
            <!-- 페이지 내용 -->
        </main>
    </div>
</body>
</html>
```

**2단계: JavaScript 파일 생성**

```javascript
// scripts/newpage.js
import { initApp } from './app.js';
import { showLoading, hideLoading, toast } from './app.js';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
  await initApp();
  // 페이지별 초기화 로직
});
```

**3단계: 네비게이션에 링크 추가**

```html
<!-- nav.html에 링크 추가 -->
<li>
  <a href="./newpage.html">
    <img src="./img/newpage-icon.svg" alt="새 페이지">
  </a>
</li>
```

**4단계: CSS 스타일 추가 (필요 시)**

```css
/* common.css에 추가 */
.newpage_main {
  /* 스타일 정의 */
}
```

### 6.2 API 호출 추가하기

**1단계: apiService.js에 함수 추가**

```javascript
// services/apiService.js

/**
 * 새로운 API 호출 함수
 * @param {Object} params - 파라미터 객체
 * @returns {Promise<Object>} API 응답
 */
export async function newApiFunction(params) {
  return withErrorHandling(async () => {
    await ensureAuth();
    
    return callFunction(FUNCTION_NAMES.NEW_FUNCTION, params);
  }, { showToast: true });
}
```

**2단계: FUNCTION_NAMES에 추가**

```javascript
// services/apiService.js
const FUNCTION_NAMES = {
  // ... 기존 함수들
  NEW_FUNCTION: "newFunction", // 백엔드 함수명과 일치해야 함
};
```

**3단계: 사용**

```javascript
// scripts/newpage.js
import { newApiFunction } from '../services/apiService.js';

const result = await newApiFunction({ param1: 'value1' });
```

### 6.3 스타일 수정하기

**CSS Variables 사용 권장:**

```css
/* ❌ 하드코딩 (비권장) */
.my-element {
  color: #875CFF;
  font-size: 1.3vw;
}

/* ✅ CSS Variables 사용 (권장) */
.my-element {
  color: var(--purpleMain);
  font-size: var(--text-medium);
}
```

**이유:**
- 디자인 토큰을 한 곳에서 관리할 수 있음
- 일관성 유지 용이
- 테마 변경 시 쉽게 수정 가능

---

## 7. 주요 기능 가이드

### 7.1 이미지 업로드 및 분석

**파일**: `index.html`, `scripts/upload.js`

**플로우:**

1. 사용자가 이미지 파일 선택 (드래그 앤 드롭 또는 클릭)
2. `handleFileSelect()` 함수가 파일 검증
3. 파일을 base64로 변환
4. `analyzeDesign()` API 호출
5. 분석 완료 시 `analyze.html`로 이동

**주요 코드:**

```javascript
// scripts/upload.js
import { analyzeDesign } from '../services/apiService.js';
import { readFileAsBase64, validateImageFile } from '../services/apiService.js';

async function startAnalysis() {
  const fileData = await readFileAsBase64(selectedFile);
  const result = await analyzeDesign({
    imageData: fileData.data,
    mimeType: fileData.mimeType,
    fileName: fileData.fileName,
    userPrompt: promptTextarea?.value?.trim()
  });
  
  if (result.success) {
    navigateToAnalysis(result.analysisId);
  }
}
```

### 7.2 분석 결과 표시

**파일**: `analyze.html`, `scripts/analyze.js`

**플로우:**

1. URL 파라미터 또는 localStorage에서 `analysisId` 가져오기
2. `getAnalysis()` API 호출
3. `adaptAnalysisResponse()`로 데이터 변환
4. `renderAnalysisResults()`로 화면 렌더링

**주요 코드:**

```javascript
// scripts/analyze.js
import { getAnalysis } from '../services/apiService.js';
import { adaptAnalysisResponse } from '../utils/dataAdapter.js';

async function loadAnalysis() {
  const analysisId = getUrlParam('id') || getLocalState('lastAnalysisId');
  const response = await getAnalysis(analysisId);
  const adapted = adaptAnalysisResponse(response);
  renderAnalysisResults(adapted);
}
```

### 7.3 AI 멘토 채팅

**파일**: `analyze.html`, `scripts/analyze.js`

**플로우:**

1. 사용자가 채팅 입력창에 메시지 입력
2. Enter 키 또는 전송 버튼 클릭
3. `chatWithMentor()` API 호출
4. 응답을 채팅 컨테이너에 추가
5. 채팅 히스토리는 Firestore에 저장

**주요 코드:**

```javascript
// scripts/analyze.js
import { chatWithMentor } from '../services/apiService.js';

async function sendChatMessage(message) {
  const response = await chatWithMentor({
    analysisId: currentAnalysis.id,
    message: message,
    sessionId: chatSessionId
  });
  
  // 채팅 UI에 메시지 추가
  appendChatMessage('user', message);
  appendChatMessage('ai', response.message);
}
```

### 7.4 검색 기능

**파일**: `searchTab.html`, `scripts/search.js`

**검색 타입:**

1. **텍스트 검색**: OCR 텍스트로 검색
2. **이미지 검색**: 이미지 업로드 후 유사 디자인 검색
3. **커스텀 검색**: 외부 Google Custom Search API 사용

**주요 코드:**

```javascript
// scripts/search.js
import { searchText, searchSimilar, customSearch } from '../services/apiService.js';

// 텍스트 검색
const textResults = await searchText({ query: '포스터 디자인' });

// 이미지 검색
const imageResults = await searchSimilar({ analysisId: 'xxx' });

// 커스텀 검색
const customResults = await customSearch({ query: '모던한 디자인' });
```

---

## 8. API 사용 가이드

### 8.1 사용 가능한 API 함수 목록

**services/apiService.js에서 제공하는 함수들:**

| 함수명 | 설명 | 파라미터 |
|--------|------|----------|
| `analyzeDesign` | 이미지 분석 | `{ imageData, mimeType, fileName, userPrompt? }` |
| `getAnalysis` | 분석 결과 조회 | `analysisId` |
| `getAnalyses` | 분석 목록 조회 | `{ limit?, offset?, filterFormat?, filterFixScope? }` |
| `deleteAnalysis` | 분석 삭제 | `analysisId` |
| `chatWithMentor` | AI 멘토 채팅 | `{ analysisId, message, sessionId? }` |
| `searchSimilar` | 유사 디자인 검색 | `{ analysisId, limit?, filterFormat?, filterFixScope?, minScore? }` |
| `searchText` | 텍스트 검색 | `{ query, limit?, filterFormat?, filterFixScope?, minScore? }` |
| `customSearch` | 커스텀 검색 | `{ query, start?, num? }` |
| `saveItem` | 아이템 저장 | `{ itemId, collectionId? }` |
| `getBookmarks` | 북마크 목록 조회 | `{ limit?, offset? }` |
| `deleteBookmark` | 북마크 삭제 | `{ bookmarkId }` |
| `getUserProfile` | 사용자 프로필 조회 | 없음 |
| `updateUserProfile` | 사용자 프로필 업데이트 | `{ displayName?, preferences? }` |
| `healthCheck` | 헬스 체크 | 없음 |

### 8.2 API 호출 패턴

**기본 패턴:**

```javascript
import { functionName } from '../services/apiService.js';

try {
  showLoading("처리 중...");
  const result = await functionName(params);
  hideLoading();
  
  if (result.success) {
    // 성공 처리
    toast.success("성공!");
  } else {
    // 실패 처리
    toast.error(result.error || "오류가 발생했습니다.");
  }
} catch (error) {
  hideLoading();
  // 에러는 errorHandler.js에서 자동 처리됨
}
```

**에러 처리:**

모든 API 함수는 `withErrorHandling` 래퍼로 감싸져 있어 자동으로 에러를 처리합니다.

- 네트워크 오류: 자동으로 감지하여 사용자 친화적 메시지 표시
- 인증 오류: 자동으로 익명 인증 시도
- 서버 오류: 에러 로그 기록 및 사용자에게 알림

### 8.3 데이터 형식

**요청 형식:**

```javascript
// 이미지 분석 요청
{
  imageData: "base64인코딩된문자열",
  mimeType: "image/jpeg",
  fileName: "design.jpg",
  userPrompt: "차분한 느낌으로" // 선택사항
}

// 채팅 요청
{
  analysisId: "abc123",
  message: "이 디자인의 문제점은?",
  sessionId: "session456" // 선택사항 (첫 메시지 이후 자동 생성)
}
```

**응답 형식:**

```javascript
// 성공 응답
{
  success: true,
  data: { ... },
  // 함수별 추가 필드
}

// 실패 응답
{
  success: false,
  error: "에러 메시지"
}
```

---

## 9. 스타일 가이드

### 9.1 CSS Variables 사용

**색상:**

```css
/* 주요 색상 */
var(--purpleMain)      /* 메인 보라색: #875CFF */
var(--navy)            /* 네이비: #1B1233 */
var(--background)      /* 배경색: #ffffff */
var(--purpleGy2)      /* 회색: #A8A8BF */
```

**타이포그래피:**

```css
/* 폰트 크기 */
var(--text-xlarge)     /* 3vw (최소 24px) */
var(--text-large)      /* 1.8vw (최소 18px) */
var(--text-medium)     /* 1.3vw (최소 16px) */
var(--text-regular)    /* 1.1vw (최소 14px) */
var(--text-small)      /* 0.9vw (최소 12px) */

/* 행간 */
var(--line-height-base)      /* 1.6 (본문) */
var(--line-height-tight)     /* 1.35 (작은 텍스트) */
var(--line-height-relaxed)   /* 1.8 (긴 문단) */
```

**간격 및 그림자:**

```css
/* 그림자 */
var(--shadow-sm)   /* 작은 그림자 */
var(--shadow-md)   /* 중간 그림자 */
var(--shadow-lg)   /* 큰 그림자 */

/* 애니메이션 */
var(--ease-smooth)   /* 부드러운 이징 */
var(--ease-elastic)  /* 탄성 이징 */
```

### 9.2 클래스 네이밍 컨벤션

**BEM 스타일 사용 (일부):**

```css
/* Block__Element--Modifier 패턴 */
.searchImgCard { }           /* 블록 */
.searchImgCard .imgOverlay { }  /* 요소 */
.searchImgCard:hover { }     /* 수정자 */
```

**페이지별 접두사:**

```css
/* 페이지별로 접두사 사용 */
.index_main { }        /* index.html */
.analyze_prompt { }    /* analyze.html */
.search_main { }       /* searchTab.html */
.mypage_main { }       /* mypage.html */
```

### 9.3 반응형 디자인

**미디어 쿼리:**

```css
/* 태블릿 (768px - 1024px) */
@media (max-width: 1024px) and (min-width: 769px) {
  /* 태블릿 스타일 */
}

/* 모바일 (max-width: 768px) */
@media (max-width: 768px) {
  /* 모바일 스타일 */
}
```

**VW/VH 단위 사용:**

프로젝트는 뷰포트 단위(vw, vh)를 주로 사용합니다.

```css
/* 예시 */
.element {
  width: 50vw;      /* 뷰포트 너비의 50% */
  height: 30vh;     /* 뷰포트 높이의 30% */
  font-size: 1.2vw; /* 뷰포트 너비의 1.2% */
}
```

**최소 크기 보장:**

접근성을 위해 최소 폰트 크기가 설정되어 있습니다.

```css
font-size: max(var(--text-medium), var(--text-medium-min));
/* 1.3vw 또는 16px 중 큰 값 사용 */
```

---

## 10. 문제 해결 가이드

### 10.1 자주 발생하는 문제

#### 문제 1: "Failed to fetch" 에러

**원인:**
- Firebase Functions가 배포되지 않았거나
- 네트워크 연결 문제

**해결 방법:**

1. Firebase Functions 배포 확인
   ```bash
   firebase functions:list
   ```

2. 로컬 개발 시 Emulator 사용 확인
   ```javascript
   // firebaseService.js에서 자동으로 localhost 감지
   if (window.location.hostname === "localhost") {
     connectFunctionsEmulator(functions, "localhost", 5001);
   }
   ```

3. 브라우저 콘솔에서 네트워크 탭 확인

#### 문제 2: "Authentication required" 에러

**원인:**
- Firebase 익명 인증이 비활성화되어 있거나
- 인증 초기화 실패

**해결 방법:**

1. Firebase Console에서 익명 인증 활성화 확인
   ```
   Firebase Console > Authentication > Sign-in method > Anonymous > Enable
   ```

2. 브라우저 콘솔에서 인증 상태 확인
   ```javascript
   import { getCurrentUser } from './services/firebaseService.js';
   console.log(getCurrentUser());
   ```

#### 문제 3: 이미지가 표시되지 않음

**원인:**
- Signed URL 만료 또는
- Storage 규칙 문제

**해결 방법:**

1. Storage 규칙 확인
   ```bash
   firebase deploy --only storage:rules
   ```

2. 이미지 URL 확인
   ```javascript
   // analyze.html에서 이미지 URL 확인
   console.log(currentAnalysis.imageUrl);
   ```

#### 문제 4: Import 경로 오류

**원인:**
- 상대 경로 계산 오류 또는
- 파일이 존재하지 않음

**해결 방법:**

1. 상대 경로 확인
   ```javascript
   // 현재 파일: scripts/analyze.js
   // 목적 파일: services/apiService.js
   import { ... } from '../services/apiService.js'; // ✅ 정상
   import { ... } from './services/apiService.js';  // ❌ 오류
   ```

2. 파일 존재 확인
   ```bash
   # 파일이 실제로 존재하는지 확인
   ls services/apiService.js
   ```

### 10.2 디버깅 팁

#### 브라우저 개발자 도구 활용

**콘솔 로그 확인:**

```javascript
// 코드에 로그 추가
console.log('[MyFunction] 시작', data);
console.error('[MyFunction] 에러', error);
```

**네트워크 탭 확인:**

1. 개발자 도구 > Network 탭 열기
2. API 호출 확인
3. 요청/응답 내용 확인
4. 에러 상태 코드 확인

**스토리지 확인:**

```javascript
// localStorage 확인
console.log(localStorage.getItem('lastAnalysisId'));

// sessionStorage 확인
console.log(sessionStorage.getItem('searchFilters'));
```

#### Firebase Console 활용

**Functions 로그 확인:**

```bash
# 모든 함수 로그
firebase functions:log

# 특정 함수 로그
firebase functions:log --only analyzeDesign
```

**Firestore 데이터 확인:**

```
Firebase Console > Firestore Database
- analyses 컬렉션 확인
- users 컬렉션 확인
- chatSessions 컬렉션 확인
```

---

## 11. 참고 자료

### 11.1 프로젝트 문서

- **PRD**: `docs/dysapp_PRD.md` - 제품 요구사항 문서
- **FRD**: `docs/dysapp_FRD.md` - 기능 요구사항 문서
- **SRD**: `docs/dysapp_SRD.md` - 시스템 요구사항 문서
- **TSD**: `docs/dysapp_TSD.md` - 기술 명세 문서
- **APISPEC**: `docs/dysapp_APISPEC.md` - API 명세서

### 11.2 외부 문서

- **Firebase Documentation**: https://firebase.google.com/docs
- **Firebase Functions v2**: https://firebase.google.com/docs/functions
- **Firestore**: https://firebase.google.com/docs/firestore
- **Firebase Authentication**: https://firebase.google.com/docs/auth
- **ES Modules**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

### 11.3 코드 주석

모든 주요 파일에는 상세한 주석이 추가되어 있습니다:

- **HTML 파일**: 각 섹션의 역할과 기능 설명
- **JavaScript 파일**: JSDoc 형식의 함수 설명 (`@param`, `@returns`, `@example`)
- **CSS 파일**: 주요 섹션별 설명 및 사용 위치 명시

### 11.4 유용한 명령어

```bash
# Firebase 로그인
firebase login

# 프로젝트 확인
firebase use dysapp1210

# Functions 배포
firebase deploy --only functions

# Hosting 배포
firebase deploy --only hosting

# 전체 배포
firebase deploy

# Emulators 시작
firebase emulators:start

# Functions 로그 확인
firebase functions:log

# 특정 함수 로그 확인
firebase functions:log --only analyzeDesign
```

---

## 12. 빠른 시작 가이드

### 12.1 첫 번째 작업: 간단한 수정하기

**예시: 버튼 텍스트 변경**

1. `index.html` 파일 열기
2. 버튼 요소 찾기
3. 텍스트 수정
4. 브라우저에서 확인

```html
<!-- 수정 전 -->
<button class="send_btn">전송</button>

<!-- 수정 후 -->
<button class="send_btn">분석 시작</button>
```

### 12.2 두 번째 작업: 새 기능 추가하기

**예시: 버튼 클릭 시 알림 표시**

1. `scripts/upload.js` 파일 열기
2. 버튼 이벤트 리스너 추가
3. Toast 알림 추가

```javascript
// scripts/upload.js
import { toast } from './app.js';

const sendButton = document.querySelector('.send_btn');
sendButton.addEventListener('click', () => {
  toast.success('분석이 시작되었습니다!');
});
```

### 12.3 세 번째 작업: 스타일 수정하기

**예시: 버튼 색상 변경**

1. `common.css` 파일 열기
2. 해당 클래스 찾기
3. CSS Variables 사용하여 색상 변경

```css
/* common.css */
.send_btn {
  background-color: var(--purpleMain); /* 기존 색상 */
  /* 또는 */
  background-color: var(--navy); /* 새 색상 */
}
```

---

## 13. 개발 시 주의사항

### 13.1 코드 작성 시 주의사항

1. **ES Modules 사용**: 모든 JavaScript 파일은 `import/export` 문법 사용
2. **상대 경로 정확히**: `../` 레벨을 정확히 계산
3. **비동기 처리**: API 호출은 항상 `async/await` 사용
4. **에러 처리**: `try-catch` 블록으로 에러 처리
5. **로딩 상태**: API 호출 전후로 `showLoading()` / `hideLoading()` 사용

### 13.2 성능 최적화

1. **이미지 지연 로딩**: `<img loading="lazy">` 사용
2. **이벤트 디바운싱**: 검색 입력 등에 `debounce` 사용
3. **DOM 캐싱**: 자주 사용하는 DOM 요소는 변수에 저장
4. **불필요한 리렌더링 방지**: 상태 변경 시 필요한 부분만 업데이트

### 13.3 접근성 (A11y)

1. **ARIA 속성 사용**: `aria-label`, `aria-live` 등 사용
2. **키보드 네비게이션**: 모든 인터랙티브 요소는 키보드로 접근 가능해야 함
3. **스크린 리더 지원**: `.sr-only` 클래스로 스크린 리더 전용 콘텐츠 제공

---

## 14. 질문 및 지원

### 14.1 자주 묻는 질문 (FAQ)

**Q: 프레임워크를 사용하지 않는 이유는?**
A: 프로젝트가 작고 단순하여 프레임워크 없이도 충분히 관리 가능합니다. 또한 빌드 과정 없이 바로 실행 가능한 장점이 있습니다.

**Q: TypeScript를 사용하지 않는 이유는?**
A: 프론트엔드는 순수 JavaScript를 사용하지만, 백엔드(Firebase Functions)는 TypeScript를 사용합니다.

**Q: 상태 관리는 어떻게 하나요?**
A: `utils/stateManager.js`를 사용하여 localStorage/sessionStorage로 상태를 관리합니다. 복잡한 상태 관리는 필요하지 않습니다.

**Q: 테스트는 어떻게 하나요?**
A: 현재 테스트 코드는 없습니다. 수동 테스트를 통해 기능을 확인합니다.

### 14.2 도움이 필요할 때

1. **코드 주석 확인**: 모든 주요 파일에 상세한 주석이 있습니다
2. **문서 참고**: `docs/` 폴더의 문서들을 참고하세요
3. **브라우저 개발자 도구**: 콘솔과 네트워크 탭을 활용하세요
4. **Firebase Console**: Functions 로그와 Firestore 데이터를 확인하세요

---

## 15. 다음 단계

### 15.1 추천 학습 순서

1. **1일차**: 프로젝트 구조 파악, 주요 파일 읽기
2. **2일차**: 간단한 수정 작업 (텍스트 변경, 색상 변경 등)
3. **3일차**: API 호출 패턴 이해, 간단한 기능 추가
4. **4일차**: 전체 플로우 이해, 복잡한 기능 수정
5. **5일차**: 독립적으로 기능 개발 가능

### 15.2 추천 작업

**초보자용:**
- 버튼 텍스트/스타일 수정
- 에러 메시지 개선
- 로딩 메시지 추가

**중급자용:**
- 새로운 페이지 추가
- API 호출 추가
- 필터 기능 개선

**고급자용:**
- 성능 최적화
- 접근성 개선
- 새로운 기능 개발

---

**문서 버전**: 1.0  
**최종 업데이트**: 2025-01-27  
**작성 목적**: 신규 프론트엔드 개발자 온보딩

**행운을 빕니다! 🚀**
