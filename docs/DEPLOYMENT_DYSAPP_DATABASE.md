# dysapp 데이터베이스 배포 가이드

**작성일**: 2025-01-13  
**프로젝트**: dysapp1210  
**목적**: `dysapp` 데이터베이스에 Rules와 Indexes 배포 방법 안내

---

## 현재 상황

### 데이터베이스 구조
- `(default)` - 기본 데이터베이스
- `dysapp` - 실제 사용 데이터베이스 (nam5 리전) ✅

### 배포 상태
- ✅ `(default)` 데이터베이스: Rules와 Indexes 배포 완료
- ⚠️ `dysapp` 데이터베이스: Rules와 Indexes 배포 필요

---

## 문제점

Firebase CLI 버전 15.2.0은 다중 데이터베이스에 대한 직접 배포를 지원하지 않습니다.

- `firebase deploy --only firestore:rules` → `(default)` 데이터베이스에만 배포
- `firebase deploy --only firestore:indexes` → `(default)` 데이터베이스에만 배포

---

## 해결 방법

### 방법 1: Firebase Console에서 수동 배포 (권장)

#### Rules 배포
1. Firebase Console 접속: https://console.firebase.google.com/project/dysapp1210/firestore
2. 왼쪽 상단에서 **데이터베이스 선택**: `dysapp` 선택
3. **Rules** 탭 클릭
4. `firestore.rules` 파일 내용 복사하여 붙여넣기
5. **Publish** 버튼 클릭

#### Indexes 배포
1. Firebase Console 접속: https://console.firebase.google.com/project/dysapp1210/firestore
2. 왼쪽 상단에서 **데이터베이스 선택**: `dysapp` 선택
3. **Indexes** 탭 클릭
4. `firestore.indexes.json` 파일의 인덱스 정의를 참고하여 수동 생성

**필요한 인덱스 목록** (`firestore.indexes.json` 참고):
- analyses 컬렉션: userId + createdAt (DESC)
- analyses 컬렉션: userId + formatPrediction + createdAt (DESC)
- analyses 컬렉션: userId + fixScope + createdAt (DESC)
- analyses 컬렉션: formatPrediction + overallScore (DESC)
- analyses 컬렉션: fixScope + overallScore (DESC)
- chatSessions 컬렉션: userId + updatedAt (DESC)
- bookmarks 컬렉션: userId + createdAt (DESC)

### 방법 2: 쿼리 실행 시 자동 생성 (Indexes만)

복합 쿼리를 실행하면 Firebase Console에서 인덱스 생성 링크가 제공됩니다.

1. 앱에서 복합 쿼리 실행 (예: 분석 목록 조회)
2. 에러 메시지에 인덱스 생성 링크 포함
3. 링크 클릭하여 인덱스 생성

**주의**: Rules는 반드시 수동으로 배포해야 합니다.

### 방법 3: gcloud CLI 사용 (고급)

gcloud CLI가 설치되어 있다면 다음 명령어로 배포할 수 있습니다:

```bash
# Rules 배포 (gcloud는 Rules 배포를 직접 지원하지 않음)
# Rules는 Firebase Console에서 수동 배포 필요

# Indexes 배포 예시
gcloud firestore indexes create \
  --project=dysapp1210 \
  --database=dysapp \
  --collection-group=analyses \
  --query-scope=COLLECTION \
  --field-config field=userId,order=ASCENDING \
  --field-config field=createdAt,order=DESCENDING
```

---

## Functions 배포 필요 여부

### 확인 사항
- ✅ Functions 코드가 존재함 (`functions/src/` 디렉토리)
- ✅ Functions가 `dysapp` 데이터베이스를 사용하도록 설정됨
- ⚠️ Functions 배포 필요 여부 확인 필요

### Functions 배포 명령어
```bash
firebase deploy --only functions
```

### Functions 배포 전 확인
1. `functions/package.json` 확인
2. `functions/src/index.ts`에서 모든 Functions export 확인
3. 환경 변수 설정 확인

---

## Hosting 배포 필요 여부

### 확인 사항
- ✅ Hosting 설정이 `firebase.json`에 존재함
- ✅ 정적 파일들이 존재함 (HTML, CSS, JS)
- ⚠️ Hosting 배포 필요 여부 확인 필요

### Hosting 배포 명령어
```bash
firebase deploy --only hosting
```

### Hosting 배포 전 확인
1. `firebase.json`의 `hosting.public` 경로 확인
2. `firebase.json`의 `hosting.ignore` 패턴 확인
3. 빌드된 파일 존재 여부 확인

---

## 권장 배포 순서

1. ✅ **Firestore Rules** (`dysapp` 데이터베이스) - Firebase Console에서 수동 배포
2. ✅ **Firestore Indexes** (`dysapp` 데이터베이스) - Firebase Console에서 수동 생성 또는 쿼리 실행 시 자동 생성
3. ⚠️ **Cloud Functions** - 배포 필요 여부 확인 후 배포
4. ⚠️ **Hosting** - 배포 필요 여부 확인 후 배포

---

## 배포 확인 체크리스트

### Firestore Rules
- [ ] Firebase Console > Firestore Database > `dysapp` > Rules 탭에서 Rules 확인
- [ ] `users` 컬렉션 생성 시 `privacyConsent` 검증 규칙 확인
- [ ] 본인만 읽기/수정 가능 규칙 확인

### Firestore Indexes
- [ ] Firebase Console > Firestore Database > `dysapp` > Indexes 탭에서 인덱스 확인
- [ ] 필요한 모든 인덱스가 생성되었는지 확인
- [ ] 인덱스 상태가 "Enabled"인지 확인

### Cloud Functions
- [ ] `firebase functions:list` 명령어로 배포된 Functions 확인
- [ ] Functions가 `dysapp` 데이터베이스를 사용하는지 확인
- [ ] Functions 로그 확인

### Hosting
- [ ] `firebase hosting:sites:list` 명령어로 Hosting 사이트 확인
- [ ] 배포된 URL 접속 테스트
- [ ] 정적 파일 로드 확인

---

## 참고

- **Rules 배포**: 반드시 Firebase Console에서 수동 배포 필요
- **Indexes 배포**: Firebase Console에서 수동 생성 또는 쿼리 실행 시 자동 생성
- **Functions 배포**: 코드 변경 시에만 배포 필요
- **Hosting 배포**: 프론트엔드 파일 변경 시에만 배포 필요

---

**상태**: 가이드 작성 완료  
**우선순위**: 높음 (Rules는 반드시 배포 필요)
