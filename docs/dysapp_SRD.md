# dysapp SRD (System Requirements Document)

> **Version:** 1.0 (Created: 2025-01-27)
> **Status:** Initial Draft
> **Single Source of Truth:** `docs/postdocs/baseline_spec.md`
> **프로젝트명:** dysapp (Firebase Project ID: dysapp1210)

---

## 📌 0. 문서 정보

| 항목 | 내용 |
|------|------|
| **프로젝트명** | dysapp (Design Intelligence Support System) |
| **문서 유형** | System Requirements Document (SRD) |
| **관련 문서** | dysapp_PRD.md, dysapp_FRD.md, dysapp_TSD.md |
| **작성 목적** | 데이터베이스 스키마, Vector Search 인덱스, 데이터 어댑터 명세를 정의하여 시스템 요구사항을 명확히 함 |

---

## 🎯 1. 개요 및 목적

### 1.1 문서 목적

본 SRD는 **dysapp**의 시스템 요구사항을 정의합니다. 이 문서는:

- Firestore 데이터베이스 스키마 상세 정의
- Vector Search 인덱스 구성 명세
- 데이터 어댑터 명세 (백엔드 ↔ 프론트엔드)
- 데이터 흐름 및 변환 로직 정의

### 1.2 인프라 정보

- **Firestore 데이터베이스 ID**: `dysapp`
- **Firestore 리전**: `nam5` (예외)
- **Storage Bucket**: `gs://dysapp1210.firebasestorage.app`
- **Storage 리전**: `asia-northeast3` (서울)

---

## 📋 목차

