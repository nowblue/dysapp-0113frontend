# Firestore Indexes 배포 수정 사항

**문제**: 인덱스가 `(default)` 데이터베이스에 배포되었지만, 실제 사용 데이터베이스는 `dysapp`

**해결 방법**: `dysapp` 데이터베이스에 인덱스를 배포해야 합니다.

---

## 현재 상황

### 배포된 인덱스 위치
- **배포 위치**: `(default)` 데이터베이스
- **실제 사용**: `dysapp` 데이터베이스

### Firebase CLI 제한사항
- Firebase CLI 버전 15.2.0은 다중 데이터베이스에 대한 인덱스 배포를 직접 지원하지 않습니다.
- `firebase deploy --only firestore:indexes`는 기본적으로 `(default)` 데이터베이스에만 배포합니다.

---

## 해결 방법

### 방법 1: Firebase Console에서 수동 생성 (가장 간단)

1. Firebase Console 접속: https://console.firebase.google.com/project/dysapp1210/firestore
2. 왼쪽 상단에서 **데이터베이스 선택**: `dysapp` 선택
3. **Indexes** 탭 클릭
4. **Create Index** 버튼 클릭
5. `firestore.indexes.json` 파일의 인덱스 정의를 참고하여 수동 생성

#### 필요한 인덱스 목록:

**analyses 컬렉션:**
1. Collection: `analyses`
   - Fields: `userId` (Ascending), `createdAt` (Descending)

2. Collection: `analyses`
   - Fields: `userId` (Ascending), `formatPrediction` (Ascending), `createdAt` (Descending)

3. Collection: `analyses`
   - Fields: `userId` (Ascending), `fixScope` (Ascending), `createdAt` (Descending)

4. Collection: `analyses`
   - Fields: `formatPrediction` (Ascending), `overallScore` (Descending)

5. Collection: `analyses`
   - Fields: `fixScope` (Ascending), `overallScore` (Descending)

**chatSessions 컬렉션:**
6. Collection: `chatSessions`
   - Fields: `userId` (Ascending), `updatedAt` (Descending)

**bookmarks 컬렉션:**
7. Collection: `bookmarks`
   - Fields: `userId` (Ascending), `createdAt` (Descending)

### 방법 2: 쿼리 실행 시 자동 생성 링크 사용

복합 쿼리를 실행하면 Firebase Console에서 인덱스 생성 링크가 제공됩니다.

1. 앱에서 복합 쿼리 실행 (예: 분석 목록 조회)
2. 에러 메시지에 인덱스 생성 링크 포함
3. 링크 클릭하여 인덱스 생성

### 방법 3: gcloud CLI 사용 (고급)

gcloud CLI가 설치되어 있다면 다음 명령어로 인덱스를 생성할 수 있습니다:

```bash
# 예시: analyses 컬렉션 인덱스 생성
gcloud firestore indexes create \
  --project=dysapp1210 \
  --database=dysapp \
  --collection-group=analyses \
  --query-scope=COLLECTION \
  --field-config field=userId,order=ASCENDING \
  --field-config field=createdAt,order=DESCENDING
```

---

## 권장 조치

### 즉시 조치
1. ✅ **Firebase Console에서 수동 생성** (방법 1) - 가장 확실한 방법
2. 또는 쿼리 실행 시 자동 생성 링크 사용 (방법 2)

### 영향
- 인덱스가 없어도 단일 필드 쿼리는 정상 작동합니다.
- 복합 쿼리는 인덱스가 필요하며, 없으면 에러 발생 또는 느린 성능이 발생할 수 있습니다.
- 쿼리 실행 시 Firebase Console에서 인덱스 생성 링크가 자동으로 제공됩니다.

---

## 참고

- **인덱스 생성 시간**: 인덱스 생성에는 몇 분에서 몇 시간이 소요될 수 있습니다 (데이터 양에 따라).
- **인덱스 상태 확인**: Firebase Console > Firestore Database > `dysapp` > Indexes 탭에서 확인 가능합니다.
- **자동 인덱스**: 단일 필드 쿼리는 자동 인덱스로 처리되므로 별도 생성 불필요합니다.

---

**상태**: 문제 확인 완료, 해결 방법 제시  
**우선순위**: 중간 (쿼리 실행 시 자동 생성 가능하지만, 미리 생성 권장)
