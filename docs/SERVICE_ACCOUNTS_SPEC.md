# GCP 서비스 계정 명세서

**프로젝트**: dysapp1210  
**작성일**: 2025-12-16  
**버전**: 1.0

---

## 📋 개요

이 문서는 dysapp 프로젝트에서 사용하는 GCP 서비스 계정의 명세를 정의합니다. 코드베이스 분석을 기반으로 필요한 서비스 계정과 각 계정에 부여할 IAM 역할을 명시합니다.

---

## 🔍 코드베이스 분석 결과

### 사용 중인 GCP 서비스

1. **Cloud Firestore**
   - 데이터베이스: `dysapp`
   - 컬렉션: `analyses`, `chatSessions`, `users`, `bookmarks`, `collections`, `referenceDesigns`
   - 벡터 검색 기능 사용

2. **Cloud Storage**
   - 버킷: `dysapp1210.firebasestorage.app`
   - 경로: `design-uploads/{userId}/`, `thumbnails/{userId}/`, `profiles/{userId}/`

3. **Vertex AI**
   - 모델: `multimodalembedding@001`
   - 리전: `us-central1`
   - 용도: 이미지 임베딩 생성

4. **Generative AI (Gemini)**
   - 모델: `gemini-2.0-flash`
   - 용도: 이미지 분석, 채팅

5. **Secret Manager**
   - Secret: `google-ai-api-key`
   - 용도: API 키 저장 및 접근

---

## 🎯 서비스 계정 설계

### 1. Cloud Functions 기본 서비스 계정

**계정명**: `dysapp1210@appspot.gserviceaccount.com`  
**타입**: 기본 서비스 계정 (자동 생성됨)  
**용도**: Cloud Functions 실행 시 사용되는 기본 계정

**필요한 IAM 역할**:

| 역할 | 용도 | 필수 여부 |
|------|------|----------|
| `roles/firestore.user` | Firestore 읽기/쓰기 | ✅ 필수 |
| `roles/storage.objectAdmin` | Cloud Storage 파일 업로드/다운로드 | ✅ 필수 |
| `roles/aiplatform.user` | Vertex AI 사용 (multimodalembedding) | ✅ 필수 |
| `roles/secretmanager.secretAccessor` | Secret Manager에서 API 키 읽기 | ✅ 필수 |
| `roles/logging.logWriter` | Cloud Logging에 로그 작성 | ✅ 권장 |
| `roles/monitoring.metricWriter` | Cloud Monitoring 메트릭 작성 | ✅ 권장 |

**현재 상태**: 
- ✅ 이미 존재 (Firebase 프로젝트 생성 시 자동 생성)
- ⚠️ 권한 부여 필요

---

### 2. Vertex AI 전용 서비스 계정

**계정명**: `vertex-ai-service@dysapp1210.iam.gserviceaccount.com`  
**타입**: 사용자 정의 서비스 계정  
**용도**: Vertex AI 서비스 전용 접근 (보안 강화)

**필요한 IAM 역할**:

| 역할 | 용도 | 필수 여부 |
|------|------|----------|
| `roles/aiplatform.user` | Vertex AI API 사용 | ✅ 필수 |
| `roles/serviceusage.serviceUsageConsumer` | Vertex AI API 사용량 소비 | ✅ 필수 |

**생성 필요 여부**: 
- ⚠️ 선택적 (기본 서비스 계정으로도 가능하지만 보안 강화를 위해 권장)

---

### 3. CI/CD 배포용 서비스 계정

**계정명**: `cicd-deploy@dysapp1210.iam.gserviceaccount.com`  
**타입**: 사용자 정의 서비스 계정  
**용도**: Cloud Build 및 배포 파이프라인에서 사용

**필요한 IAM 역할**:

| 역할 | 용도 | 필수 여부 |
|------|------|----------|
| `roles/cloudfunctions.developer` | Cloud Functions 배포 | ✅ 필수 |
| `roles/firebase.rulesAdmin` | Firestore/Storage 규칙 배포 | ✅ 필수 |
| `roles/storage.admin` | Storage 규칙 및 파일 관리 | ✅ 필수 |
| `roles/iam.serviceAccountUser` | Cloud Functions 서비스 계정 사용 | ✅ 필수 |
| `roles/cloudbuild.builds.editor` | Cloud Build 작업 실행 | ✅ 필수 |
| `roles/logging.logWriter` | 배포 로그 작성 | ✅ 권장 |

**생성 필요 여부**: 
- ⚠️ 선택적 (로컬 배포 시 불필요, CI/CD 파이프라인 구축 시 필요)

---

## 📊 서비스 계정 요약

| 서비스 계정 | 상태 | 생성 필요 | 우선순위 |
|------------|------|----------|---------|
| `dysapp1210@appspot.gserviceaccount.com` | ✅ 존재 | ❌ 불필요 | 🔴 Critical |
| `vertex-ai-service@dysapp1210.iam.gserviceaccount.com` | ❌ 없음 | ✅ 필요 | 🟡 Optional |
| `cicd-deploy@dysapp1210.iam.gserviceaccount.com` | ❌ 없음 | ⚠️ 선택 | 🟢 Future |

---

## 🔐 권한 부여 전략

### 최소 권한 원칙 (Principle of Least Privilege)

각 서비스 계정은 필요한 최소한의 권한만 부여합니다.

### 역할 기반 접근 제어 (RBAC)

- 사전 정의된 역할 사용 (커스텀 역할 지양)
- 역할은 기능별로 그룹화하여 관리

### 권한 분리

- 실행 계정과 배포 계정 분리
- Vertex AI 전용 계정으로 AI 서비스 접근 격리

---

## 📝 구현 계획

### Phase 1: 기본 서비스 계정 권한 설정 (필수)

1. ✅ Cloud Functions 기본 서비스 계정 확인
2. ⚠️ 필요한 IAM 역할 부여
3. ✅ Secret Manager 접근 권한 확인 및 부여

### Phase 2: Vertex AI 전용 계정 생성 (권장)

1. ⚠️ Vertex AI 전용 서비스 계정 생성
2. ⚠️ 필요한 IAM 역할 부여
3. ⚠️ Cloud Functions에서 사용하도록 설정 (선택적)

### Phase 3: CI/CD 계정 생성 (선택)

1. ⚠️ CI/CD 배포용 서비스 계정 생성
2. ⚠️ 필요한 IAM 역할 부여
3. ⚠️ Cloud Build에서 사용하도록 설정

---

## ⚠️ 주의사항

1. **기본 서비스 계정**: Firebase 프로젝트 생성 시 자동 생성되므로 새로 만들 필요 없음
2. **권한 부여**: 기본 서비스 계정에 필요한 권한만 부여하면 대부분의 기능이 동작함
3. **Secret Manager**: 이미 `roles/secretmanager.secretAccessor` 권한이 부여되어 있음 (이전 작업에서 완료)
4. **Vertex AI**: 기본 서비스 계정으로도 사용 가능하지만, 전용 계정 사용 시 보안 강화 가능

---

## 🔗 참고 문서

- [GCP IAM 역할 참조](https://cloud.google.com/iam/docs/understanding-roles)
- [Firebase 서비스 계정](https://firebase.google.com/docs/projects/iam/service-accounts)
- [Vertex AI 인증](https://cloud.google.com/vertex-ai/docs/authentication)
- [Secret Manager 접근 제어](https://cloud.google.com/secret-manager/docs/access-control)



