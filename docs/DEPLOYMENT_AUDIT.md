# 배포 인프라 현황 점검 보고서

**작성일**: 2025-01-27  
**프로젝트**: dysapp1210  
**점검 목적**: 회원가입 온보딩 기능 추가 전 현재 배포 상태 확인

---

## 1. Firebase 프로젝트 정보

- **프로젝트 ID**: dysapp1210
- **프로젝트 번호**: 702244172468
- **리전**: asia-northeast3 (서울)

---

## 2. Firestore 데이터베이스 현황

### 2.1 데이터베이스 ID
- **데이터베이스 ID**: dysapp
- **리전**: nam5 (예외)

### 2.2 컬렉션 구조 (코드베이스 기준)

#### users 컬렉션
- **현재 필드**: uid, email, displayName, photoURL, createdAt, updatedAt, preferences, subscriptionTier, analysisCount
- **추가 예정**: privacyConsent (PrivacyConsent 타입)

#### analyses 컬렉션
- **필드**: userId, fileName, imageUrl, formatPrediction, layer1Metrics, layer2Metrics, layer3Metrics, overallScore, fixScope, colorPalette, detectedKeywords, createdAt, updatedAt, lastAnalyzedAt, imageEmbedding, embeddingModel, embeddingDim, embeddingVersion, analysisVersion, isPublic, ocrText

#### chatSessions 컬렉션
- **필드**: userId, analysisId, createdAt, updatedAt, messageCount
- **서브컬렉션**: messages/{messageId}

#### bookmarks 컬렉션
- **필드**: userId, analysisId, collectionId, createdAt, note

#### collections 컬렉션
- **필드**: userId, name, description, createdAt, updatedAt, isPublic, itemCount

#### referenceDesigns 컬렉션
- **필드**: (읽기 전용, 관리자만 쓰기)

---

## 3. Firestore Rules 현황

### 3.1 현재 Rules 파일 (`firestore.rules`)

**Helper Functions**:
- `isAuthenticated()`: 인증 상태 확인
- `isOwner(userId)`: 문서 소유권 확인
- `isValidAnalysis()`: 분석 문서 구조 검증

**컬렉션별 규칙**:
- **analyses**: 인증된 사용자만 읽기, 본인 소유만 생성/수정/삭제
- **chatSessions**: 본인 소유만 읽기/쓰기
- **users**: 본인만 읽기/생성/수정, 삭제 불가
- **bookmarks**: 본인 소유만 읽기/쓰기
- **collections**: 본인 소유 또는 공개 문서만 읽기, 본인만 생성/수정/삭제
- **referenceDesigns**: 인증된 사용자만 읽기, 쓰기 불가

### 3.2 업데이트 필요 사항
- `users` 컬렉션에 `privacyConsent` 필드 접근 규칙 추가 (현재 규칙으로 충분하지만 검증 필요)

---

## 4. Firestore Indexes 현황

### 4.1 현재 Indexes (`firestore.indexes.json`)

**analyses 컬렉션 인덱스**:
1. userId (ASC) + createdAt (DESC)
2. userId (ASC) + formatPrediction (ASC) + createdAt (DESC)
3. userId (ASC) + fixScope (ASC) + createdAt (DESC)
4. formatPrediction (ASC) + overallScore (DESC)
5. fixScope (ASC) + overallScore (DESC)

**chatSessions 컬렉션 인덱스**:
- userId (ASC) + updatedAt (DESC)

**bookmarks 컬렉션 인덱스**:
- userId (ASC) + createdAt (DESC)

### 4.2 추가 필요 인덱스
- **users 컬렉션**: privacyConsent 관련 쿼리 필요 시 추가 (현재는 단일 문서 조회만 하므로 불필요)

---

## 5. Storage Rules 현황

### 5.1 현재 Rules 파일 (`storage.rules`)