1. [Firestore 스키마](#1-firestore-스키마)
2. [Vector Search 인덱스](#2-vector-search-인덱스)
3. [데이터 어댑터 명세](#3-데이터-어댑터-명세)
4. [데이터 흐름](#4-데이터-흐름)
5. [BigQuery 스키마 (향후)](#5-bigquery-스키마-향후)

---

## 1. Firestore 스키마

### 1.1 analyses 컬렉션

**경로**: `analyses/{analysisId}`

**문서 타입**: `AnalysisDocument`

**스키마**:
```typescript
interface AnalysisDocument {
  // 메타데이터
  userId: string;
  fileName: string;
  imageUrl: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  lastAnalyzedAt: Timestamp | FieldValue;

  // 분류
  formatPrediction: "UX_UI" | "Editorial" | "Poster" | "Thumbnail" | "Card" | "BI_CI" | "Unknown";

  // Layer 1: Performance & Information (50%)
  layer1Metrics: {
    hierarchyScore: number;        // 0-100
    scanabilityScore: number;      // 0-100
    goalClarityScore: number;      // 0-100
    accessibility: {
      lowContrast: boolean;
      tinyText: boolean;
      cluttered: boolean;
    };
    diagnosisSummary: string;
  };

  // Layer 2: Form & Aesthetic (30%)
  layer2Metrics: {
    gridConsistency: number;       // 0-100
    visualBalance: number;         // 0-100
    colorHarmony: number;          // 0-100
    typographyQuality: number;    // 0-100
  };

  // Layer 3: Communicative Impact (20%)
  layer3Metrics: {
    trustVibe: "High" | "Medium" | "Low";
    engagementPotential: "High" | "Medium" | "Low";
    emotionalTone: "Calm" | "Energetic" | "Serious" | "Playful" | "Minimal";
  };

  // 메타 진단
  overallScore: number;            // 0-100
  fixScope: "StructureRebuild" | "DetailTuning";

  // 특징 추출
  colorPalette: Array<{
    hex: string;
    approxName: string;
    usageRatio: number;            // 0.0-1.0
  }>;
  detectedKeywords: string[];
  ragSearchQueries: string[];
  nextActions: string[];

  // Vector Search (Strategy A)
  imageEmbedding?: number[];       // 512-dim, optional until generated
  embeddingModel: string;          // "multimodalembedding@001"
  embeddingDim: number;            // 512
  embeddingVersion: number;        // 1
  analysisVersion: number;         // 1
}
```

**인덱스 요구사항**:
- `userId` + `createdAt` (DESC) - 사용자별 분석 목록 조회
- `userId` + `formatPrediction` - 사용자별 포맷 필터링
- `imageEmbedding` (Vector Index) - 유사 디자인 검색

### 1.2 chatSessions 컬렉션

**경로**: `chatSessions/{sessionId}`

**문서 타입**: `ChatSessionDocument`

**스키마**:
```typescript
interface ChatSessionDocument {
  userId: string;
  analysisId?: string;              // 선택사항 (분석 컨텍스트)
  messages: Array<{
    id: string;
    role: "user" | "model";
    text: string;
    timestamp: number;
  }>;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
```

**인덱스 요구사항**:
- `userId` + `createdAt` (DESC) - 사용자별 채팅 세션 목록

### 1.3 users 컬렉션

**경로**: `users/{userId}`

**문서 타입**: `UserDocument`

**스키마**:
```typescript
interface UserDocument {
  displayName: string;
  email: string;
  photoURL?: string;
  subscription: "free" | "pro" | "premium";
  bio?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  settings: {
    notifications: {
      weeklyReport: boolean;
      growthAlerts: boolean;
      marketingEmails: boolean;
    };
  };
}
```

### 1.4 bookmarks 컬렉션

**경로**: `bookmarks/{bookmarkId}`

**문서 타입**: `BookmarkDocument`

**스키마**:
```typescript
interface BookmarkDocument {
  userId: string;
  referenceId: string;              // analyses/{id} 또는 외부 참조 ID
  imageUrl: string;
  title: string;
  category: string;
  similarity?: number;              // 유사도 점수 (0-1)
  reason?: string;                 // 북마크 이유
  createdAt: Timestamp | FieldValue;
}
```

**인덱스 요구사항**:
- `userId` + `createdAt` (DESC) - 사용자별 북마크 목록

### 1.5 collections 컬렉션

**경로**: `collections/{collectionId}`

**문서 타입**: `CollectionDocument`

**스키마**:
```typescript
interface CollectionDocument {
  userId: string;
  name: string;
  description?: string;
  analysisIds: string[];           // analyses/{id} 배열
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
```

**인덱스 요구사항**:
- `userId` + `createdAt` (DESC) - 사용자별 컬렉션 목록

---

## 2. Vector Search 인덱스

### 2.1 Firestore Native Vector Search (Strategy A)

**전략**: Firestore Native Vector Search 사용

**필드**: `imageEmbedding` (512-dim)

**인덱스 설정**:
```json
{
  "fieldOverrides": [
    {
      "collectionGroup": "analyses",
      "fieldPath": "imageEmbedding",
      "indexes": [
        {
          "dimensions": 512,
          "flat": {},
          "queryScope": "COLLECTION"
        }
      ]
    }
  ]
}
```

**거리 측정**: COSINE (기본값)

### 2.2 쿼리 패턴

#### Pattern 1: 사용자 범위 유사 디자인 검색

```typescript
db.collection("analyses")
  .where("userId", "==", currentUserId)
  .findNearest({
    vectorField: "imageEmbedding",
    queryVector: targetEmbedding,
    limit: 20,
    distanceMeasure: "COSINE"
  })
  .get();
```

#### Pattern 2: 포맷 필터링된 레퍼런스 검색

```typescript
db.collection("analyses")
  .where("formatPrediction", "==", "Thumbnail")
  .where("overallScore", ">=", 70)
  .findNearest({
    vectorField: "imageEmbedding",
    queryVector: targetEmbedding,
    limit: 10,
    distanceMeasure: "COSINE"
  })
  .get();
```

#### Pattern 3: FixScope 기반 유사 디자인 검색

```typescript
db.collection("analyses")
  .where("fixScope", "==", "StructureRebuild")
  .findNearest({
    vectorField: "imageEmbedding",
    queryVector: targetEmbedding,
    limit: 5,
    distanceMeasure: "COSINE"
  })
  .get();
```

---

## 3. 데이터 어댑터 명세

### 3.1 백엔드 → 프론트엔드 변환

**함수**: `adaptAnalysisResult(backendResult)`

**입력**: Firestore `AnalysisDocument` (camelCase)

**출력**: 프론트엔드 표시 형식

**변환 로직**:
```javascript
export function adaptAnalysisResult(backendResult) {
  return {
    // 기본 정보
    analysisId: backendResult.analysisId || backendResult.id,
    imageUrl: backendResult.imageUrl,
    formatPrediction: backendResult.formatPrediction,
    overallScore: backendResult.overallScore,
    fixScope: backendResult.fixScope,

    // Layer 1: Performance & Information (50%)
    layer1: {
      hierarchyScore: backendResult.layer1Metrics.hierarchyScore,
      scanabilityScore: backendResult.layer1Metrics.scanabilityScore,
      goalClarityScore: backendResult.layer1Metrics.goalClarityScore,
      accessibility: backendResult.layer1Metrics.accessibility,
      diagnosisSummary: backendResult.layer1Metrics.diagnosisSummary
    },

    // Layer 2: Form & Aesthetic (30%)
    layer2: {
      gridConsistency: backendResult.layer2Metrics.gridConsistency,
      visualBalance: backendResult.layer2Metrics.visualBalance,
      colorHarmony: backendResult.layer2Metrics.colorHarmony,
      typographyQuality: backendResult.layer2Metrics.typographyQuality
    },

    // Layer 3: Communicative Impact (20%)
    layer3: {
      trustVibe: backendResult.layer3Metrics.trustVibe,
      engagementPotential: backendResult.layer3Metrics.engagementPotential,
      emotionalTone: backendResult.layer3Metrics.emotionalTone
    },

    // 기타
    colorPalette: backendResult.colorPalette,
    detectedKeywords: backendResult.detectedKeywords,
    nextActions: backendResult.nextActions
  };
}
```

### 3.2 필드 네이밍 컨벤션

| Layer | Case Style | Example | Usage |
|-------|------------|---------|-------|
| **LLM Output** | `snake_case` | `hierarchy_score` | Gemini response |
| **Firestore** | `camelCase` | `hierarchyScore` | AnalysisDocument |
| **프론트엔드** | `camelCase` | `hierarchyScore` | 화면 표시 |
| **BigQuery** | `snake_case` | `layer1_hierarchy_score` | design_metrics |

### 3.3 타임스탬프 변환

**Firestore Timestamp → 프론트엔드 문자열**:
```javascript
function formatTimestamp(timestamp) {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  return timestamp;
}
```

---

## 4. 데이터 흐름

### 4.1 업로드 → 분석 → 저장 플로우

```
[업로드]
이미지 파일 (base64)
  ↓
[분석]
analyzeDesign Cloud Function
  ↓
Gemini Vision API → DesignAnalysisResultLLM (snake_case)
  ↓
[검증]
Pydantic model_validate_json()
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
[업데이트]
Firestore analyses/{id} 업데이트 (imageEmbedding 추가)
```

### 4.2 검색 → 필터 → 결과 플로우

```
[검색 요청]
이미지 업로드 또는 analysisId
  ↓
[임베딩 추출]
imageEmbedding[512]
  ↓
[Vector Search]
Firestore findNearest()
  ↓
[필터 적용]
포맷, fixScope, 점수 범위 필터링
  ↓
[결과 반환]
유사 디자인 리스트
  ↓
[데이터 변환]
adaptAnalysisResult() → 프론트엔드 형식
  ↓
[화면 표시]
검색 결과 그리드
```

---

## 5. BigQuery 스키마 (향후)

### 5.1 design_work 테이블

**데이터셋**: `dysapp`

**테이블**: `design_work`

**스키마**:
```sql
CREATE TABLE `dysapp.design_work` (
  id STRING NOT NULL,
  user_id STRING NOT NULL,
  file_name STRING,
  title STRING,
  description STRING,
  format STRING,
  goal_type STRING,
  target_audience STRING,
  platform STRING,
  in_language STRING,
  image_url STRING,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  applies_guidelines ARRAY<STRING>,
  suitable_for_curricula ARRAY<STRING>,
  analysis_version INT64,
  embedding_version INT64
);
```

### 5.2 design_metrics 테이블

**데이터셋**: `dysapp`

**테이블**: `design_metrics`

**스키마**:
```sql
CREATE TABLE `dysapp.design_metrics` (
  id STRING NOT NULL,
  analyzed_at TIMESTAMP,
  
  -- Layer 1: Performance & Information (50%)
  layer1_hierarchy_score INT64,
  layer1_scanability_score INT64,
  layer1_goal_clarity_score INT64,
  layer1_accessibility_low_contrast BOOL,
  layer1_accessibility_tiny_text BOOL,
  layer1_accessibility_cluttered BOOL,
  layer1_diagnosis_summary STRING,
  
  -- Layer 2: Form & Aesthetics (30%)
  layer2_grid_consistency INT64,
  layer2_visual_balance INT64,
  layer2_color_harmony INT64,
  layer2_typography_quality INT64,
  
  -- Layer 3: Communicative Impact (20%)
  layer3_trust_vibe STRING,
  layer3_engagement_potential STRING,
  layer3_emotional_tone STRING,
  
  -- Overall & Meta
  overall_score INT64,
  fix_scope STRING,
  
  -- Extracted Features
  color_palette ARRAY<STRUCT<
    hex STRING,
    approx_name STRING,
    usage_ratio FLOAT64
  >>,
  detected_keywords ARRAY<STRING>,
  rag_search_queries ARRAY<STRING>
);
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-27 | Initial SRD for dysapp project |

---

*Generated for dysapp project (Firebase Project ID: dysapp1210)*

