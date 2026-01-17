# Dysapp Monorepo

AI 디자인 분석 플랫폼 - 모노레포 구조

## 프로젝트 구조

```
dysapp/
├── packages/
│   ├── frontend/          # 프론트엔드 (HTML, CSS, JavaScript)
│   └── backend/           # 백엔드 (Firebase Cloud Functions)
├── docs/                  # 문서
└── scripts/               # 유틸리티 스크립트
```

## 빠른 시작

### 프론트엔드 개발

```bash
cd packages/frontend
# VS Code Live Server로 index.html 열기
```

자세한 내용: [packages/frontend/README.md](./packages/frontend/README.md)

### 백엔드 개발

```bash
cd packages/backend
cd functions
npm install
npm run serve
```

자세한 내용: [packages/backend/README.md](./packages/backend/README.md)

## 브랜치 전략

- `0113frontend`: 프론트엔드 모노레포 구조 브랜치
- `frontend`: 기존 프론트엔드 브랜치
- `main`: 메인 브랜치

## 개발 환경 설정

### 필수 도구

- VS Code
- VS Code Live Server 확장 프로그램 (프론트엔드)
- Node.js 20+ (백엔드)
- Firebase CLI (백엔드)

### 워크스페이스 설정

VS Code에서 `dysapp.code-workspace` 파일을 열면 자동으로 프론트엔드/백엔드 폴더가 인식됩니다.

## 목업 모드

프론트엔드에서 백엔드 없이 개발할 수 있는 목업 모드가 제공됩니다.

1. 설정 페이지(`packages/frontend/settings.html`)로 이동
2. "개발자 모드" 섹션에서 "목업 모드 활성화" 선택
3. 페이지 새로고침

자세한 내용: [packages/frontend/README.md#목업-모드](./packages/frontend/README.md#목업-모드)

## 패키지별 문서

- [프론트엔드 README](./packages/frontend/README.md)
- [프론트엔드 빠른 시작](./packages/frontend/QUICKSTART.md)
- [백엔드 README](./packages/backend/README.md)

## 기여 가이드

1. `0113frontend` 브랜치에서 작업
2. 변경사항 커밋
3. 원격 레포에 푸시

## 라이선스

Private
