# 배포 전 최종 검토 체크리스트

**작성일**: 2025-01-27  
**프로젝트**: dysapp1210  
**기능**: 회원가입 온보딩 + 개인정보처리방침 동의

---

## 1. 코드 검증 완료 ✅

### 1.1 TypeScript 빌드
- [x] `functions` 디렉토리 빌드 성공
- [x] 컴파일 오류 없음
- [x] 타입 정의 정확성 확인

### 1.2 Firestore Rules 검증
- [x] Rules 문법 검증 완료 (`firebase deploy --dry-run`)
- [x] `privacyConsent` 필드 검증 규칙 추가됨
- [x] 경고 해결 (unused function 주석 처리)

### 1.3 코드 일관성
- [x] 모든 import 경로 정확성 확인
- [x] 함수 export 정확성 확인
- [x] 타입 정의 일관성 확인

---

## 2. Firebase Console 설정 확인 필요 ⚠️

### 2.1 Authentication 설정
- [ ] **이메일/비밀번호 인증 활성화** (필수)
  - Firebase Console > Authentication > Sign-in method
  - Email/Password > Enable
  - 이메일 링크(비밀번호 없이 로그인)는 비활성화 가능

- [ ] **익명 인증 활성화 확인**
  - Firebase Console > Authentication > Sign-in method
  - Anonymous > Enable 상태 확인

### 2.2 Firestore 데이터베이스 확인
- [ ] 데이터베이스 ID: `dysapp` 확인
- [ ] 리전: `nam5` 확인
- [ ] 기존 사용자 데이터 백업 고려 (선택사항)

### 2.3 Storage 설정 확인
- [ ] 버킷: `dysapp1210.firebasestorage.app` 확인
- [ ] Uniform Bucket-Level Access 활성화 확인

---

## 3. 배포 순서 및 명령어

### 3.1 배포 전 준비
```bash
# 1. 현재 디렉토리 확인
cd C:\dys_prototype

# 2. Firebase 프로젝트 확인
firebase projects:list
# dysapp1210 (current) 확인

# 3. Functions 빌드 확인
cd functions
npm run build
cd ..
```

### 3.2 배포 순서 (중요!)

**순서대로 실행해야 합니다:**

```bash
# 1. Firestore Rules 배포
firebase deploy --only firestore:rules

# 2. Firestore Indexes 배포 (변경사항 없으면 스킵 가능)
firebase deploy --only firestore:indexes

# 3. Cloud Functions 배포
firebase deploy --only functions

# 4. Hosting 배포 (선택사항)
firebase deploy --only hosting

# 또는 전체 배포 (권장하지 않음 - 단계별 확인 필요)
firebase deploy
```

---

## 4. 배포 후 검증 항목

### 4.1 Functions 배포 확인
```bash
# Functions 목록 확인
firebase functions:list

# registerUser 함수가 목록에 있는지 확인
# 예상 출력에 registerUser 포함 확인
```

### 4.2 Firestore Rules 배포 확인
- Firebase Console > Firestore Database > Rules
- `privacyConsent` 검증 규칙이 반영되었는지 확인

### 4.3 기능 테스트

#### 테스트 1: 신규 회원가입
1. 브라우저 시크릿 모드에서 앱 접속
2. 익명 인증 자동 완료 확인
3. 회원가입 모달 자동 표시 확인
4. 이메일/비밀번호 입력
5. 개인정보처리방침 동의 체크
6. 회원가입 완료 확인
7. Firestore Console에서 `users/{uid}` 문서 확인
   - `email` 필드 존재 확인
   - `privacyConsent` 필드 존재 및 구조 확인
   - `privacyConsent.consented = true` 확인
   - `privacyConsent.version = "2026.01.13"` 확인

#### 테스트 2: 익명 계정 업그레이드
1. 기존 익명 사용자로 로그인
2. 회원가입 모달 열기
3. 이메일/비밀번호 입력 및 동의
4. 기존 UID 유지 확인
5. 기존 분석 데이터 유지 확인
6. Firestore에서 `users/{uid}` 문서 업데이트 확인

