# dysapp FRD (Functional Requirements Document)

> **Version:** 1.0 (Created: 2025-01-27)
> **Status:** Initial Draft
> **Single Source of Truth:** `docs/postdocs/baseline_spec.md`
> **프로젝트명:** dysapp (Firebase Project ID: dysapp1210)

---

## 📌 0. 문서 정보

| 항목 | 내용 |
|------|------|
| **프로젝트명** | dysapp (Design Intelligence Support System) |
| **문서 유형** | Functional Requirements Document (FRD) |
| **관련 문서** | dysapp_PRD.md (제품 요구사항), dysapp_SRD.md (시스템 요구사항), dysapp_TSD.md (기술 명세서) |
| **작성 목적** | PRD의 제품 요구사항을 기능 관점에서 상세화하고, 사용자 스토리, 사용 사례, 시나리오를 통한 기능 명세 제공 |

---

## 🎯 1. 개요 및 목적

### 1.1 문서 목적

본 FRD는 **dysapp**의 기능 요구사항을 상세하게 정의합니다. 이 문서는:

- PRD의 제품 요구사항을 기능 관점에서 상세화
- 사용자 스토리, 사용 사례, 시나리오를 통한 기능 명세
- 새 프론트엔드 파일 구조(`C:\dysapp\dys_prototype`) 기준 기능 매핑
- 순수 HTML/CSS/JavaScript 환경에 맞춘 기능 명세

### 1.2 문서 범위

**포함 범위**:
- 사용자 페르소나 및 역할 정의
- 기능별 사용자 스토리 및 수용 기준
- 기능별 사용 사례 (Use Cases)
- 상세 기능 명세 (입력/출력, 처리 로직, 비즈니스 규칙)
- 사용자 시나리오 (정상/예외/에지 케이스)
- UI/UX 요구사항
- 기능 간 상호작용 및 플로우
- 예외 상황 및 에러 처리 요구사항
- 성능 및 사용성 요구사항

**제외 범위**:
- 기술적 구현 상세 (TSD에서 다룸)
- 시스템 아키텍처 (SRD에서 다룸)
- 비즈니스 전략 및 목표 (PRD에서 다룸)

### 1.3 인프라 정보

- **Storage Bucket**: `gs://dysapp1210.firebasestorage.app`
- **Storage 리전**: `asia-northeast3` (서울)
- **Firestore 데이터베이스 ID**: `dysapp`
- **Firestore 리전**: `nam5` (예외)
- **Authentication**: 익명 인증 활성화 (v1)
- **Cloud Functions 리전**: `asia-northeast3`

---

## 👥 2. 사용자 역할 및 페르소나

### 2.1 사용자 역할 정의

#### 2.1.1 일반 사용자 (Regular User)

**역할**: 기본 기능을 사용하는 디자이너

**권한**:
- 이미지 업로드 및 분석
- 검색 기능 사용
- 개인 프로필 관리
- 기본 설정 관리

**특징**:
- 무료 플랜 사용자
- 기본 분석 기능 사용
- 제한된 저장 공간

#### 2.1.2 프리미엄 사용자 (Premium User)

**역할**: 고급 기능을 사용하는 디자이너

**권한**:
- 모든 일반 사용자 권한
- 고급 분석 기능 사용
- 무제한 저장 공간
- 우선 지원

**특징**:
- 유료 플랜 사용자
- 고급 분석 및 리포트 기능 사용
- 우선 처리

### 2.2 사용자 페르소나

#### 페르소나 1: 초보 디자이너 "김디자인"

**기본 정보**:
- 이름: 김디자인
- 나이: 22세
- 직업: 디자인 전공 대학생 (3학년)
- 경력: 1년 미만

**목표**:
- 포트폴리오 품질 향상
- 객관적인 피드백을 통한 성장
- 디자인 스타일 정립

**페인 포인트**:
- 주관적인 평가에 대한 불만
- 개선 방향을 모르는 상황
- 참고 자료 찾기의 어려움