**경로별 규칙**:
- `/design-uploads/{userId}/{fileName}`: 인증된 사용자만 읽기, 본인만 쓰기 (10MB 제한, image/* 타입만)
- `/reference-designs/{allPaths=**}`: 인증된 사용자만 읽기, 쓰기 불가
- 기타 경로: 모두 거부

### 5.2 업데이트 필요 사항
- 사용자 프로필 이미지 업로드 경로 추가 고려 (현재는 불필요)

---

## 6. Cloud Functions 현황

### 6.1 현재 배포된 Functions (코드베이스 기준)

**Analysis Functions**:
- `analyzeDesign`: 디자인 분석 (300초 타임아웃, 512MiB)

**Chat Functions**:
- `chatWithMentor`: AI 멘토 챗봇 (120초 타임아웃, 256MiB)

**Search Functions**:
- `searchSimilar`: 유사 디자인 검색 (60초 타임아웃, 256MiB)
- `searchText`: 텍스트 기반 검색 (60초 타임아웃)
- `customSearch`: GCP Custom Search API (512MiB)
- `saveItem`: 북마크 저장
- `getBookmarks`: 북마크 조회
- `deleteBookmark`: 북마크 삭제

**User Profile Functions**:
- `getUserProfile`: 사용자 프로필 조회 (60초 타임아웃)
- `updateUserProfile`: 사용자 프로필 수정 (60초 타임아웃)
- `getAnalyses`: 분석 이력 조회 (60초 타임아웃)
- `getAnalysis`: 단일 분석 조회 (60초 타임아웃)
- `deleteAnalysis`: 분석 삭제 (60초 타임아웃)

**Utility Functions**:
- `healthCheck`: 헬스 체크

### 6.2 추가 예정 Functions
- `registerUser`: 회원가입 처리 (신규)

---

## 7. Authentication 현황

### 7.1 현재 활성화된 인증 방식
- **익명 인증 (Anonymous)**: 활성화됨 (코드 확인)

### 7.2 추가 예정 인증 방식
- **이메일/비밀번호 인증**: 활성화 필요 (Firebase Console에서 수동 설정)

---

## 8. Hosting 현황

### 8.1 현재 설정 (`firebase.json`)
- **Public 디렉토리**: `.` (루트)
- **Rewrites**: 모든 경로 → `/index.html`
- **Ignore**: firebase.json, **/.*, **/node_modules/**, functions/**, docs/**, *.md

---

## 9. 확인 필요 사항

### 9.1 Firebase Console에서 수동 확인 필요
1. **Authentication**:
   - [ ] 이메일/비밀번호 인증 활성화 여부 확인
   - [ ] 익명 인증 활성화 여부 확인

2. **Firestore**:
   - [ ] 프로덕션 데이터베이스에 실제 데이터 구조 확인
   - [ ] 기존 사용자 문서에 privacyConsent 필드 존재 여부 확인

3. **Storage**:
   - [ ] 버킷 설정 확인
   - [ ] Uniform Bucket-Level Access 활성화 여부 확인

4. **Functions**:
   - [ ] 배포된 Functions 목록 확인 (`firebase functions:list`)
   - [ ] Functions 로그 확인 (`firebase functions:log`)

---

## 10. 배포 전 체크리스트

### 10.1 코드베이스 준비
- [x] 타입 정의 (Phase 1)
- [ ] Firestore Rules 업데이트 (Phase 2)
- [ ] Firestore Indexes 확인 (Phase 2)
- [ ] 프론트엔드 UI 구현 (Phase 3)
- [ ] 프론트엔드 로직 구현 (Phase 4)
- [ ] 백엔드 Functions 구현 (Phase 5)
- [ ] 데이터 어댑터 업데이트 (Phase 6)

### 10.2 Firebase Console 설정
- [ ] 이메일/비밀번호 인증 활성화
- [ ] Firestore Rules 배포 테스트
- [ ] Firestore Indexes 배포 테스트

### 10.3 배포 순서
1. Firestore Rules 배포
2. Firestore Indexes 배포 (필요 시)
3. Cloud Functions 배포
4. Hosting 배포

---

## 11. 확인 명령어

```bash
# Firebase 프로젝트 확인
firebase projects:list

# Firestore Rules 확인
firebase firestore:rules:get

# Firestore Indexes 확인
firebase firestore:indexes:get

# Functions 목록 확인
firebase functions:list

# Functions 로그 확인
firebase functions:log

# Storage Rules 확인
firebase storage:rules:get
```

---

## 12. 다음 단계

1. **Phase 1**: 타입/스키마 정의 완료 후 이 문서 업데이트
2. **Phase 2**: Rules/Indexes 업데이트 후 배포 테스트
3. **Phase 3-6**: 구현 완료 후 통합 테스트
4. **Phase 7**: 배포 후 프로덕션 검증

---

**참고**: 이 문서는 코드베이스 분석을 기반으로 작성되었습니다. 실제 배포 상태는 Firebase Console에서 확인해야 합니다.
