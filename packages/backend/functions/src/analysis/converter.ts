/**
 * Data Converters
 * LLM (snake_case) → Firestore (camelCase) → BigQuery (snake_case)
 * Reference: docs/dysapp_PRD.md - Section 15.5
 */

import { FieldValue } from "firebase-admin/firestore";
import {
  DesignAnalysisResultLLM,
  AnalysisDocument,
  PerformanceMetrics,
  FormMetrics,
  CommunicativeMetrics,
  ColorItem,
  BQDesignWorkRow,
  BQDesignMetricsRow,
} from "../types";
import {
  EMBEDDING_MODEL,
  EMBEDDING_DIM,
  ANALYSIS_VERSION,
  EMBEDDING_VERSION,
} from "../constants";

/**
 * Convert LLM output (snake_case) to Firestore document (camelCase)
 */
export function llmToFirestore(
  llm: DesignAnalysisResultLLM,
  userId: string,
  fileName: string,
  imageUrl: string,
  embedding?: number[]
): Omit<AnalysisDocument, "createdAt" | "updatedAt" | "lastAnalyzedAt"> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
  lastAnalyzedAt: FieldValue;
} {
  const layer1Metrics: PerformanceMetrics = {
    hierarchyScore: llm.layer1_performance.hierarchy_score,
    scanabilityScore: llm.layer1_performance.scanability_score,
    goalClarityScore: llm.layer1_performance.goal_clarity_score,
    accessibility: {
      lowContrast: llm.layer1_performance.accessibility.low_contrast,
      tinyText: llm.layer1_performance.accessibility.tiny_text,
      cluttered: llm.layer1_performance.accessibility.cluttered,
    },
    diagnosisSummary: llm.layer1_performance.diagnosis_summary,
    hierarchyAnalysis: llm.layer1_performance.hierarchy_analysis,
    scanabilityAnalysis: llm.layer1_performance.scanability_analysis,
    goalClarityAnalysis: llm.layer1_performance.goal_clarity_analysis,
  };

  const layer2Metrics: FormMetrics = {
    gridConsistency: llm.layer2_form.grid_consistency,
    visualBalance: llm.layer2_form.visual_balance,
    colorHarmony: llm.layer2_form.color_harmony,
    typographyQuality: llm.layer2_form.typography_quality,
    gridAnalysis: llm.layer2_form.grid_analysis,
    balanceAnalysis: llm.layer2_form.balance_analysis,
    colorAnalysis: llm.layer2_form.color_analysis,
    typographyAnalysis: llm.layer2_form.typography_analysis,
  };

  const layer3Metrics: CommunicativeMetrics = {
    trustVibe: llm.layer3_communicative.trust_vibe,
    engagementPotential: llm.layer3_communicative.engagement_potential,
    emotionalTone: llm.layer3_communicative.emotional_tone,
    trustAnalysis: llm.layer3_communicative.trust_analysis,
    engagementAnalysis: llm.layer3_communicative.engagement_analysis,
    emotionalAnalysis: llm.layer3_communicative.emotional_analysis,
  };

  const colorPalette: ColorItem[] = llm.color_palette.map((c) => ({
    hex: c.hex,
    approxName: c.approx_name,
    usageRatio: c.usage_ratio,
  }));

  return {
    userId,
    fileName,
    imageUrl,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastAnalyzedAt: FieldValue.serverTimestamp(),
    formatPrediction: llm.format_prediction,
    layer1Metrics,
    layer2Metrics,
    layer3Metrics,
    overallScore: llm.overall_score,
    fixScope: llm.fix_scope,
    colorPalette,
    detectedKeywords: llm.detected_keywords,
    ragSearchQueries: llm.rag_search_queries,
    nextActions: llm.next_actions,
    strengths: llm.strengths,
    weaknesses: llm.weaknesses,
    overallAnalysis: llm.overall_analysis,
    embeddingModel: EMBEDDING_MODEL,
    embeddingDim: EMBEDDING_DIM,
    embeddingVersion: EMBEDDING_VERSION,
    analysisVersion: ANALYSIS_VERSION,
    ...(embedding && { imageEmbedding: embedding }),
    ...(llm.recognized_text && { ocrText: llm.recognized_text }),
  };
}

/**
 * Convert Firestore document to BigQuery design_work row
 */
export function firestoreToBQWork(
  doc: AnalysisDocument,
  docId: string
): BQDesignWorkRow {
  const createdAt = doc.createdAt as FirebaseFirestore.Timestamp;
  const updatedAt = doc.updatedAt as FirebaseFirestore.Timestamp;

  return {
    id: docId,
    user_id: doc.userId,
    file_name: doc.fileName,
    title: null,
    description: null,
    format: doc.formatPrediction,
    goal_type: null,
    target_audience: null,
    platform: null,
    in_language: null,
    image_url: doc.imageUrl,
    created_at: createdAt.toDate(),
    updated_at: updatedAt.toDate(),
    applies_guidelines: [],
    suitable_for_curricula: [],
    analysis_version: doc.analysisVersion,
    embedding_version: doc.embeddingVersion,
  };
}

/**
 * Convert Firestore document to BigQuery design_metrics row
 */
