# dysapp 프론트엔드 개발자 온보딩 가이드

**작성일**: 2025-01-27  
**프로젝트**: dysapp (디자인 분석 AI 플랫폼)  
**대상**: 프론트엔드 개발자

---

## 시작하기 전에

이 가이드는 여러분이 빠르게 프로젝트에 적응하고 생산적으로 작업할 수 있도록 도와드리기 위해 작성되었습니다. 

dysapp은 디자인 이미지를 AI 기반으로 분석하고 객관적인 피드백을 제공하는 웹 애플리케이션입니다. 사용자가 디자인 이미지를 업로드하면 AI가 색상, 레이아웃, 타이포그래피 등을 분석하고, 분석 결과에 대해 AI 멘토와 채팅할 수 있으며, 유사한 디자인을 검색할 수 있는 기능을 제공합니다. 프로젝트는 프레임워크 없이 순수 HTML, CSS, JavaScript로 구성되어 있어 빌드 과정 없이 바로 실행할 수 있는 것이 특징입니다.

이 프로젝트에서 여러분이 주로 다루게 될 기술 스택은 JavaScript(ES6+), CSS3, 그리고 Firebase입니다. Firebase는 백엔드 인프라로 사용되며, Cloud Functions, Firestore, Storage, Authentication을 활용합니다. ES Modules를 사용하여 모던한 JavaScript 모듈 시스템을 따르고 있으며, CSS Variables를 통해 디자인 토큰을 중앙에서 관리하고 있습니다.

---

## 개발 환경 설정하기

프로젝트를 시작하기 전에 개발 환경을 설정해야 합니다. 먼저 Node.js 20.x 이상이 설치되어 있어야 하며, Firebase CLI도 필요합니다. 저장소를 클론한 후 Firebase CLI를 전역으로 설치하고 로그인하세요. `firebase login` 명령어로 Firebase 계정에 로그인하면 됩니다.

로컬에서 개발할 때는 두 가지 방법이 있습니다. 첫 번째는 Firebase Emulators를 사용하는 방법으로, 이는 가장 권장되는 방법입니다. `firebase emulators:start` 명령어를 실행하면 Hosting, Functions, Firestore, Storage가 모두 로컬에서 실행됩니다. 브라우저에서 `http://localhost:5000`으로 접속하면 애플리케이션을 확인할 수 있습니다. 두 번째 방법은 간단한 HTTP 서버를 사용하는 것입니다. Python이 설치되어 있다면 `python -m http.server 8000`을 실행하거나, Node.js의 `http-server`를 사용할 수도 있습니다. 중요한 것은 ES Modules를 사용하기 때문에 `file://` 프로토콜로는 실행할 수 없다는 점입니다. 반드시 HTTP 서버를 통해 실행해야 합니다.

개발 환경이 준비되면 브라우저에서 애플리케이션을 열고 개발자 도구(F12)를 열어 콘솔에서 에러가 없는지 확인해보세요. 처음 접속하면 Firebase 익명 인증이 자동으로 시도되며, 이 과정에서 문제가 발생하면 콘솔에 에러 메시지가 표시됩니다.

---

## 프로젝트 구조 이해하기

프로젝트의 전체 구조를 이해하는 것은 매우 중요합니다. 루트 디렉토리에는 여러 HTML 파일들이 있습니다. `index.html`은 메인 업로드 페이지로, 사용자가 이미지를 업로드하는 곳입니다. `analyze.html`은 분석 결과를 표시하고 AI 멘토와 채팅할 수 있는 페이지입니다. `searchTab.html`은 검색 기능을 제공하는 페이지이고, `mypage.html`은 사용자 프로필과 분석 히스토리를 관리하는 페이지입니다. `nav.html`은 사이드바 네비게이션 컴포넌트로, 여러 페이지에서 공통으로 사용됩니다.

`scripts/` 폴더에는 각 페이지의 JavaScript 로직이 담겨 있습니다. `app.js`는 애플리케이션의 전역 초기화와 공통 기능을 담당합니다. 여기에는 로딩 상태 관리, Toast 알림, 네비게이션 관리 등의 기능이 포함되어 있습니다. 모든 페이지에서 `initApp()` 함수를 호출하여 앱을 초기화합니다. `upload.js`는 파일 업로드 처리와 이미지 분석 시작을 담당하고, `analyze.js`는 분석 결과를 로드하고 렌더링하며 AI 멘토 채팅 기능을 제공합니다. `search.js`는 검색 기능을 구현하고 있습니다.

