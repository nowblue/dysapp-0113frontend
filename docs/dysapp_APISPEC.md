# dysapp APISPEC (API Specification Document)

> **Version:** 1.0 (Created: 2025-01-27)
> **Status:** Initial Draft
> **Single Source of Truth:** `docs/postdocs/baseline_spec.md`
> **프로젝트명:** dysapp (Firebase Project ID: dysapp1210)

---

## 📌 0. 문서 정보

| 항목 | 내용 |
|------|------|
| **프로젝트명** | dysapp (Design Intelligence Support System) |
| **문서 유형** | API Specification Document (APISPEC) |
| **관련 문서** | dysapp_PRD.md, dysapp_FRD.md, dysapp_TSD.md, dysapp_SRD.md |
| **작성 목적** | Cloud Functions API 엔드포인트, Gemini API 통합, 요청/응답 형식을 정의하여 API 사용 가이드 제공 |

---

## 🎯 1. 개요 및 목적

### 1.1 문서 목적

본 APISPEC은 **dysapp**의 API 명세를 정의합니다. 이 문서는:

- Cloud Functions API 엔드포인트 상세 명세
- Gemini API 통합 방법
- 요청/응답 스키마 정의
- 에러 응답 형식 정의

### 1.2 API 기본 정보

- **Base URL**: Firebase Cloud Functions (asia-northeast3 리전)
- **인증**: Firebase Authentication (익명 인증)
- **프로토콜**: HTTPS
- **데이터 형식**: JSON

---

## 📋 목차