export function firestoreToBQMetrics(
  doc: AnalysisDocument,
  docId: string
): BQDesignMetricsRow {
  const lastAnalyzedAt = doc.lastAnalyzedAt as FirebaseFirestore.Timestamp;

  return {
    id: docId,
    analyzed_at: lastAnalyzedAt.toDate(),
    layer1_hierarchy_score: doc.layer1Metrics.hierarchyScore,
    layer1_scanability_score: doc.layer1Metrics.scanabilityScore,
    layer1_goal_clarity_score: doc.layer1Metrics.goalClarityScore,
    layer1_accessibility_low_contrast: doc.layer1Metrics.accessibility.lowContrast,
    layer1_accessibility_tiny_text: doc.layer1Metrics.accessibility.tinyText,
    layer1_accessibility_cluttered: doc.layer1Metrics.accessibility.cluttered,
    layer1_diagnosis_summary: doc.layer1Metrics.diagnosisSummary,
    layer2_grid_consistency: doc.layer2Metrics.gridConsistency,
    layer2_visual_balance: doc.layer2Metrics.visualBalance,
    layer2_color_harmony: doc.layer2Metrics.colorHarmony,
    layer2_typography_quality: doc.layer2Metrics.typographyQuality,
    layer3_trust_vibe: doc.layer3Metrics.trustVibe,
    layer3_engagement_potential: doc.layer3Metrics.engagementPotential,
    layer3_emotional_tone: doc.layer3Metrics.emotionalTone,
    overall_score: doc.overallScore,
    fix_scope: doc.fixScope,
    color_palette: doc.colorPalette.map((c) => ({
      hex: c.hex,
      approx_name: c.approxName,
      usage_ratio: c.usageRatio,
    })),
    detected_keywords: doc.detectedKeywords,
    rag_search_queries: doc.ragSearchQueries,
  };
}

/**
 * Convert Firestore document to API response format
 */
export function firestoreToApiResponse(
  doc: AnalysisDocument,
  docId: string
): {
  analysisId: string;
  imageUrl: string;
  formatPrediction: string;
  overallScore: number;
  fixScope: string;
  layer1Metrics: PerformanceMetrics;
  layer2Metrics: FormMetrics;
  layer3Metrics: CommunicativeMetrics;
  colorPalette: ColorItem[];
  detectedKeywords: string[];
  nextActions: string[];
} {
  return {
    analysisId: docId,
    imageUrl: doc.imageUrl,
    formatPrediction: doc.formatPrediction,
    overallScore: doc.overallScore,
    fixScope: doc.fixScope,
    layer1Metrics: doc.layer1Metrics,
    layer2Metrics: doc.layer2Metrics,
    layer3Metrics: doc.layer3Metrics,
    colorPalette: doc.colorPalette,
    detectedKeywords: doc.detectedKeywords,
    nextActions: doc.nextActions,
  };
}

/**
 * Validate LLM response structure
 */
export function validateLLMResponse(data: unknown): data is DesignAnalysisResultLLM {
  if (!data || typeof data !== "object") return false;

  const obj = data as Record<string, unknown>;

  // Check required top-level fields
  const requiredFields = [
    "format_prediction",
    "layer1_performance",
    "layer2_form",
    "layer3_communicative",
    "overall_score",
    "fix_scope",
    "color_palette",
    "detected_keywords",
    "next_actions",
    "strengths",
    "weaknesses",
    "overall_analysis",
    "rag_search_queries",
  ];

  for (const field of requiredFields) {
    if (!(field in obj)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  // Validate score ranges
  if (typeof obj.overall_score !== "number" ||
      obj.overall_score < 0 ||
      obj.overall_score > 100) {
    console.error("Invalid overall_score");
    return false;
  }

  // Validate enum values
  const validFormats = ["UX_UI", "Editorial", "Poster", "Thumbnail", "Card", "BI_CI", "Unknown"];
  if (!validFormats.includes(obj.format_prediction as string)) {
    console.error("Invalid format_prediction");
    return false;
  }

  const validFixScopes = ["StructureRebuild", "DetailTuning"];
  if (!validFixScopes.includes(obj.fix_scope as string)) {
    console.error("Invalid fix_scope");
    return false;
  }

  return true;
}

/**
 * Sanitize and normalize LLM response
 */
export function sanitizeLLMResponse(data: DesignAnalysisResultLLM): DesignAnalysisResultLLM {
  // Clamp scores to 0-100
  const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

  return {
    ...data,
    overall_score: clamp(data.overall_score),
    layer1_performance: {
      ...data.layer1_performance,
      hierarchy_score: clamp(data.layer1_performance.hierarchy_score),
      scanability_score: clamp(data.layer1_performance.scanability_score),
      goal_clarity_score: clamp(data.layer1_performance.goal_clarity_score),
      hierarchy_analysis: data.layer1_performance.hierarchy_analysis,
      scanability_analysis: data.layer1_performance.scanability_analysis,
      goal_clarity_analysis: data.layer1_performance.goal_clarity_analysis,
    },
    layer2_form: {
      grid_consistency: clamp(data.layer2_form.grid_consistency),
      visual_balance: clamp(data.layer2_form.visual_balance),
      color_harmony: clamp(data.layer2_form.color_harmony),
      typography_quality: clamp(data.layer2_form.typography_quality),
      grid_analysis: data.layer2_form.grid_analysis,
      balance_analysis: data.layer2_form.balance_analysis,
      color_analysis: data.layer2_form.color_analysis,
      typography_analysis: data.layer2_form.typography_analysis,
    },
    layer3_communicative: {
      ...data.layer3_communicative,
      trust_analysis: data.layer3_communicative.trust_analysis,
      engagement_analysis: data.layer3_communicative.engagement_analysis,
      emotional_analysis: data.layer3_communicative.emotional_analysis,
    },
    // Limit array lengths
    color_palette: data.color_palette.slice(0, 5),
    detected_keywords: data.detected_keywords.slice(0, 20),
    next_actions: data.next_actions.slice(0, 7), // Increased from 5 to 7
    strengths: data.strengths.slice(0, 5),
    weaknesses: data.weaknesses.slice(0, 5),
    overall_analysis: data.overall_analysis,
    rag_search_queries: data.rag_search_queries.slice(0, 5),
  };
}
