# 다중 데이터베이스 관련 위험 요소 사전 식별

**작성일**: 2025-01-27  
**프로젝트**: dysapp1210  
**목적**: Rules와 Indexes 배포 문제와 유사한 위험 요소 사전 식별

---

## 발견된 주요 문제

### 🔴 위험도: 높음

#### 1. 프론트엔드 Firestore 초기화 - 데이터베이스 미지정

**위치**: `services/firebaseService.js:78`

**현재 코드**:
```javascript
db = getFirestore(app);
```

**문제점**:
- 데이터베이스 ID를 지정하지 않아 기본적으로 `(default)` 데이터베이스를 사용합니다.
- 백엔드 Functions는 `dysapp` 데이터베이스를 사용하도록 수정되었습니다.
- **프론트엔드와 백엔드가 서로 다른 데이터베이스를 사용하고 있습니다.**

**영향**:
- 프론트엔드에서 읽기/쓰기한 데이터는 `(default)` 데이터베이스에 저장됩니다.
- 백엔드 Functions는 `dysapp` 데이터베이스에서 데이터를 읽습니다.
- **데이터 불일치 발생**: 프론트엔드에서 저장한 데이터를 백엔드에서 찾을 수 없습니다.

**해결 방법**:
```javascript
// 수정 필요
db = getFirestore(app, "dysapp");
```

---

### 🟡 위험도: 중간

#### 2. Firestore 에뮬레이터 설정 - 데이터베이스 미지정

**위치**: `firebase.json:49-50`

**현재 설정**:
```json
"firestore": {
  "port": 8080
}
```

**문제점**:
- 에뮬레이터가 어떤 데이터베이스를 사용하는지 명시되지 않았습니다.
- 로컬 개발 시 `(default)` 데이터베이스를 사용할 가능성이 높습니다.

**영향**:
- 로컬 개발 환경과 프로덕션 환경이 다를 수 있습니다.
- 로컬에서 테스트한 내용이 프로덕션과 다르게 동작할 수 있습니다.

**해결 방법**:
```json
"firestore": {
  "port": 8080,
  "database": "dysapp"
}
```

**참고**: Firebase Emulator Suite가 다중 데이터베이스를 지원하는지 확인 필요

---

#### 3. 프론트엔드 에뮬레이터 연결 코드 - Firestore 에뮬레이터 미연결

**위치**: `services/firebaseService.js:82-87`

**현재 코드**:
```javascript
if (window.location.hostname === "localhost") {
  console.log("[Firebase] Connecting to emulators...");
  connectFunctionsEmulator(functions, "localhost", 5001);
  // Note: Add other emulator connections if needed
}
```

**문제점**:
- Functions 에뮬레이터만 연결하고 있습니다.
- Firestore 에뮬레이터 연결 코드가 없습니다.
- `connectFirestoreEmulator` 함수를 사용해야 합니다.

**영향**:
- 로컬 개발 시 Firestore 에뮬레이터를 사용하지 않습니다.
- 프로덕션 Firestore를 사용하게 되어 개발 중 데이터가 프로덕션에 저장될 수 있습니다.

**해결 방법**:
```javascript
import { connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

if (window.location.hostname === "localhost") {
  console.log("[Firebase] Connecting to emulators...");
  connectFunctionsEmulator(functions, "localhost", 5001);
  connectFirestoreEmulator(db, "localhost", 8080);
}
```

---

### 🟢 위험도: 낮음

#### 4. Storage 초기화 - 데이터베이스와 무관

**위치**: `services/firebaseService.js:80`

**현재 코드**:
```javascript
storage = getStorage(app);
```

**상태**: ✅ 정상
- Storage는 Firestore 데이터베이스와 무관합니다.
- 단일 버킷을 사용하므로 문제 없습니다.

---

#### 5. Authentication 초기화 - 데이터베이스와 무관

**위치**: `services/firebaseService.js:77`

**현재 코드**:
```javascript
auth = getAuth(app);
```

**상태**: ✅ 정상
- Authentication은 Firestore 데이터베이스와 무관합니다.
- 프로젝트 레벨에서 관리되므로 문제 없습니다.

---