**사용 패턴**:
- 주 2-3회 포트폴리오 업로드
- 분석 결과를 바탕으로 개선
- 검색 기능을 통한 참고 자료 수집

**기술 수준**:
- 디자인 도구 사용 능숙
- 온라인 서비스 사용 경험 많음
- AI 도구 사용 경험 적음

#### 페르소나 2: 주니어 디자이너 "이포트폴리오"

**기본 정보**:
- 이름: 이포트폴리오
- 나이: 25세
- 직업: 주니어 그래픽 디자이너
- 경력: 2년

**목표**:
- 포트폴리오 다양성 확보
- 시장 트렌드 파악
- 전문성 강화

**페인 포인트**:
- 시간 부족으로 인한 분석 어려움
- 트렌드 파악의 어려움
- 성장 추적의 어려움

**사용 패턴**:
- 주 1-2회 포트폴리오 업로드
- 주기적 성장 리포트 확인
- 트렌드 분석 기능 활용

**기술 수준**:
- 디자인 도구 전문가
- 온라인 서비스 활용 능숙
- 데이터 분석에 관심 많음

#### 페르소나 3: 취업 준비생 "박성장"

**기본 정보**:
- 이름: 박성장
- 나이: 23세
- 직업: 디자인 전공 대학생 (4학년, 취업 준비 중)
- 경력: 인턴십 경험

**목표**:
- 취업용 포트폴리오 완성
- 객관적 평가 자료 확보
- 면접 준비 자료 수집

**페인 포인트**:
- 포트폴리오 평가 기준 불명확
- 개선점 파악 어려움
- 경쟁력 있는 포트폴리오 제작 필요

**사용 패턴**:
- 매일 포트폴리오 업로드 및 분석
- 분석 결과를 바탕으로 빠른 개선
- 검색 기능을 통한 레퍼런스 수집

**기술 수준**:
- 디자인 도구 능숙
- 온라인 서비스 적극 활용
- 빠른 학습 능력

---

## 📋 목차