`services/` 폴더는 API 서비스 레이어입니다. `apiService.js`는 모든 Cloud Functions 호출을 위한 래퍼 함수들을 제공합니다. 여기에는 `analyzeDesign`, `getAnalysis`, `chatWithMentor`, `searchSimilar` 등의 함수들이 정의되어 있으며, 모든 API 호출은 자동으로 에러 처리가 됩니다. `firebaseService.js`는 Firebase SDK 초기화와 인증 관리를 담당합니다. `errorHandler.js`는 에러를 처리하고 사용자에게 친화적인 메시지를 표시합니다.

`utils/` 폴더에는 유틸리티 함수들이 있습니다. `dataAdapter.js`는 백엔드에서 받은 데이터를 프론트엔드 형식으로 변환하는 역할을 합니다. `domHelper.js`는 DOM 조작을 돕는 헬퍼 함수들을 제공하고, `eventManager.js`는 이벤트 리스너를 관리하고 정리합니다. `performance.js`는 성능 최적화를 위한 유틸리티(debounce, throttle 등)를 제공하며, `stateManager.js`는 localStorage와 sessionStorage를 관리합니다.

`common.css`는 모든 페이지에서 공통으로 사용되는 스타일시트입니다. 여기에는 CSS Variables로 정의된 디자인 토큰(색상, 타이포그래피, 간격, 그림자 등)이 포함되어 있으며, 전역 스타일 리셋과 기본 타이포그래피 설정, 네비게이션 컴포넌트 스타일, 각 페이지별 컴포넌트 스타일, 그리고 반응형 디자인을 위한 미디어 쿼리가 정의되어 있습니다. 스타일을 수정할 때는 하드코딩보다 CSS Variables를 사용하는 것이 권장됩니다. 이렇게 하면 디자인 토큰을 한 곳에서 관리할 수 있고, 일관성을 유지하기 쉬우며, 테마 변경 시에도 쉽게 수정할 수 있습니다.

---

## 실제 개발 작업 시작하기

