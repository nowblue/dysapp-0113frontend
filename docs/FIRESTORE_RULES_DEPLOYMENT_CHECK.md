# Firestore Rules 배포 확인 - dysapp 데이터베이스

**확인일**: 2025-01-27  
**문제**: Rules가 `dysapp` 데이터베이스에 배포되었는지 확인 필요

---

## 문제 상황

### 인덱스 배포 문제
- 인덱스가 `(default)` 데이터베이스에 배포되었음
- 실제 사용 데이터베이스는 `dysapp`
- Firebase CLI는 기본적으로 `(default)` 데이터베이스에만 배포

### Rules 배포 확인 필요
- Rules도 동일한 문제가 있을 수 있음
- `firebase deploy --only firestore:rules` 명령어가 어느 데이터베이스에 배포했는지 확인 필요

---

## Rules 파일 구조

### 현재 Rules 파일 (`firestore.rules`)
```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // ...
  }
}
```

**중요**: `match /databases/{database}/documents` 구조는 모든 데이터베이스에 적용 가능한 구조입니다.

하지만 **배포 시점**에 어느 데이터베이스에 배포되는지는 Firebase CLI 설정에 따라 다릅니다.

---

## 확인 방법

### 방법 1: Firebase Console에서 확인 (가장 확실)

1. Firebase Console 접속: https://console.firebase.google.com/project/dysapp1210/firestore
2. 왼쪽 상단에서 **데이터베이스 선택**: `dysapp` 선택
3. **Rules** 탭 클릭
4. 현재 Rules 내용 확인
5. `privacyConsent` 검증 규칙이 포함되어 있는지 확인

#### 확인할 내용:
- `users` 컬렉션의 `privacyConsent` 검증 규칙 존재 여부
- Rules 내용이 로컬 `firestore.rules` 파일과 일치하는지 확인

### 방법 2: 배포 로그 확인

이전 배포 로그를 확인하여 어느 데이터베이스에 배포되었는지 확인:
```
+  firestore: released rules firestore.rules to cloud.firestore
```

로그에 데이터베이스 정보가 명시되지 않으면 `(default)` 데이터베이스에 배포된 것으로 추정됩니다.

---

## 해결 방법

### Rules가 `(default)`에만 배포된 경우

#### 방법 1: Firebase Console에서 수동 복사 (권장)

1. Firebase Console 접속
2. Firestore Database > `dysapp` 데이터베이스 선택
3. **Rules** 탭 클릭
4. 로컬 `firestore.rules` 파일 내용을 복사하여 붙여넣기
5. **게시** 버튼 클릭

#### 방법 2: Firebase CLI로 재배포 (데이터베이스 지정 불가)

Firebase CLI는 현재 다중 데이터베이스에 대한 Rules 배포를 직접 지원하지 않습니다.

---

## Rules 내용 확인

### 현재 Rules에 포함된 주요 내용:

1. **users 컬렉션** - `privacyConsent` 검증 규칙 포함
   ```firestore
   match /users/{userId} {
     allow read: if isAuthenticated() && request.auth.uid == userId;
     allow create: if isAuthenticated() && 
                     request.auth.uid == userId &&
                     // Validate privacyConsent if provided
                     (!request.resource.data.keys().hasAny(['privacyConsent']) ||
                      (request.resource.data.privacyConsent != null &&
                       request.resource.data.privacyConsent.keys().hasAll(['consented', 'version']) &&
                       request.resource.data.privacyConsent.consented == true &&
                       request.resource.data.privacyConsent.version is string));
     // ...
   }
   ```

2. **analyses 컬렉션** - 소유권 검증
3. **chatSessions 컬렉션** - 소유권 검증
4. **bookmarks 컬렉션** - 소유권 검증
5. **collections 컬렉션** - 소유권 및 공개 설정 검증
6. **referenceDesigns 컬렉션** - 읽기 전용

---

## 권장 조치

### 즉시 조치
1. ✅ **Firebase Console에서 확인** (방법 1)
   - `dysapp` 데이터베이스 선택
   - Rules 탭에서 `privacyConsent` 검증 규칙 확인
   - 없으면 로컬 파일 내용 복사하여 게시

### 영향
- Rules가 없으면 모든 데이터 접근이 거부됩니다.
- `dysapp` 데이터베이스에 Rules가 없으면 Functions에서 데이터 읽기/쓰기가 실패합니다.
- **반드시 확인 필요**

---

## 확인 체크리스트

- [ ] Firebase Console > Firestore Database > `dysapp` > Rules 탭 확인
- [ ] `privacyConsent` 검증 규칙 존재 여부 확인
- [ ] Rules 내용이 로컬 `firestore.rules` 파일과 일치하는지 확인
- [ ] 필요시 Rules 수동 복사 및 게시

---

**상태**: 확인 필요  
**우선순위**: 높음 (Rules 없으면 데이터 접근 불가)