1. [Cloud Functions API 엔드포인트](#1-cloud-functions-api-엔드포인트)
2. [Gemini API 통합](#2-gemini-api-통합)
3. [요청/응답 형식](#3-요청응답-형식)
4. [에러 처리](#4-에러-처리)
5. [BigQuery 쿼리 (향후)](#5-bigquery-쿼리-향후)

---

## 1. Cloud Functions API 엔드포인트

### 1.1 analyzeDesign

**목적**: 이미지 분석 및 3-Layer 평가

**엔드포인트**: `analyzeDesign`

**리전**: `asia-northeast3`

**타임아웃**: 300초

**메모리**: 512MB

**요청 스키마**:
```typescript
{
  imageData: string;      // base64 인코딩된 이미지 데이터
  mimeType: string;      // "image/jpeg" 또는 "image/png"
  fileName?: string;     // 파일명 (선택사항)
}
```

**응답 스키마**:
```typescript
{
  success: boolean;
  analysisId: string;
  imageUrl: string;
  formatPrediction: "UX_UI" | "Editorial" | "Poster" | "Thumbnail" | "Card" | "BI_CI" | "Unknown";
  overallScore: number;  // 0-100
  fixScope: "StructureRebuild" | "DetailTuning";
  layer1Metrics: {
    hierarchyScore: number;
    scanabilityScore: number;
    goalClarityScore: number;
    accessibility: {
      lowContrast: boolean;
      tinyText: boolean;
      cluttered: boolean;
    };
    diagnosisSummary: string;
  };
  layer2Metrics: {
    gridConsistency: number;
    visualBalance: number;
    colorHarmony: number;
    typographyQuality: number;
  };
  layer3Metrics: {
    trustVibe: "High" | "Medium" | "Low";
    engagementPotential: "High" | "Medium" | "Low";
    emotionalTone: "Calm" | "Energetic" | "Serious" | "Playful" | "Minimal";
  };
  colorPalette: Array<{
    hex: string;
    approxName: string;
    usageRatio: number;
  }>;
  detectedKeywords: string[];
  nextActions: string[];
}
```

**프로세스**:
1. 이미지를 Firebase Storage에 업로드
2. Gemini Vision API로 3-Layer 분석 수행
3. multimodalembedding@001로 이미지 임베딩 생성
4. Firestore에 AnalysisDocument 저장
5. (Optional) BigQuery에 메트릭 저장

### 1.2 chatWithMentor

**목적**: 분석 결과 기반 AI 멘토링

**엔드포인트**: `chatWithMentor`

**리전**: `asia-northeast3`

**타임아웃**: 120초

**메모리**: 256MB

**요청 스키마**:
```typescript
{
  message: string;              // 사용자 메시지
  sessionId?: string;          // 세션 ID (선택사항)
  analysisContext?: string;    // analysisId (선택사항)
}
```

**응답 스키마**:
```typescript
{
  success: boolean;
  sessionId: string;
  response: string;             // AI 멘토 응답
  analysisContext?: {
    analysisId: string;
    formatPrediction: string;
    fixScope: string;
    overallScore: number;
  };
}
```

**프로세스**:
1. Firestore에서 AnalysisDocument 로드 (analysisContext 제공 시)
2. fixScope 기반 System Instruction 구성
3. Gemini 2.5 Flash로 답변 생성
4. chatSessions에 저장

### 1.3 searchSimilar

**목적**: 유사 디자인 벡터 검색

**엔드포인트**: `searchSimilar`

**리전**: `asia-northeast3`

**타임아웃**: 60초

**메모리**: 256MB

**요청 스키마**:
```typescript
{
  analysisId: string;          // 분석 ID
  limit?: number;              // 결과 개수 (기본값: 10)
  filterFormat?: string;       // 포맷 필터 (선택사항)
  filterFixScope?: string;     // fixScope 필터 (선택사항)
}
```

**응답 스키마**:
```typescript
{
  success: boolean;
  results: Array<{
    analysisId: string;
    imageUrl: string;
    formatPrediction: string;
    overallScore: number;
    fixScope: string;
    similarity: number;         // 유사도 점수 (0-1)
  }>;
}
```

**프로세스**:
1. Firestore에서 analysisId로 AnalysisDocument 조회
2. imageEmbedding 추출
3. Firestore Vector Search 수행 (findNearest)
4. 필터 적용 (포맷, fixScope)
5. 결과 반환

### 1.4 getAnalysis

**목적**: 분석 결과 조회

**엔드포인트**: `getAnalysis`

**리전**: `asia-northeast3`

**타임아웃**: 30초

**메모리**: 256MB

**요청 스키마**:
```typescript
{
  analysisId: string;
}
```

**응답 스키마**:
```typescript
{
  success: boolean;
  analysis: AnalysisDocument;  // 전체 AnalysisDocument
}
```

### 1.5 getAnalyses

**목적**: 사용자 분석 목록 조회

**엔드포인트**: `getAnalyses`

**리전**: `asia-northeast3`

**타임아웃**: 30초

**메모리**: 256MB

**요청 스키마**:
```typescript
{
  userId: string;
  limit?: number;              // 결과 개수 (기본값: 20)
  offset?: number;             // 오프셋 (기본값: 0)
}
```

**응답 스키마**:
```typescript
{
  success: boolean;
  analyses: Array<{
    analysisId: string;
    fileName: string;
    imageUrl: string;
    createdAt: string;
    formatPrediction: string;
    overallScore: number;
    fixScope: string;
  }>;
  total: number;
}
```

### 1.6 getUserProfile

**목적**: 사용자 프로필 조회

**엔드포인트**: `getUserProfile`

**리전**: `asia-northeast3`

**타임아웃**: 30초

**메모리**: 256MB

**요청 스키마**:
```typescript
{
  userId: string;
}
```

**응답 스키마**:
```typescript
{
  success: boolean;
  profile: UserDocument;
}
```

### 1.7 searchImages

**목적**: 텍스트 기반 이미지 검색

**엔드포인트**: `searchImages`

**리전**: `asia-northeast3`

**타임아웃**: 30초

**메모리**: 256MB

**요청 스키마**:
```typescript
{
  query: string;               // 검색어
  limit?: number;              // 결과 개수 (기본값: 10)
}
```

**응답 스키마**:
```typescript
{
  success: boolean;
  results: Array<{
    title: string;
    link: string;
    displayLink: string;
    snippet: string;
    imageUrl: string;
  }>;
}
```

**프로세스**:
1. Google Custom Search API 호출
2. 검색 결과 반환

---

## 2. Gemini API 통합

### 2.1 Vision API (gemini-3-pro-preview)

**용도**: 디자인 이미지 분석

**모델**: `gemini-3-pro-preview`

**설정**:
```typescript
{
  temperature: 0.2,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
  responseSchema: DESIGN_ANALYSIS_SCHEMA,
  systemInstruction: VISION_SYSTEM_INSTRUCTION
}
```

**입력**:
- 이미지 데이터 (base64 또는 bytes)
- 시스템 인스트럭션 (3-Layer 평가 프레임워크)

**출력**:
- `DesignAnalysisResultLLM` (snake_case, Pydantic 검증)

### 2.2 Chat API (gemini-2.5-flash)

**용도**: AI 멘토링 챗봇

**모델**: `gemini-2.5-flash`

**설정**:
```typescript
{
  temperature: 0.7,
  topP: 0.9,
  maxOutputTokens: 2048
}
```

**입력**:
- 분석 컨텍스트 (AnalysisDocument)
- 사용자 메시지
- 대화 히스토리 (선택사항)

**출력**:
- 자연어 응답 (한국어)

### 2.3 Embedding API (multimodalembedding@001)

**용도**: 이미지 벡터화

**모델**: `multimodalembedding@001`

**차원**: 512

**입력**:
- 이미지 데이터 (bytes)

**출력**:
- `float[512]` 벡터

---

## 3. 요청/응답 형식

### 3.1 요청 형식

**Firebase Cloud Functions 호출**:
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(app, 'asia-northeast3');
const analyzeDesign = httpsCallable(functions, 'analyzeDesign', { timeout: 300000 });

const result = await analyzeDesign({
  imageData: base64ImageData,
  mimeType: 'image/jpeg',
  fileName: 'design.jpg'
});
```

### 3.2 응답 형식

**성공 응답**:
```typescript
{
  success: true,
  data: {
    // API별 응답 데이터
  }
}
```

**에러 응답**:
```typescript
{
  success: false,
  error: {
    code: string;        // 에러 코드
    message: string;     // 에러 메시지
    details?: any;       // 상세 정보 (선택사항)
  }
}
```

---

## 4. 에러 처리

### 4.1 에러 코드

| 코드 | 설명 | HTTP 상태 |
|------|------|-----------|
| `unauthenticated` | 인증되지 않음 | 401 |
| `permission-denied` | 권한 없음 | 403 |
| `not-found` | 리소스를 찾을 수 없음 | 404 |
| `invalid-argument` | 잘못된 인자 | 400 |
| `failed-precondition` | 전제 조건 실패 | 412 |
| `resource-exhausted` | 리소스 할당량 초과 | 429 |
| `internal` | 내부 서버 오류 | 500 |

### 4.2 에러 응답 예시

```typescript
// 인증 오류
{
  success: false,
  error: {
    code: "unauthenticated",
    message: "User is not authenticated"
  }
}

// 리소스를 찾을 수 없음
{
  success: false,
  error: {
    code: "not-found",
    message: "Analysis not found"
  }
}

// 잘못된 인자
{
  success: false,
  error: {
    code: "invalid-argument",
    message: "Missing imageData or mimeType"
  }
}
```

---

## 5. BigQuery 쿼리 (향후)

### 5.1 분석 메트릭 집계 쿼리

```sql
-- 사용자별 평균 점수
SELECT 
  user_id,
  AVG(overall_score) as avg_score,
  COUNT(*) as analysis_count
FROM `dysapp.design_metrics`
GROUP BY user_id
ORDER BY avg_score DESC;
```

### 5.2 포맷별 점수 분포

```sql
-- 포맷별 평균 점수
SELECT 
  format,
  AVG(overall_score) as avg_score,
  AVG(layer1_hierarchy_score) as avg_hierarchy,
  AVG(layer2_grid_consistency) as avg_grid,
  COUNT(*) as count
FROM `dysapp.design_metrics` dm
JOIN `dysapp.design_work` dw ON dm.id = dw.id
GROUP BY format
ORDER BY avg_score DESC;
```

### 5.3 사용자 성장 추적 쿼리

```sql
-- 사용자별 시간대별 점수 추이
SELECT 
  user_id,
  DATE(analyzed_at) as date,
  AVG(overall_score) as avg_score
FROM `dysapp.design_metrics` dm
JOIN `dysapp.design_work` dw ON dm.id = dw.id
WHERE user_id = @userId
GROUP BY user_id, date
ORDER BY date ASC;
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-27 | Initial APISPEC for dysapp project |

---

*Generated for dysapp project (Firebase Project ID: dysapp1210)*