1. [기능 1: 업로드 및 분석 (index.html → analyze.html)](#3-기능-1-업로드-및-분석-indexhtml--analyzehtml)
2. [기능 2: 검색 (searchTab.html → filter.html)](#4-기능-2-검색-searchtabhtml--filterhtml)
3. [기능 3: 마이페이지 (mypage.html)](#5-기능-3-마이페이지-mypagehtml)
4. [기능 4: AI 멘토 채팅 (analyze.html)](#6-기능-4-ai-멘토-채팅-analyzehtml)
5. [기능 간 상호작용 및 플로우](#7-기능-간-상호작용-및-플로우)
6. [예외 상황 및 에러 처리](#8-예외-상황-및-에러-처리)
7. [성능 및 사용성 요구사항](#9-성능-및-사용성-요구사항)

---

## 3. 기능 1: 업로드 및 분석 (index.html → analyze.html)

**PRD 참조**: Section 6.1  
**사용자 여정**: 이미지 업로드 → 분석 실행 → 결과 확인

### 3.1 개요

사용자가 포트폴리오 이미지를 업로드하고, AI 기반 분석을 통해 디자인 스타일을 객관적으로 평가받는 기능입니다.

**주요 기능**:
- 이미지 업로드 (드래그 앤 드롭, 파일 선택)
- AI 기반 분석 실행 (analyzeDesign Cloud Function)
- 분석 결과 표시 (3-Layer 메트릭, AI 요약, 색상 팔레트, 연관 키워드 등)
- 디자인 법칙 기반 평가

**프론트엔드 파일**:
- `index.html`: 업로드 페이지
- `analyze.html`: 분석 결과 페이지

**백엔드 API**:
- `analyzeDesign`: 이미지 분석 및 3-Layer 평가
- `getAnalysis`: 분석 결과 조회

### 3.2 사용자 스토리

#### FR-001: 이미지 업로드 및 분석

**스토리**:
> As a 디자이너, I want to upload my portfolio image and get AI-based analysis, so that I can understand my design strengths and weaknesses objectively.

**수용 기준**:
- [ ] 사용자는 `index.html`에서 이미지 파일을 업로드할 수 있어야 함
- [ ] 드래그 앤 드롭 또는 파일 선택 버튼을 통해 업로드 가능해야 함
- [ ] 지원 파일 형식: JPEG, PNG (최대 5MB)
- [ ] 업로드 시 `analyzeDesign` Cloud Function 호출
- [ ] 분석 완료 후 `analyze.html`로 리다이렉트 (analysisId 파라미터 포함)
- [ ] `analyze.html`에서 3-Layer 분석 결과 표시

**우선순위**: P0 (Critical)  
**구현 상태**: ⚠️ API 미연동 (연동 필요)

#### FR-002: 분석 결과 표시 (3-Layer 구조)

**스토리**:
> As a 디자이너, I want to see detailed analysis results with 3-Layer metrics, so that I can understand my design from multiple perspectives.

**수용 기준**:
- [ ] `analyze.html`에서 URL 파라미터 또는 localStorage에서 analysisId 읽기
- [ ] `getAnalysis` API 호출하여 분석 결과 조회
- [ ] `dataAdapter.js`로 데이터 변환 (Firestore → 프론트엔드 형식)
- [ ] Layer 1: Performance & Information (50%) 표시
- [ ] Layer 2: Form & Aesthetic (30%) 표시
- [ ] Layer 3: Communicative Impact (20%) 표시
- [ ] 색상 팔레트, 키워드, 활용 제안 표시

**우선순위**: P0 (Critical)  
**구현 상태**: ⚠️ 데이터 구조 불일치 (하드코딩된 데이터 사용 중)

### 3.3 사용 사례 (Use Cases)

#### UC-1.1: 이미지 업로드 및 분석 실행

**액터**: 디자이너  
**전제 조건**: 사용자가 익명 인증 완료  
**기본 흐름**:
1. 사용자가 `index.html` 접속
2. 사용자가 이미지 파일 선택 (드래그 앤 드롭 또는 파일 선택)
3. 시스템이 파일을 base64로 변환
4. 시스템이 `analyzeDesign` Cloud Function 호출
   - Firebase Storage에 이미지 업로드
   - Gemini Vision API로 3-Layer 분석 수행
   - multimodalembedding@001로 이미지 임베딩 생성
   - Firestore에 AnalysisDocument 저장
5. 시스템이 analysisId를 localStorage에 저장
6. 시스템이 `analyze.html`로 리다이렉트 (analysisId 파라미터 포함)

**대안 흐름**:
- 3a. 파일 형식이 지원되지 않는 경우
  - 3a.1. 시스템이 에러 메시지 표시
  - 3a.2. 사용 사례 종료
- 3b. 파일 크기가 5MB를 초과하는 경우
  - 3b.1. 시스템이 에러 메시지 표시
  - 3b.2. 사용 사례 종료
- 4a. 분석 실패 시
  - 4a.1. 시스템이 에러 메시지 표시
  - 4a.2. 재시도 옵션 제공

**예외 흐름**:
- 네트워크 오류 발생 시 에러 메시지 표시 및 재시도 옵션 제공

**사후 조건**: 분석 결과가 Firestore에 저장되고 `analyze.html`에서 표시됨

#### UC-1.2: 분석 결과 확인

**액터**: 디자이너  
**전제 조건**: 분석이 완료되어 있음  
**기본 흐름**:
1. 사용자가 `analyze.html` 접속
2. 시스템이 URL 파라미터 또는 localStorage에서 analysisId 읽기
3. 시스템이 `getAnalysis` API 호출
4. 시스템이 `dataAdapter.js`로 데이터 변환
5. 시스템이 3-Layer 구조로 화면 렌더링:
   - Layer 1: Performance & Information (hierarchyScore, scanabilityScore, goalClarityScore, accessibility)
   - Layer 2: Form & Aesthetic (gridConsistency, visualBalance, colorHarmony, typographyQuality)
   - Layer 3: Communicative Impact (trustVibe, engagementPotential, emotionalTone)
6. 시스템이 색상 팔레트, 키워드, 활용 제안 표시

**대안 흐름**:
- 2a. analysisId가 없는 경우
  - 2a.1. 시스템이 에러 메시지 표시
  - 2a.2. `index.html`로 리다이렉트
- 3a. 분석 결과를 찾을 수 없는 경우
  - 3a.1. 시스템이 에러 메시지 표시
  - 3a.2. `index.html`로 리다이렉트

**예외 흐름**: 없음

**사후 조건**: 사용자가 분석 결과를 확인함

---

## 4. 기능 2: 검색 (searchTab.html → filter.html)

**PRD 참조**: Section 6.2  
**사용자 여정**: 검색 실행 → 필터 적용 → 결과 확인

### 4.1 개요

사용자가 텍스트 또는 이미지를 기반으로 유사 디자인을 검색하고, 필터를 적용하여 원하는 결과를 찾는 기능입니다.

**주요 기능**:
- 텍스트 검색 (Google Custom Search API)
- 이미지 기반 유사 디자인 검색 (Firestore Vector Search)
- 필터 옵션 적용 (포맷, fixScope, 점수 범위)
- 검색 결과 그리드 표시

**프론트엔드 파일**:
- `searchTab.html`: 검색 페이지
- `filter.html`: 필터 페이지

**백엔드 API**:
- `searchImages`: 텍스트 기반 이미지 검색
- `searchSimilar`: 이미지 기반 유사 디자인 검색

### 4.2 사용자 스토리

#### FR-003: 유사 디자인 검색

**스토리**:
> As a 디자이너, I want to search for similar designs using text or image, so that I can find references and inspiration.

**수용 기준**:
- [ ] 사용자는 `searchTab.html`에서 텍스트 검색 가능해야 함
- [ ] 사용자는 이미지 업로드를 통한 유사 디자인 검색 가능해야 함
- [ ] 텍스트 검색 시 `searchImages` API 호출
- [ ] 이미지 검색 시 `analyzeDesign` → `searchSimilar` API 호출
- [ ] 검색 결과를 그리드 형태로 표시
- [ ] 각 결과 항목에 썸네일, 유사도 점수, 포맷 표시

**우선순위**: P0 (Critical)  
**구현 상태**: ⚠️ API 미연동 (정적 이미지만 표시 중)

#### FR-004: 필터 적용

**스토리**:
> As a 디자이너, I want to apply filters to search results, so that I can narrow down to specific design types and quality levels.

**수용 기준**:
- [ ] 사용자는 `filter.html`에서 필터 옵션 선택 가능해야 함
- [ ] 필터 옵션: 포맷 (UX_UI, Editorial, Poster 등), fixScope (StructureRebuild, DetailTuning), 점수 범위
- [ ] 필터 적용 시 `searchSimilar` API 재호출
- [ ] 필터링된 결과 표시

**우선순위**: P1 (High)  
**구현 상태**: ⚠️ 미구현 (UI만 존재, 백엔드 연동 없음)

### 4.3 사용 사례 (Use Cases)

#### UC-2.1: 텍스트 기반 검색

**액터**: 디자이너  
**전제 조건**: 사용자가 `searchTab.html` 접속  
**기본 흐름**:
1. 사용자가 검색어 입력
2. 사용자가 검색 버튼 클릭
3. 시스템이 `searchImages` Cloud Function 호출
4. 시스템이 Google Custom Search API 호출
5. 시스템이 검색 결과 리스트 반환
6. 시스템이 결과를 그리드 형태로 표시

**대안 흐름**:
- 3a. 검색어가 비어있는 경우
  - 3a.1. 시스템이 에러 메시지 표시
  - 3a.2. 사용 사례 종료

**예외 흐름**:
- 네트워크 오류 발생 시 에러 메시지 표시 및 재시도 옵션 제공

**사후 조건**: 검색 결과가 표시됨

#### UC-2.2: 이미지 기반 유사 디자인 검색

**액터**: 디자이너  
**전제 조건**: 사용자가 `searchTab.html` 접속  
**기본 흐름**:
1. 사용자가 이미지 업로드 버튼 클릭
2. 사용자가 이미지 파일 선택
3. 시스템이 `analyzeDesign` Cloud Function 호출 (이미지 분석)
4. 시스템이 `searchSimilar` Cloud Function 호출 (Vector Search)
5. 시스템이 Firestore Vector Search 수행 (findNearest)
6. 시스템이 유사 디자인 리스트 반환
7. 시스템이 결과를 그리드 형태로 표시

**대안 흐름**:
- 3a. 이미지 분석 실패 시
  - 3a.1. 시스템이 에러 메시지 표시
  - 3a.2. 사용 사례 종료

**예외 흐름**:
- 네트워크 오류 발생 시 에러 메시지 표시 및 재시도 옵션 제공

**사후 조건**: 유사 디자인 검색 결과가 표시됨

#### UC-2.3: 필터 적용

**액터**: 디자이너  
**전제 조건**: 검색 결과가 표시되어 있음  
**기본 흐름**:
1. 사용자가 필터 버튼 클릭
2. 시스템이 `filter.html`로 이동
3. 사용자가 필터 옵션 선택:
   - 포맷 (UX_UI, Editorial, Poster 등)
   - fixScope (StructureRebuild, DetailTuning)
   - 점수 범위 (overallScore)
4. 사용자가 저장하기 버튼 클릭
5. 시스템이 `searchSimilar` API 재호출 (필터 파라미터 포함)
6. 시스템이 필터링된 결과 표시

**대안 흐름**:
- 3a. 필터 옵션을 선택하지 않은 경우
  - 3a.1. 시스템이 기본 검색 결과 유지
- 5a. 필터링된 결과가 없는 경우
  - 5a.1. 시스템이 "결과 없음" 메시지 표시

**예외 흐름**: 없음

**사후 조건**: 필터링된 검색 결과가 표시됨

---

## 5. 기능 3: 마이페이지 (mypage.html)

**PRD 참조**: Section 6.3  
**사용자 여정**: 프로필 확인 → 분석 히스토리 확인

### 5.1 개요

사용자가 자신의 프로필 정보와 분석 히스토리를 확인하고 관리하는 기능입니다.

**주요 기능**:
- 사용자 프로필 조회
- 분석 히스토리 목록 조회
- 분석 결과 상세 보기

**프론트엔드 파일**:
- `mypage.html`: 마이페이지 (현재 비어있음)

**백엔드 API**:
- `getUserProfile`: 사용자 프로필 조회
- `getAnalyses`: 사용자 분석 목록 조회

### 5.2 사용자 스토리

#### FR-005: 마이페이지 프로필 관리

**스토리**:
> As a 디자이너, I want to view my profile and analysis history, so that I can track my design progress over time.

**수용 기준**:
- [ ] 사용자는 `mypage.html`에서 프로필 정보 확인 가능해야 함
- [ ] `getUserProfile` API 호출하여 프로필 정보 조회
- [ ] `getAnalyses` API 호출하여 분석 히스토리 조회
- [ ] 분석 히스토리를 그리드/리스트 형태로 표시
- [ ] 각 분석 항목 클릭 시 `analyze.html`로 이동

**우선순위**: P1 (High)  
**구현 상태**: ⚠️ 비어있음 (전체 구현 필요)

### 5.3 사용 사례 (Use Cases)

#### UC-3.1: 프로필 및 분석 히스토리 확인

**액터**: 디자이너  
**전제 조건**: 사용자가 익명 인증 완료  
**기본 흐름**:
1. 사용자가 `mypage.html` 접속
2. 시스템이 `getUserProfile` API 호출
3. 시스템이 `getAnalyses` API 호출
4. 시스템이 프로필 정보 표시:
   - 프로필 이미지
   - 닉네임, 이메일
   - 구독 정보
5. 시스템이 분석 히스토리 표시:
   - 최근 분석 목록 (그리드/리스트 뷰)
   - 각 분석 항목:
     * 썸네일 이미지
     * 파일명
     * 분석 일시
     * 전체 점수 (overallScore)
     * fixScope 표시

**대안 흐름**:
- 2a. 프로필 정보가 없는 경우
  - 2a.1. 시스템이 기본 프로필 정보 표시
- 3a. 분석 히스토리가 없는 경우
  - 3a.1. 시스템이 "분석 내역이 없습니다" 메시지 표시

**예외 흐름**:
- 네트워크 오류 발생 시 에러 메시지 표시 및 재시도 옵션 제공

**사후 조건**: 사용자가 프로필 및 분석 히스토리를 확인함

---

## 6. 기능 4: AI 멘토 채팅 (analyze.html)

**PRD 참조**: Section 6.2  
**사용자 여정**: 분석 결과 확인 → 멘토 질문 → 답변 확인

### 6.1 개요

사용자가 분석 결과를 바탕으로 AI 멘토에게 질문하고, fixScope 기반 우선순위 조언을 받는 기능입니다.

**주요 기능**:
- 분석 컨텍스트 기반 AI 멘토링
- 대화 히스토리 저장
- fixScope 기반 우선순위 조언

**프론트엔드 파일**:
- `analyze.html`: 분석 결과 페이지 (하단 고정 채팅 영역)

**백엔드 API**:
- `chatWithMentor`: AI 멘토 채팅

### 6.2 사용자 스토리

#### FR-006: AI 멘토 채팅

**스토리**:
> As a 디자이너, I want to ask questions to AI mentor about my design analysis, so that I can get specific improvement suggestions.

**수용 기준**:
- [ ] 사용자는 `analyze.html`에서 멘토에게 질문 가능해야 함
- [ ] 분석 컨텍스트가 자동으로 로드되어야 함
- [ ] `chatWithMentor` API 호출하여 답변 생성
- [ ] 대화 히스토리가 Firestore에 저장되어야 함
- [ ] 답변은 fixScope 기반 우선순위 조언을 포함해야 함

**우선순위**: P1 (High)  
**구현 상태**: ⚠️ 미구현 (UI만 존재, 백엔드 연동 없음)

### 6.3 사용 사례 (Use Cases)

#### UC-4.1: AI 멘토 질문 및 답변

**액터**: 디자이너  
**전제 조건**: 분석 결과가 표시되어 있음  
**기본 흐름**:
1. 사용자가 `analyze.html`에서 채팅 입력창에 질문 입력
2. 사용자가 전송 버튼 클릭
3. 시스템이 `chatWithMentor` Cloud Function 호출:
   - 분석 컨텍스트 로드 (AnalysisDocument)
   - fixScope 기반 System Instruction 구성
   - Gemini 2.5 Flash로 답변 생성
4. 시스템이 답변을 채팅 영역에 표시
5. 시스템이 대화 히스토리를 Firestore에 저장

**대안 흐름**:
- 1a. 질문이 비어있는 경우
  - 1a.1. 시스템이 에러 메시지 표시
  - 1a.2. 사용 사례 종료
- 3a. 답변 생성 실패 시
  - 3a.1. 시스템이 에러 메시지 표시
  - 3a.2. 재시도 옵션 제공

**예외 흐름**:
- 네트워크 오류 발생 시 에러 메시지 표시 및 재시도 옵션 제공

**사후 조건**: 사용자가 AI 멘토의 답변을 확인함

---

## 7. 기능 간 상호작용 및 플로우

### 7.1 전체 플로우 다이어그램

```
[업로드 및 분석 플로우]
index.html
  ↓ (이미지 업로드)
analyzeDesign API
  ↓ (분석 완료)
analyze.html
  ↓ (결과 표시)
chatWithMentor API (선택사항)

[검색 플로우]
searchTab.html
  ↓ (텍스트 검색 또는 이미지 업로드)
searchImages API 또는 searchSimilar API
  ↓ (결과 표시)
filter.html
  ↓ (필터 적용)
searchSimilar API (재호출)

[마이페이지 플로우]
mypage.html
  ↓ (프로필 및 히스토리 조회)
getUserProfile API + getAnalyses API
  ↓ (결과 표시)
analyze.html (분석 항목 클릭 시)
```

### 7.2 데이터 흐름

```
[업로드]
이미지 파일 (base64)
  ↓
[분석]
analyzeDesign Cloud Function
  ↓
Gemini Vision API → DesignAnalysisResultLLM (snake_case)
  ↓
[변환]
llmToFirestore() → AnalysisDocument (camelCase)
  ↓
[저장]
Firestore analyses/{id}
  ↓
[임베딩]
multimodalembedding@001 → imageEmbedding[512]
  ↓
[검색]
Firestore Vector Search (findNearest)
```

---

## 8. 예외 상황 및 에러 처리

### 8.1 에러 타입 및 대응

| 에러 타입 | 원인 | 대응 |
|----------|------|------|
| `unauthenticated` | 인증 없음 | 익명 인증 자동 실행 |
| `not-found` | analysisId 없음 | `index.html`로 리다이렉트 |
| `permission-denied` | 타인의 분석 접근 | 권한 오류 메시지 표시 |
| `resource-exhausted` | API 할당량 초과 | 잠시 후 재시도 안내 |
| `internal` | 서버 오류 | 일반 오류 메시지 + 로깅 |
| `network-error` | 네트워크 오류 | 재시도 옵션 제공 |

### 8.2 사용자 친화적 에러 메시지

- **인증 오류**: "로그인이 필요합니다. 잠시 후 다시 시도해주세요."
- **분석 실패**: "분석 중 오류가 발생했습니다. 이미지를 다시 업로드해주세요."
- **검색 실패**: "검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
- **네트워크 오류**: "네트워크 연결을 확인해주세요."

---

## 9. 성능 및 사용성 요구사항

### 9.1 성능 요구사항

| 항목 | 요구사항 | 측정 방법 |
|------|----------|----------|
| **분석 응답 시간** | < 10초 | analyzeDesign API 호출부터 결과 반환까지 |
| **검색 응답 시간** | < 3초 | searchSimilar API 호출부터 결과 반환까지 |
| **페이지 로드 시간** | < 2초 | HTML 파일 로드부터 렌더링 완료까지 |
| **이미지 업로드 시간** | < 5초 (5MB 기준) | 파일 선택부터 Storage 업로드 완료까지 |

### 9.2 사용성 요구사항

- **접근성**: WCAG 2.1 AA 수준 준수
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원
- **브라우저 호환성**: Chrome, Firefox, Safari, Edge 최신 버전 지원
- **로딩 인디케이터**: 모든 비동기 작업에 로딩 상태 표시
- **에러 복구**: 사용자가 쉽게 재시도할 수 있는 UI 제공

### 9.3 비기능 요구사항

- **보안**: Firebase 인증 필수, Firestore 보안 규칙 적용
- **확장성**: 향후 사용자 증가에 대비한 아키텍처 설계
- **모니터링**: Cloud Functions 로깅 및 에러 추적
- **백업**: Firestore 데이터 정기 백업 (향후)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-27 | Initial FRD for dysapp project |

---

*Generated for dysapp project (Firebase Project ID: dysapp1210)*