index.html` 파일을 열고 버튼 요소를 찾아 텍스트를 수정한 후 브라우저에서 확인해보면 됩니다. 스타일을 수정할 때는 `common.css` 파일에서 해당 클래스를 찾아 CSS Variables를 사용하여 색상이나 크기를 변경하면 됩니다.

새로운 페이지를 추가하려면 먼저 HTML 파일을 생성해야 합니다. 기본 구조는 다른 페이지들과 유사하게 작성하면 되며, `nav.html`을 포함하고 `app.js`를 import하여 `initApp()`을 호출해야 합니다. 그 다음 해당 페이지의 JavaScript 파일을 `scripts/` 폴더에 생성하고, 페이지별 초기화 로직을 작성합니다. 네비게이션에 링크를 추가하고, 필요하다면 `common.css`에 스타일을 추가하면 됩니다.

API 호출을 추가하려면 `services/apiService.js` 파일에 새로운 함수를 추가해야 합니다. 함수는 `withErrorHandling` 래퍼로 감싸서 자동으로 에러 처리가 되도록 작성합니다. `FUNCTION_NAMES` 객체에 백엔드 함수명과 일치하는 이름을 추가하고, 실제 사용할 때는 `import` 문으로 함수를 가져와서 호출하면 됩니다. 모든 API 함수는 자동으로 에러를 처리하며, 네트워크 오류나 인증 오류가 발생하면 사용자에게 친화적인 메시지가 표시됩니다.

이미지 업로드 및 분석 기능은 `index.html`과 `scripts/upload.js`에서 구현되어 있습니다. 사용자가 이미지 파일을 선택하면 `handleFileSelect()` 함수가 파일을 검증하고, 파일을 base64로 변환한 후 `analyzeDesign()` API를 호출합니다. 분석이 완료되면 `analyze.html` 페이지로 이동하여 결과를 확인할 수 있습니다. 분석 결과는 `scripts/analyze.js`에서 처리되며, URL 파라미터나 localStorage에서 `analysisId`를 가져와 `getAnalysis()` API를 호출하여 데이터를 받아옵니다. 받아온 데이터는 `adaptAnalysisResponse()` 함수로 변환한 후 `renderAnalysisResults()` 함수로 화면에 렌더링됩니다.

AI 멘토 채팅 기능은 `analyze.html`과 `scripts/analyze.js`에서 구현되어 있습니다. 사용자가 채팅 입력창에 메시지를 입력하고 Enter 키를 누르거나 전송 버튼을 클릭하면 `chatWithMentor()` API가 호출됩니다. 응답이 오면 채팅 컨테이너에 메시지가 추가되며, 채팅 히스토리는 Firestore에 저장됩니다. 검색 기능은 `searchTab.html`과 `scripts/search.js`에서 구현되어 있으며, 텍스트 검색, 이미지 검색, 커스텀 검색 등 여러 타입의 검색을 지원합니다.

---

## 문제 해결과 디버깅

가장 흔한 문제 중 하나는 "Failed to fetch" 에러입니다. 이는 보통 Firebase Functions가 제대로 배포되지 않았거나 네트워크 연결에 문제가 있을 때 발생합니다. 로컬 개발 시에는 Emulator가 제대로 실행되고 있는지 확인해야 합니다. `firebaseService.js`에서 자동으로 localhost를 감지하여 Emulator에 연결하도록 되어 있으므로, 브라우저 콘솔의 네트워크 탭에서 API 호출이 제대로 이루어지는지 확인해보세요.

"Authentication required" 에러가 발생하면 Firebase Console에서 익명 인증이 활성화되어 있는지 확인해야 합니다. Firebase Console의 Authentication 섹션에서 Sign-in method를 열고 Anonymous를 활성화해야 합니다. 브라우저 콘솔에서 `getCurrentUser()` 함수를 호출하여 현재 인증 상태를 확인할 수도 있습니다.

이미지가 표시되지 않는 문제는 보통 Signed URL이 만료되었거나 Storage 규칙에 문제가 있을 때 발생합니다. Storage 규칙을 확인하고 필요하다면 다시 배포해야 합니다. Import 경로 오류는 상대 경로를 잘못 계산했을 때 발생합니다. 현재 파일의 위치를 기준으로 목적 파일까지의 경로를 정확히 계산해야 합니다. `scripts/analyze.js`에서 `services/apiService.js`를 import하려면 `../services/apiService.js`로 작성해야 합니다.

디버깅할 때는 브라우저 개발자 도구를 적극 활용하세요. 콘솔 탭에서 로그를 확인하고, 네트워크 탭에서 API 호출의 요청과 응답을 확인할 수 있습니다. 스토리지 탭에서는 localStorage와 sessionStorage에 저장된 데이터를 확인할 수 있습니다. Firebase Console에서도 Functions 로그와 Firestore 데이터를 확인할 수 있으며, `firebase functions:log` 명령어로 터미널에서도 로그를 확인할 수 있습니다.

---

## 마무리하며

모든 주요 파일에는 상세한 주석이 추가되어 있으므로, 코드를 읽을 때 주석을 참고하면 도움이 될 것입니다. 또한 `docs/` 폴더에는 PRD, FRD, SRD, TSD, APISPEC 등의 문서가 있으니 필요할 때 참고하시기 바랍니다.

코드를 작성할 때는 몇 가지 주의사항이 있습니다. 모든 JavaScript 파일은 ES Modules를 사용하므로 `import/export` 문법을 사용해야 합니다. 상대 경로를 정확히 계산하고, API 호출은 항상 `async/await`를 사용하며, `try-catch` 블록으로 에러를 처리해야 합니다. API 호출 전후로는 `showLoading()`과 `hideLoading()`을 사용하여 사용자에게 로딩 상태를 알려주는 것이 좋습니다.

성능 최적화를 위해서는 이미지에 `loading="lazy"` 속성을 추가하고, 검색 입력 등에는 `debounce`를 사용하며, 자주 사용하는 DOM 요소는 변수에 저장하여 캐싱하는 것이 좋습니다. 접근성을 위해서는 ARIA 속성을 사용하고, 모든 인터랙티브 요소는 키보드로 접근 가능해야 하며, 스크린 리더를 위한 콘텐츠도 제공해야 합니다.

