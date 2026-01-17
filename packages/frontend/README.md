# Dysapp Frontend

Dysapp 프론트엔드 - AI 디자인 분석 플랫폼

## 📋 목차

- [빠른 시작](#빠른-시작)
- [프로젝트 구조](#프로젝트-구조)
- [개발 환경 설정](#개발-환경-설정)
- [목업 모드](#목업-모드)
- [API 레퍼런스](#api-레퍼런스)
- [개발 가이드](#개발-가이드)
- [문제 해결](#문제-해결)

## 🚀 빠른 시작

### 필수 요구사항

- **VS Code** (최신 버전 권장)
- **VS Code Live Server 확장 프로그램** (Ritwick Dey)
- **모던 브라우저** (Chrome, Edge, Firefox 최신 버전)

### 설치 및 실행 (3단계)

#### 1단계: VS Code Live Server 설치

1. VS Code 열기
2. Extensions 탭 열기 (`Ctrl+Shift+X` 또는 `Cmd+Shift+X`)
3. "Live Server" 검색
4. **Ritwick Dey**의 "Live Server" 설치
5. VS Code 재시작 (필요시)

#### 2단계: 프로젝트 열기

**방법 A: 워크스페이스 사용 (권장)**
```bash
# 루트 디렉토리에서
code dysapp.code-workspace
```

**방법 B: 프론트엔드 폴더만 열기**
```bash
# packages/frontend 디렉토리에서
code .
```

#### 3단계: Live Server 실행

**방법 A: 우클릭 메뉴**
1. `index.html` 파일을 우클릭
2. "Open with Live Server" 선택

**방법 B: 상태바 버튼**
1. VS Code 하단 상태바에서 "Go Live" 버튼 클릭

**방법 C: 명령 팔레트**
1. `Ctrl+Shift+P` (또는 `Cmd+Shift+P`)
2. "Live Server: Open with Live Server" 입력
3. Enter

#### 실행 확인

- 브라우저가 자동으로 열립니다
- 기본 URL: `http://localhost:5500`
- 파일 수정 시 자동 새로고침됩니다

## 📁 프로젝트 구조

```
packages/frontend/
├── 📄 HTML 파일들 (9개)
│   ├── index.html              # 메인 업로드 페이지
│   ├── analyze.html            # 분석 결과 페이지
│   ├── searchTab.html          # 검색 페이지
│   ├── search_detail_tab.html  # 검색 상세 페이지
│   ├── mypage.html             # 마이페이지
│   ├── settings.html            # 설정 페이지
│   ├── subscribe.html          # 구독 페이지
│   ├── filter.html             # 필터 페이지
│   └── nav.html                # 네비게이션 컴포넌트 (공통)
│
├── 📂 scripts/                 # 페이지별 JavaScript (9개)
│   ├── app.js                  # 앱 초기화 및 전역 유틸리티
│   ├── upload.js               # 파일 업로드 및 분석 시작
│   ├── analyze.js              # 분석 결과 표시 및 AI 채팅
│   ├── search.js               # 검색 기능 (이미지/텍스트)
│   ├── mypage.js               # 프로필 및 분석 히스토리
│   ├── settings.js              # 설정 관리 및 목업 모드 UI
│   ├── subscribe.js             # 구독 플랜 선택
│   ├── auth.js                 # 인증 모달 (회원가입/로그인)
│   └── deploy-indexes-dysapp.sh # 배포 스크립트
│
├── 📂 services/                 # 서비스 레이어 (5개)
│   ├── apiService.js           # API 호출 래퍼 (모든 Cloud Functions 호출)
│   ├── firebaseService.js      # Firebase 초기화 및 인증 관리
│   ├── errorHandler.js         # 중앙화된 에러 처리
│   ├── userStorageService.js   # 사용자 스토리지 관리
│   └── mockData.js             # 목업 모드 데이터 및 헬퍼 함수
│
├── 📂 utils/                    # 유틸리티 함수 (5개)
│   ├── dataAdapter.js          # API 응답 데이터 변환 및 어댑터
│   ├── domHelper.js            # DOM 조작 헬퍼 함수
│   ├── eventManager.js         # 이벤트 리스너 관리 (메모리 누수 방지)
│   ├── performance.js           # 성능 최적화 (debounce, throttle)
│   └── stateManager.js          # 상태 관리 (localStorage/sessionStorage)
│
├── 📂 img/                      # 이미지 리소스 (51개)
│   ├── *.svg                    # 아이콘 및 벡터 이미지
│   └── *.png                    # 예시 이미지
│
├── 📂 .vscode/                  # VS Code 설정
│   ├── settings.json            # Live Server 설정
│   └── extensions.json          # 추천 확장 프로그램
│
├── 📄 common.css                # 전역 스타일시트 (Design Tokens 포함)
├── 📄 includHTML.js             # HTML Include 유틸리티
├── 📄 package.json              # 패키지 메타데이터
├── 📄 README.md                 # 이 파일
└── 📄 QUICKSTART.md             # 단계별 시작 가이드
```

## ⚙️ 개발 환경 설정

### VS Code 설정

프로젝트에는 이미 `.vscode/settings.json`이 포함되어 있습니다:

```json
{
  "liveServer.settings.port": 5500,
  "liveServer.settings.root": "/",
  "liveServer.settings.CustomBrowser": "chrome",
  "liveServer.settings.donotShowInfoMsg": true,
  "liveServer.settings.donotVerifyTags": true
}
```

### 포트 변경

포트 5500이 사용 중인 경우 `.vscode/settings.json`에서 변경:

```json
{
  "liveServer.settings.port": 5501
}
```

### 브라우저 변경

기본 브라우저를 변경하려면:

```json
{
  "liveServer.settings.CustomBrowser": "edge"  // 또는 "firefox"
}
```

## 🎭 목업 모드

백엔드 없이 프론트엔드 개발을 위한 목업 모드가 제공됩니다.

### 활성화 방법

#### 방법 1: 설정 페이지에서 (권장)

1. 브라우저에서 `http://localhost:5500/settings.html` 접속
2. 페이지 하단의 "개발자 모드" 섹션으로 스크롤
3. "목업 모드 활성화" 체크박스 선택
4. 페이지 새로고침 (`F5` 또는 `Ctrl+R`)

#### 방법 2: 브라우저 콘솔에서

```javascript
localStorage.setItem('dysapp:mockMode', 'true');
location.reload();
```

### 목업 모드 기능

목업 모드가 활성화되면:

- ✅ **모든 API 호출이 가짜 데이터 반환**
  - `analyzeDesign()` → 가짜 분석 결과
  - `getAnalyses()` → 가짜 분석 목록 (5개)
  - `searchSimilar()` → 가짜 검색 결과
  - `chatWithMentor()` → 가짜 채팅 응답
  - 등등...

- ✅ **Firebase 초기화 스킵**
  - Firebase SDK가 로드되지 않음
  - 네트워크 요청 없음

- ✅ **가짜 사용자 객체 자동 생성**
  ```javascript
  {
    uid: 'mock-user-123',
    isAnonymous: false,
    email: 'mock@example.com',
    displayName: 'Mock User'
  }
  ```

- ✅ **모든 응답에 `_isMockData: true` 플래그 포함**
  - 목업 데이터인지 확인 가능

### 목업 모드에서 사용 가능한 API

다음 API 함수들이 목업 모드에서 작동합니다:

- `analyzeDesign()` - 디자인 분석
- `getAnalysis()` - 분석 결과 조회
- `getAnalyses()` - 분석 목록 조회
- `deleteAnalysis()` - 분석 삭제
- `chatWithMentor()` - AI 멘토 채팅
- `searchSimilar()` - 유사 디자인 검색
- `searchText()` - 텍스트 검색
- `customSearch()` - 커스텀 검색
- `saveItem()` - 북마크 저장
- `getBookmarks()` - 북마크 목록
- `deleteBookmark()` - 북마크 삭제
- `getUserProfile()` - 사용자 프로필 조회
- `updateUserProfile()` - 사용자 프로필 업데이트
- `registerUser()` - 회원가입
- `healthCheck()` - 헬스 체크

### 비활성화 방법

#### 방법 1: 설정 페이지에서

1. 설정 페이지에서 "목업 모드 활성화" 체크박스 해제
2. 페이지 새로고침

#### 방법 2: 브라우저 콘솔에서

```javascript
localStorage.removeItem('dysapp:mockMode');
location.reload();
```

### 목업 모드 확인

브라우저 콘솔에서 확인:

```javascript
// 목업 모드 활성화 여부 확인
localStorage.getItem('dysapp:mockMode') === 'true'  // true면 활성화됨

// 목업 모드 헬퍼 함수 사용
import { isMockModeEnabled } from './services/mockData.js';
console.log(isMockModeEnabled());  // true/false
```

## 📚 API 레퍼런스

### Analysis APIs

#### `analyzeDesign(params)`

디자인 이미지를 분석합니다.

```javascript
import { analyzeDesign, readFileAsBase64 } from './services/apiService.js';

const file = document.querySelector('input[type="file"]').files[0];
const { data, mimeType, fileName } = await readFileAsBase64(file);

const result = await analyzeDesign({
  imageData: data,
  mimeType: mimeType,
  fileName: fileName,
  userPrompt: '차분한 느낌으로'  // 선택사항
});

if (result.success) {
  console.log('Analysis ID:', result.analysisId);
  // analyze.html로 이동
}
```

**파라미터:**
- `imageData` (string, 필수): Base64 인코딩된 이미지 데이터
- `mimeType` (string, 필수): 이미지 MIME 타입 (image/jpeg, image/png 등)
- `fileName` (string, 필수): 원본 파일명
- `userPrompt` (string, 선택): 사용자 프롬프트

**반환값:**
```javascript
{
  success: true,
  analysisId: "abc123...",
  data: { /* 분석 결과 */ },
  _isMockData: true  // 목업 모드일 때만
}
```

#### `getAnalysis(analysisId)`

특정 분석 결과를 조회합니다.

```javascript
import { getAnalysis } from './services/apiService.js';

const analysis = await getAnalysis('analysis-id-123');
console.log(analysis.data);
```

#### `getAnalyses(params)`

사용자의 분석 목록을 조회합니다.

```javascript
import { getAnalyses } from './services/apiService.js';

const result = await getAnalyses({
  limit: 20,
  offset: 0,
  filterFormat: 'UX_UI',  // 선택사항
  filterFixScope: 'minor'  // 선택사항
});

console.log(result.data.analyses);  // 분석 목록
console.log(result.data.total);     // 전체 개수
```

#### `deleteAnalysis(analysisId)`

분석을 삭제합니다.

```javascript
import { deleteAnalysis } from './services/apiService.js';

await deleteAnalysis('analysis-id-123');
```

### Chat APIs

#### `chatWithMentor(params)`

AI 멘토와 채팅합니다.

```javascript
import { chatWithMentor, getStoredSessionId } from './services/apiService.js';

const sessionId = getStoredSessionId('analysis-id-123');  // 기존 세션 ID (선택사항)

const result = await chatWithMentor({
  analysisId: 'analysis-id-123',
  message: '이 디자인의 색상 팔레트에 대해 설명해주세요',
  sessionId: sessionId  // 선택사항 (대화 연속성을 위해)
});

console.log(result.response);  // AI 응답
console.log(result.sessionId); // 세션 ID (다음 대화에 사용)
```

### Search APIs

#### `searchSimilar(params)`

유사한 디자인을 검색합니다.

```javascript
import { searchSimilar } from './services/apiService.js';

const result = await searchSimilar({
  analysisId: 'source-analysis-id',
  limit: 10,
  filterFormat: 'UX_UI',  // 선택사항
  filterFixScope: 'major',  // 선택사항
  minScore: 0.7  // 선택사항
});

console.log(result.data.results);  // 검색 결과 배열
```

#### `searchText(params)`

OCR 텍스트로 디자인을 검색합니다.

```javascript
import { searchText } from './services/apiService.js';

const result = await searchText({
  query: '로그인 버튼',
  limit: 20,
  filterFormat: 'UX_UI'
});

console.log(result.data.results);
```

#### `customSearch(params)`

GCP Custom Search API를 사용하여 외부 이미지를 검색합니다.

```javascript
import { customSearch } from './services/apiService.js';

const result = await customSearch({
  query: 'minimalist web design',
  start: 1,
  num: 10
});

console.log(result.data.items);  // 검색 결과 배열
```

### Bookmark APIs

#### `saveItem(params)`

분석을 북마크에 저장합니다.

```javascript
import { saveItem } from './services/apiService.js';

await saveItem({ analysisId: 'analysis-id-123' });
```

#### `getBookmarks(params)`

북마크 목록을 조회합니다.

```javascript
import { getBookmarks } from './services/apiService.js';

const result = await getBookmarks({
  limit: 20,
  startAfter: 'bookmark-id'  // 페이지네이션용 (선택사항)
});

console.log(result.data.bookmarks);
```

#### `deleteBookmark(params)`

북마크를 삭제합니다.

```javascript
import { deleteBookmark } from './services/apiService.js';

await deleteBookmark({ bookmarkId: 'bookmark-id-123' });
```

### User Profile APIs

#### `getUserProfile()`

사용자 프로필을 조회합니다.

```javascript
import { getUserProfile } from './services/apiService.js';

const profile = await getUserProfile();
console.log(profile.data);
```

#### `updateUserProfile(params)`

사용자 프로필을 업데이트합니다.

```javascript
import { updateUserProfile } from './services/apiService.js';

await updateUserProfile({
  displayName: '새 이름',
  preferences: {
    theme: 'dark',
    language: 'ko'
  }
});
```

#### `registerUser(params)`

새 사용자를 등록합니다.

```javascript
import { registerUser } from './services/apiService.js';

await registerUser({
  email: 'user@example.com',
  password: 'password123',
  displayName: '사용자 이름',
  privacyConsent: {
    consented: true,
    version: '1.0',
    ip: '127.0.0.1'  // 선택사항
  }
});
```

### Utility APIs

#### `healthCheck()`

서버 상태를 확인합니다.

```javascript
import { healthCheck } from './services/apiService.js';

const result = await healthCheck();
console.log(result.status);  // 'ok'
```

### File Utilities

#### `readFileAsBase64(file)`

파일을 Base64로 읽습니다.

```javascript
import { readFileAsBase64 } from './services/apiService.js';

const file = document.querySelector('input[type="file"]').files[0];
const { data, mimeType, fileName } = await readFileAsBase64(file);
```

#### `validateImageFile(file)`

이미지 파일 유효성을 검사합니다.

```javascript
import { validateImageFile } from './services/apiService.js';

const file = document.querySelector('input[type="file"]').files[0];
const validation = validateImageFile(file);

if (!validation.valid) {
  console.error(validation.error);
}
```

## 🛠️ 개발 가이드

### HTML Include 시스템

`includHTML.js`를 사용하여 HTML 파일을 동적으로 포함할 수 있습니다.

#### 사용 방법

```html
<!-- nav.html을 포함하려면 -->
<nav data-include-path="nav.html"></nav>
```

#### 동작 원리

1. 페이지 로드 시 `includeHTML()` 함수 자동 실행
2. `data-include-path` 속성을 가진 요소 찾기
3. XMLHttpRequest로 해당 HTML 파일 로드
4. 로드된 HTML을 요소 안에 삽입
5. 재귀적으로 처리하여 중첩된 include도 지원

#### 이벤트

`nav.html`이 로드되면 `dysapp:navLoaded` 이벤트가 발생합니다:

```javascript
window.addEventListener('dysapp:navLoaded', () => {
  console.log('네비게이션이 로드되었습니다!');
  // 네비게이션 로드 후 작업 수행
});
```

### 모듈 시스템

ES6 모듈을 사용합니다. 모든 JavaScript 파일은 `type="module"`로 로드됩니다.

#### Import 예시

```javascript
// 서비스 레이어에서 import
import { analyzeDesign } from '../services/apiService.js';
import { initializeFirebase } from '../services/firebaseService.js';

// 유틸리티에서 import
import { debounce } from '../utils/performance.js';
import { getLocalState } from '../utils/stateManager.js';

// 같은 디렉토리에서 import
import { showLoading, toast } from './app.js';
```

#### Export 예시

```javascript
// Named export
export function myFunction() { }
export const myConstant = 'value';

// Default export
export default class MyClass { }
```

### 상대 경로 규칙

모든 경로는 상대 경로를 사용합니다:

- **HTML에서**: `./scripts/app.js`, `./common.css`, `./img/logo.svg`
- **JS 모듈에서**: 
  - 같은 디렉토리: `./app.js`
  - 상위 디렉토리: `../services/apiService.js`
  - 두 단계 위: `../../utils/dataAdapter.js`

### 전역 상태 관리

`window.dysapp` 객체에 전역 상태가 저장됩니다:

```javascript
// 앱 초기화 상태
window.dysapp.initialized  // boolean

// 현재 사용자
window.dysapp.user  // Firebase User 객체 또는 null

// 로딩 상태
window.dysapp.loading  // boolean

// Toast 함수
window.dysapp.toast.success('성공!');
window.dysapp.toast.error('에러!');
```

### 이벤트 시스템

커스텀 이벤트를 사용하여 컴포넌트 간 통신:

```javascript
// 이벤트 발생
window.dispatchEvent(new CustomEvent('dysapp:customEvent', {
  detail: { data: 'value' }
}));

// 이벤트 리스닝
window.addEventListener('dysapp:customEvent', (event) => {
  console.log(event.detail.data);
});
```

**주요 이벤트:**
- `dysapp:ready` - 앱 초기화 완료
- `dysapp:navLoaded` - 네비게이션 로드 완료
- `dysapp:authChanged` - 인증 상태 변경

### 상태 관리 (localStorage/sessionStorage)

`stateManager.js`를 사용하여 브라우저 스토리지 관리:

```javascript
import { setLocalState, getLocalState, removeLocalState } from '../utils/stateManager.js';

// 저장
setLocalState('key', 'value');
setLocalState('user', { name: 'John' });

// 조회
const value = getLocalState('key');
const user = getLocalState('user');

// 삭제
removeLocalState('key');
```

### 에러 처리

모든 API 호출은 자동으로 에러 처리가 됩니다:

```javascript
import { analyzeDesign } from '../services/apiService.js';

try {
  const result = await analyzeDesign(params);
  // 성공 처리
} catch (error) {
  // 에러는 자동으로 Toast로 표시됨
  // 추가 에러 처리가 필요한 경우에만 catch 사용
}
```

### 성능 최적화

`performance.js`에서 제공하는 유틸리티 사용:

```javascript
import { debounce, throttle } from '../utils/performance.js';

// Debounce: 마지막 호출 후 일정 시간 대기
const debouncedSearch = debounce((query) => {
  searchText({ query });
}, 300);

// Throttle: 일정 시간마다 최대 한 번만 실행
const throttledScroll = throttle(() => {
  handleScroll();
}, 100);
```

### 이벤트 리스너 관리

`eventManager.js`를 사용하여 메모리 누수 방지:

```javascript
import { onClick, onChange, registerCleanup } from '../utils/eventManager.js';

// 클릭 이벤트
const unsubscribe = onClick(button, () => {
  console.log('클릭됨');
});

// 변경 이벤트
const unsubscribe2 = onChange(input, (e) => {
  console.log(e.target.value);
});

// 정리 함수 등록 (페이지 이탈 시 자동 호출)
registerCleanup(() => {
  unsubscribe();
  unsubscribe2();
});
```

## 🐛 문제 해결

### Live Server가 작동하지 않음

**증상:** "Go Live" 버튼이 없거나 클릭해도 작동하지 않음

**해결 방법:**
1. VS Code Live Server 확장 프로그램이 설치되어 있는지 확인
2. VS Code 재시작
3. 포트 5500이 사용 중인지 확인:
   ```powershell
   netstat -ano | findstr :5500
   ```
4. `.vscode/settings.json`에서 포트 변경

### 목업 모드가 작동하지 않음

**증상:** 목업 모드를 활성화해도 실제 API가 호출됨

**해결 방법:**
1. 브라우저 콘솔에서 확인:
   ```javascript
   localStorage.getItem('dysapp:mockMode')  // 'true'여야 함
   ```
2. 설정 페이지에서 다시 활성화
3. 페이지를 완전히 새로고침 (`Ctrl+Shift+R`)
4. 브라우저 캐시 삭제

### 네비게이션이 로드되지 않음

**증상:** `nav.html`이 표시되지 않음

**해결 방법:**
1. 브라우저 콘솔에서 에러 확인
2. `includHTML.js`가 로드되었는지 확인:
   ```html
   <script src="./includHTML.js" defer></script>
   ```
3. `nav.html` 파일 경로 확인 (상대 경로)
4. 네트워크 탭에서 `nav.html` 요청 확인

### 모듈 import 오류

**증상:** `Failed to resolve module specifier` 에러

**해결 방법:**
1. 파일 확장자 확인 (`.js` 포함)
2. 상대 경로 확인:
   - 같은 디렉토리: `./file.js`
   - 상위 디렉토리: `../file.js`
3. 파일이 실제로 존재하는지 확인
4. Live Server를 사용 중인지 확인 (일반 파일 서버는 ES 모듈을 지원하지 않음)

### Firebase 초기화 오류

**증상:** "익명 인증이 활성화되지 않았습니다" 에러

**해결 방법:**
1. 목업 모드를 활성화하여 개발 (권장)
2. 또는 Firebase Console에서 Anonymous Authentication 활성화
3. Firebase Emulators 사용:
   ```bash
   cd packages/backend
   firebase emulators:start
   ```

### 자동 새로고침이 작동하지 않음

**증상:** 파일을 수정해도 브라우저가 자동으로 새로고침되지 않음

**해결 방법:**
1. Live Server가 실행 중인지 확인
2. 브라우저 캐시 비활성화 (개발자 도구 > Network > Disable cache)
3. Live Server 재시작
4. 브라우저 하드 리프레시 (`Ctrl+Shift+R`)

### CORS 오류

**증상:** `Access-Control-Allow-Origin` 에러

**해결 방법:**
1. Live Server를 사용 중인지 확인 (일반 파일 서버는 CORS 문제 발생 가능)
2. `http://localhost:5500`으로 접속 (파일 경로가 아닌)
3. 브라우저 확장 프로그램 비활성화 (CORS 관련)

## 📖 추가 리소스

- **[QUICKSTART.md](./QUICKSTART.md)** - 단계별 시작 가이드
- **[루트 README.md](../../README.md)** - 모노레포 전체 가이드
- **[백엔드 README.md](../../backend/README.md)** - Firebase Functions 가이드

## 🔗 관련 문서

- [Firebase Documentation](https://firebase.google.com/docs)
- [VS Code Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

## 📝 개발 체크리스트

새 기능을 추가할 때:

- [ ] HTML 파일에 `includHTML.js` 및 `app.js` 포함
- [ ] `nav.html` 포함 (`<nav data-include-path="nav.html"></nav>`)
- [ ] ES6 모듈 사용 (`type="module"`)
- [ ] 상대 경로 사용
- [ ] 에러 처리 (API 호출 시)
- [ ] 이벤트 리스너 정리 (`registerCleanup` 사용)
- [ ] 목업 모드에서 테스트
- [ ] 브라우저 콘솔 에러 확인

## 💡 팁

1. **개발 시 목업 모드 활성화**: 백엔드 없이 빠르게 개발 가능
2. **브라우저 개발자 도구 활용**: 콘솔, 네트워크, 스토리지 탭 확인
3. **VS Code 확장 프로그램**: ESLint, Prettier 등 설치 권장
4. **Git 커밋 전**: 목업 모드에서 모든 기능 테스트

---

**마지막 업데이트:** 2026-01-13  
**버전:** 1.0.0
