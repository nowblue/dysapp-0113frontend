# 빠른 시작 가이드

## 1단계: 환경 설정

### VS Code Live Server 설치

1. VS Code 열기
2. Extensions 탭 열기 (Ctrl+Shift+X 또는 Cmd+Shift+X)
3. "Live Server" 검색
4. Ritwick Dey의 "Live Server" 설치
5. 설치 완료 후 VS Code 재시작

## 2단계: 프로젝트 열기

### 방법 1: 워크스페이스 사용 (권장)

1. 루트 디렉토리에서 `dysapp.code-workspace` 파일 열기
2. VS Code가 자동으로 프론트엔드/백엔드 폴더를 인식합니다

### 방법 2: 프론트엔드 폴더만 열기

1. VS Code에서 `packages/frontend` 폴더 열기
2. File > Open Folder 선택

## 3단계: Live Server 실행

### 방법 1: 우클릭 메뉴

1. `index.html` 파일을 우클릭
2. "Open with Live Server" 선택

### 방법 2: 상태바 버튼

1. VS Code 하단 상태바에서 "Go Live" 버튼 클릭
2. 브라우저가 자동으로 열립니다

### 방법 3: 명령 팔레트

1. Ctrl+Shift+P (또는 Cmd+Shift+P)
2. "Live Server: Open with Live Server" 입력
3. Enter

## 4단계: 목업 모드 활성화 (선택사항)

백엔드 없이 개발하려면 목업 모드를 활성화하세요.

1. 브라우저에서 `http://localhost:5500/settings.html` 접속
2. "개발자 모드" 섹션으로 스크롤
3. "목업 모드 활성화" 체크박스 선택
4. 페이지 새로고침 (F5 또는 Ctrl+R)

## 5단계: 개발 시작

이제 프론트엔드 개발을 시작할 수 있습니다!

- 파일을 수정하면 Live Server가 자동으로 새로고침합니다
- 목업 모드가 활성화되어 있으면 백엔드 없이 모든 기능을 테스트할 수 있습니다

## 문제 해결

### 포트 충돌

포트 5500이 이미 사용 중인 경우:

1. `.vscode/settings.json` 파일 열기
2. `liveServer.settings.port` 값을 다른 포트로 변경 (예: 5501)
3. Live Server 재시작

### 자동 새로고침이 작동하지 않음

1. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
2. Live Server 재시작
3. 브라우저 하드 리프레시 (Ctrl+Shift+R)

### 목업 모드가 작동하지 않음

1. 브라우저 개발자 도구 열기 (F12)
2. Console 탭에서 `localStorage.getItem('dysapp:mockMode')` 확인
3. "true"가 반환되어야 합니다
4. 설정 페이지에서 다시 활성화 시도

### 네비게이션이 표시되지 않음

1. 브라우저 콘솔에서 에러 확인
2. `includHTML.js`가 로드되었는지 확인
3. `nav.html` 파일이 존재하는지 확인

## 다음 단계

- [README.md](./README.md) - 상세 문서
- [루트 README.md](../../README.md) - 모노레포 전체 가이드