#### 6. Functions 초기화 - 리전 지정됨

**위치**: `services/firebaseService.js:79`

**현재 코드**:
```javascript
functions = getFunctions(app, "asia-northeast3");
```

**상태**: ✅ 정상
- Functions 리전이 올바르게 지정되었습니다.
- 데이터베이스와 무관합니다.

---

## 우선순위별 조치 사항

### 즉시 조치 필요 (높음)

1. **프론트엔드 Firestore 초기화 수정**
   - `services/firebaseService.js:78` 수정
   - `getFirestore(app, "dysapp")`로 변경
   - **가장 중요한 수정 사항**

### 조치 권장 (중간)

2. **Firestore 에뮬레이터 연결 코드 추가**
   - `services/firebaseService.js`에 `connectFirestoreEmulator` 추가
   - 로컬 개발 시 에뮬레이터 사용 보장

3. **에뮬레이터 설정 확인**
   - `firebase.json`에서 Firestore 에뮬레이터 데이터베이스 지정 가능 여부 확인
   - Firebase Emulator Suite 문서 확인

### 확인 필요 (낮음)

4. **Storage Rules 확인**
   - Storage는 데이터베이스와 무관하지만, Rules가 올바르게 배포되었는지 확인

5. **Hosting 설정 확인**
   - Hosting은 데이터베이스와 무관하지만, 설정이 올바른지 확인

---

## 수정 필요 코드

### 1. services/firebaseService.js 수정

```javascript
// 수정 전
import {
  getFirestore,
  // ...
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ...

db = getFirestore(app);

// 수정 후
import {
  getFirestore,
  connectFirestoreEmulator,
  // ...
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// ...

db = getFirestore(app, "dysapp");

// Connect to emulators in development
if (window.location.hostname === "localhost") {
  console.log("[Firebase] Connecting to emulators...");
  connectFunctionsEmulator(functions, "localhost", 5001);
  connectFirestoreEmulator(db, "localhost", 8080);
}
```

---

## 테스트 체크리스트

수정 후 다음 테스트를 수행하세요:

### 1. 프론트엔드-백엔드 데이터 일치 확인
- [ ] 프론트엔드에서 데이터 저장
- [ ] Firebase Console > Firestore Database > `dysapp`에서 데이터 확인
- [ ] 백엔드 Functions에서 동일한 데이터 읽기 확인

### 2. 로컬 개발 환경 테스트
- [ ] `firebase emulators:start` 실행
- [ ] 브라우저에서 `localhost:5000` 접속
- [ ] Firestore 에뮬레이터에 데이터 저장 확인
- [ ] 프로덕션 Firestore에 데이터가 저장되지 않는지 확인

### 3. 프로덕션 환경 테스트
- [ ] 실제 배포된 앱에서 데이터 저장
- [ ] Firebase Console > Firestore Database > `dysapp`에서 데이터 확인
- [ ] 백엔드 Functions에서 데이터 읽기 확인

---

## 참고 사항

### Firebase Client SDK 다중 데이터베이스 지원
- Firebase JavaScript SDK v9+ (modular SDK)에서 `getFirestore(app, "dysapp")` 지원
- 현재 사용 중인 SDK 버전: `12.6.0` (확인 필요)

### Firebase Emulator Suite 다중 데이터베이스 지원
- Firebase Emulator Suite가 다중 데이터베이스를 지원하는지 확인 필요
- 에뮬레이터 설정에서 데이터베이스 지정 가능 여부 확인 필요

---

## 요약

### 발견된 위험 요소

1. 🔴 **프론트엔드 Firestore 초기화** - 데이터베이스 미지정 (가장 중요)
2. 🟡 **Firestore 에뮬레이터 연결** - 에뮬레이터 미연결
3. 🟡 **에뮬레이터 설정** - 데이터베이스 미지정

### 조치 우선순위

1. **즉시**: 프론트엔드 Firestore 초기화 수정
2. **권장**: 에뮬레이터 연결 코드 추가
3. **확인**: 에뮬레이터 설정 확인

---

**상태**: 위험 요소 식별 완료  
**다음 단계**: 프론트엔드 Firestore 초기화 코드 수정
