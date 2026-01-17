# Firestore Indexes 배포 문제 해결

**문제**: 인덱스가 `(default)` 데이터베이스에 배포되었지만, 실제로는 `dysapp` 데이터베이스를 사용하고 있음

**발견일**: 2025-01-27

---

## 문제 상황

### 배포 로그 확인
```
+  firestore: deployed indexes in firestore.indexes.json successfully for (default) database
```

인덱스가 `(default)` 데이터베이스에 배포되었습니다.

### 현재 데이터베이스 구조
- `(default)` - 기본 데이터베이스
- `dysapp` - 실제 사용 데이터베이스 (nam5 리전)

### Functions 코드 확인
모든 Functions는 `getFirestore("dysapp")`를 사용하여 `dysapp` 데이터베이스에 연결하고 있습니다.

---

## 문제 원인

Firebase CLI의 `firebase deploy --only firestore:indexes` 명령어는 기본적으로 `(default)` 데이터베이스에만 인덱스를 배포합니다.

Firebase CLI는 현재 다중 데이터베이스에 대한 인덱스 배포를 직접 지원하지 않습니다.

---

## 해결 방법

### 방법 1: Firebase Console에서 수동 생성 (권장)

1. Firebase Console 접속
2. Firestore Database > `dysapp` 데이터베이스 선택
3. Indexes 탭으로 이동
4. 필요한 인덱스 수동 생성

또는 쿼리 실행 시 Firebase Console에서 제공하는 인덱스 생성 링크 사용

### 방법 2: gcloud CLI 사용

```bash
# gcloud CLI 설치 필요
gcloud firestore indexes create --database=dysapp --collection-group=analyses --query-scope=COLLECTION --field-config field=userId,order=ASCENDING --field-config field=createdAt,order=DESCENDING
```

### 방법 3: Firebase Admin SDK 사용 (프로그래밍 방식)

TypeScript/Node.js 스크립트를 작성하여 인덱스를 생성할 수 있습니다.

---

## 현재 상황

### 인덱스가 필요한 컬렉션

1. **analyses** 컬렉션
   - `userId` + `createdAt` (DESC)
   - `userId` + `formatPrediction` + `createdAt` (DESC)
   - `userId` + `fixScope` + `createdAt` (DESC)
   - `formatPrediction` + `overallScore` (DESC)
   - `fixScope` + `overallScore` (DESC)

2. **chatSessions** 컬렉션
   - `userId` + `updatedAt` (DESC)

3. **bookmarks** 컬렉션
   - `userId` + `createdAt` (DESC)

### 영향

- 인덱스가 없으면 복합 쿼리 실행 시 에러 발생 또는 느린 성능
- Firebase Console에서 인덱스 생성 링크 제공 (쿼리 실행 시)
- 단일 필드 쿼리는 자동 인덱스로 처리됨

---

## 권장 조치

### 즉시 조치
1. Firebase Console에서 `dysapp` 데이터베이스의 인덱스 상태 확인
2. 필요한 인덱스 수동 생성 또는 쿼리 실행 시 자동 생성 링크 사용

### 장기 조치
1. Firebase CLI의 다중 데이터베이스 지원 업데이트 대기
2. 또는 배포 스크립트에 gcloud CLI 통합

---

## 참고

- Firebase CLI 버전: 확인 필요
- 다중 데이터베이스 지원: 제한적
- 인덱스 자동 생성: 쿼리 실행 시 Firebase Console에서 링크 제공

---

**상태**: 문제 확인 완료, 해결 방법 제시  
**우선순위**: 중간 (쿼리 실행 시 자동 생성 가능)
