# Dysapp Backend

Dysapp 백엔드 - Firebase Cloud Functions

## 빠른 시작

### 필수 요구사항

- Node.js 20 이상
- Firebase CLI
- Firebase 프로젝트 설정

### 설치

```bash
cd packages/backend
cd functions
npm install
```

### 개발 서버 실행

```bash
# Firebase Emulators 시작
npm run serve

# 또는 루트에서
npm run dev:backend
```

### 빌드

```bash
npm run build
```

### 배포

```bash
# Functions만 배포
npm run deploy

# 또는 Firebase CLI 직접 사용
firebase deploy --only functions
```

## 파일 구조

```
packages/backend/
├── functions/              # Firebase Cloud Functions
│   ├── src/               # TypeScript 소스 코드
│   │   ├── analysis/      # 분석 관련 함수
│   │   ├── chat/          # 채팅 관련 함수
│   │   ├── search/        # 검색 관련 함수
│   │   └── user/          # 사용자 관련 함수
│   ├── lib/               # 컴파일된 JavaScript
│   └── package.json       # Functions 의존성
├── firebase.json          # Firebase 설정
├── firestore.rules        # Firestore 보안 규칙
├── firestore.indexes.json # Firestore 인덱스
└── storage.rules          # Storage 보안 규칙
```

## Firebase 설정

### firebase.json

- Functions 경로: `functions/`
- Emulators 포트 설정 포함

### Firestore

- 데이터베이스: `dysapp` (nam5 리전)
- 보안 규칙: `firestore.rules`
- 인덱스: `firestore.indexes.json`

### Storage

- 보안 규칙: `storage.rules`

## 개발 가이드

### Functions 개발

1. `functions/src/` 디렉토리에서 TypeScript 파일 수정
2. `npm run build` 실행하여 컴파일
3. Emulators에서 테스트

### Emulators 사용

```bash
# 모든 Emulators 시작
firebase emulators:start

# 특정 서비스만 시작
firebase emulators:start --only functions,firestore
```

### 로컬 테스트

프론트엔드에서 Emulators에 연결하려면:
- Functions: `localhost:5001`
- Firestore: `localhost:8080`

프론트엔드의 `firebaseService.js`가 자동으로 localhost를 감지하여 Emulators에 연결합니다.

## 배포

### Functions 배포

```bash
cd packages/backend
npm run deploy
```

### Firestore Rules 배포

```bash
firebase deploy --only firestore:rules
```

### Storage Rules 배포

```bash
firebase deploy --only storage
```

## 문제 해결

### 빌드 오류

1. TypeScript 버전 확인: `npm list typescript`
2. `node_modules` 삭제 후 재설치: `rm -rf node_modules && npm install`
3. `lib/` 디렉토리 삭제 후 재빌드

### Emulator 연결 실패

1. 포트가 사용 중인지 확인
2. `firebase.json`의 emulator 설정 확인
3. 방화벽 설정 확인

### 배포 실패

1. Firebase 로그인 확인: `firebase login`
2. 프로젝트 선택 확인: `firebase use`
3. Functions 빌드 확인: `npm run build`