#### 테스트 3: 로그인
1. 로그인 모달 열기
2. 이메일/비밀번호 입력
3. 로그인 성공 확인
4. 프로필 정보 로드 확인

#### 테스트 4: 마이페이지 동의 배지
1. 회원가입 완료 후 마이페이지 접속
2. 개인정보 동의 배지 표시 확인
3. 배지에 체크 아이콘 및 "개인정보 동의 완료" 텍스트 확인

---

## 5. 알려진 이슈 및 주의사항

### 5.1 해결된 이슈
- ✅ Firestore Rules의 `privacyConsent` 검증 로직 수정 (`agreedAt`은 서버에서 설정되므로 Rules에서 검증 제외)
- ✅ Functions의 IP 주소 접근 제거 (callable functions에서는 사용 불가)
- ✅ TypeScript 빌드 오류 없음

### 5.2 주의사항
1. **이메일/비밀번호 인증 활성화 필수**: 배포 전 반드시 Firebase Console에서 활성화해야 합니다.
2. **개인정보처리방침 버전 관리**: 약관 변경 시 `functions/src/constants.ts`의 `PRIVACY_POLICY_VERSION` 업데이트 필요
3. **익명 계정 업그레이드**: 기존 익명 사용자의 데이터는 UID가 동일하므로 유지됩니다.
4. **온보딩 모달**: 익명 사용자에게만 자동 표시되며, `localStorage`의 `onboardingShown` 플래그로 제어됩니다.

---

## 6. 롤백 계획

### 6.1 문제 발생 시 롤백 방법

#### Functions 롤백
```bash
# 이전 버전으로 롤백
firebase functions:config:get
# 또는 Firebase Console > Functions > 이전 버전 선택
```

#### Firestore Rules 롤백
```bash
# 이전 Rules로 복원
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

### 6.2 데이터 마이그레이션
- 기존 사용자 데이터는 영향 없음 (기존 필드 유지)
- `privacyConsent` 필드는 선택사항이므로 기존 사용자에게는 없을 수 있음

---

## 7. 모니터링 및 로그 확인

### 7.1 Functions 로그 확인
```bash
# 전체 Functions 로그
firebase functions:log

# registerUser 함수만 확인
firebase functions:log --only registerUser

# 실시간 로그 스트리밍
firebase functions:log --follow
```

### 7.2 Firestore 사용량 모니터링
- Firebase Console > Firestore > Usage 탭
- 읽기/쓰기 작업 수 확인

### 7.3 Authentication 사용량 모니터링
- Firebase Console > Authentication > Users
- 이메일/비밀번호 사용자 수 확인
- 익명 사용자 수 확인

---

## 8. 최종 확인 사항

### 배포 전 필수 확인
- [ ] Firebase Console에서 이메일/비밀번호 인증 활성화
- [ ] TypeScript 빌드 성공 확인
- [ ] Firestore Rules dry-run 성공 확인
- [ ] 모든 파일이 저장되었는지 확인
- [ ] Git 커밋 완료 (선택사항)

### 배포 후 필수 확인
- [ ] `registerUser` 함수가 Functions 목록에 표시되는지 확인
- [ ] Firestore Rules가 업데이트되었는지 확인
- [ ] 실제 회원가입 플로우 테스트 성공
- [ ] Firestore에 `privacyConsent` 필드 저장 확인
- [ ] 마이페이지 동의 배지 표시 확인

---

## 9. 배포 완료 후 작업

1. **문서 업데이트**
   - `docs/DEPLOYMENT_AUDIT.md` 업데이트
   - 배포 일시 및 버전 기록

2. **팀 공지**
   - 회원가입 기능 활성화 공지
   - 테스트 요청

3. **모니터링**
   - 첫 주 동안 로그 모니터링
   - 에러 발생 시 즉시 대응

---

**검토 완료일**: 2025-01-27  
**배포 준비 상태**: ✅ 준비 완료  
**다음 단계**: Firebase Console 설정 후 배포 실행
