/**
 * dysapp Type Definitions
 * Reference: docs/dysapp_PRD.md - Section 15.3
 *
 * Naming Conventions:
 * - LLM Output: snake_case (prefixed with LLM)
 * - Firestore: camelCase
 * - BigQuery: snake_case (prefixed with BQ)
 */

import { Timestamp, FieldValue } from "firebase-admin/firestore";

// ============================================================================
// Enums & Literal Types
// ============================================================================

export type FormatPrediction =
  | "UX_UI"
  | "Editorial"
  | "Poster"
  | "Thumbnail"
  | "Card"
  | "BI_CI"
  | "Unknown";

export type FixScope = "StructureRebuild" | "DetailTuning";

export type TrustVibe = "High" | "Medium" | "Low";
export type EngagementPotential = "High" | "Medium" | "Low";
export type EmotionalTone = "Calm" | "Energetic" | "Serious" | "Playful" | "Minimal";

// ============================================================================
// Firestore Types (camelCase)
// ============================================================================

export interface AccessibilityFlags {
  lowContrast: boolean;
  tinyText: boolean;
  cluttered: boolean;
}

export interface PerformanceMetrics {
  hierarchyScore: number;
  scanabilityScore: number;
  goalClarityScore: number;
  accessibility: AccessibilityFlags;
  diagnosisSummary: string;
  hierarchyAnalysis: string;
  scanabilityAnalysis: string;
  goalClarityAnalysis: string;
}

export interface FormMetrics {
  gridConsistency: number;
  visualBalance: number;
  colorHarmony: number;
  typographyQuality: number;
  gridAnalysis: string;
  balanceAnalysis: string;
  colorAnalysis: string;
  typographyAnalysis: string;
}

export interface CommunicativeMetrics {
  trustVibe: TrustVibe;
  engagementPotential: EngagementPotential;
  emotionalTone: EmotionalTone;
  trustAnalysis: string;
  engagementAnalysis: string;
  emotionalAnalysis: string;
}

export interface ColorItem {
  hex: string;
  approxName: string;
  usageRatio: number;
}

export interface AnalysisDocument {
  // Metadata
  userId: string;
  fileName: string;
  imageUrl: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  lastAnalyzedAt: Timestamp | FieldValue;

  // Classification
  formatPrediction: FormatPrediction;

  // 3-Layer Metrics
  layer1Metrics: PerformanceMetrics;
  layer2Metrics: FormMetrics;
  layer3Metrics: CommunicativeMetrics;

  // Overall Evaluation
  overallScore: number;
  fixScope: FixScope;

  // Extracted Features
  colorPalette: ColorItem[];
  detectedKeywords: string[];
  ragSearchQueries: string[];
  nextActions: string[];
  strengths: string[];
  weaknesses: string[];
  overallAnalysis: string;
  
  // OCR Text (for text-based search)
  ocrText?: string;

  // Vector Search (Strategy A)
  imageEmbedding?: number[];
  embeddingModel: string;
  embeddingDim: number;
  embeddingVersion: number;
  analysisVersion: number;

  // Optional flags
  isPublic?: boolean;
}

export interface ChatSessionDocument {
  userId: string;
  analysisId: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  messageCount: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Timestamp | FieldValue;
}

export interface UserDocument {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  preferences?: UserPreferences;
  subscriptionTier?: "free" | "pro" | "enterprise";
  analysisCount?: number;
  privacyConsent?: PrivacyConsent;
}

export interface UserPreferences {
  preferredFormats?: FormatPrediction[];
  preferredColors?: string[];
  language?: string;
}

export interface PrivacyConsent {
  consented: boolean;
  version: string;
  agreedAt: Timestamp | FieldValue;
  ip?: string;
}

export interface BookmarkDocument {
  userId: string;
  analysisId: string;
  collectionId?: string;
  createdAt: Timestamp | FieldValue;
  note?: string;
}

export interface CollectionDocument {
  userId: string;
  name: string;
  description?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  isPublic: boolean;
  itemCount: number;
}

// ============================================================================
// LLM Output Types (snake_case)
// ============================================================================

export interface LLMAccessibilityFlags {
  low_contrast: boolean;
  tiny_text: boolean;
  cluttered: boolean;
}

export interface LLMPerformanceMetrics {
  hierarchy_score: number;
  scanability_score: number;
  goal_clarity_score: number;
  accessibility: LLMAccessibilityFlags;
  diagnosis_summary: string;
  hierarchy_analysis: string;
  scanability_analysis: string;
  goal_clarity_analysis: string;
}

export interface LLMFormMetrics {
  grid_consistency: number;
  visual_balance: number;
  color_harmony: number;
  typography_quality: number;
  grid_analysis: string;
  balance_analysis: string;
  color_analysis: string;
  typography_analysis: string;
}

export interface LLMCommunicativeMetrics {
  trust_vibe: TrustVibe;
  engagement_potential: EngagementPotential;
  emotional_tone: EmotionalTone;
  trust_analysis: string;
  engagement_analysis: string;
  emotional_analysis: string;
}

export interface LLMColorItem {
  hex: string;
  approx_name: string;
  usage_ratio: number;
}

export interface DesignAnalysisResultLLM {
  format_prediction: FormatPrediction;
  layer1_performance: LLMPerformanceMetrics;
  layer2_form: LLMFormMetrics;
  layer3_communicative: LLMCommunicativeMetrics;
  overall_score: number;
  fix_scope: FixScope;
  color_palette: LLMColorItem[];
  detected_keywords: string[];
  rag_search_queries: string[];
  next_actions: string[];
  strengths: string[];
  weaknesses: string[];
  overall_analysis: string;
  recognized_text?: string; // OCR extracted text from image
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface AnalyzeDesignRequest {
  imageData: string; // base64 encoded
  mimeType: string;
  fileName: string;
  userPrompt?: string;
}

export interface AnalyzeDesignResponse {
  success: boolean;
  analysisId: string;
  imageUrl: string;
  formatPrediction: FormatPrediction;
  overallScore: number;
  fixScope: FixScope;
  layer1Metrics: PerformanceMetrics;
  layer2Metrics: FormMetrics;
  layer3Metrics: CommunicativeMetrics;
  colorPalette: ColorItem[];
  detectedKeywords: string[];
  nextActions: string[];
  strengths: string[];
  weaknesses: string[];
  overallAnalysis: string;
}

export interface ChatRequest {
  analysisId: string;
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  success: boolean;
  sessionId: string;
  response: string;
}

export interface SearchSimilarRequest {
  analysisId: string;
  limit?: number;
  filterFormat?: FormatPrediction;
  filterFixScope?: FixScope;
  minScore?: number;
}

export interface SearchSimilarResponse {
  success: boolean;
  results: SimilarDesignResult[];
  count: number;
}

export interface SimilarDesignResult {
  id: string;
  distance: number;
  formatPrediction: FormatPrediction;
  overallScore: number;
  fixScope: FixScope;
  imageUrl: string;
  fileName: string;
}

export interface GetAnalysesRequest {
  limit?: number;
  offset?: number;
  filterFormat?: FormatPrediction;
  filterFixScope?: FixScope;
}

export interface GetAnalysesResponse {
  success: boolean;
  analyses: AnalysisSummary[];
  total: number;
  hasMore: boolean;
}

export interface AnalysisSummary {
  id: string;
  fileName: string;
  imageUrl: string;
  formatPrediction: FormatPrediction;
  overallScore: number;
  fixScope: FixScope;
  createdAt: Timestamp;
}

export interface GetUserProfileResponse {
  success: boolean;
  profile: UserDocument | null;
}

// ============================================================================
// Registration & Authentication Types
// ============================================================================

export interface RegisterUserRequest {
  email: string;
  password: string;
  displayName?: string;
  privacyConsent: {
    consented: boolean;
    version: string;
    ip?: string;
  };
}

export interface RegisterUserResponse {
  success: boolean;
  userId: string;
  email: string;
  isAnonymousUpgrade?: boolean;
}

// ============================================================================
// Custom Search API Types
// ============================================================================

export interface CustomSearchRequest {
  query: string;
  start?: number;
  num?: number;
}

export interface CustomSearchResponse {
  success: boolean;
  items: CustomSearchItem[];
  totalResults: number;
  searchTime: number;
}

export interface CustomSearchItem {
  id: string;
  imageUrl: string;
  title: string;
  snippet: string;
  displayLink: string;
  contextLink: string;
  thumbnailUrl?: string;
}

// ============================================================================
// BigQuery Row Types (snake_case) - For v2+
// ============================================================================

export interface BQDesignWorkRow {
  id: string;
  user_id: string;
  file_name: string | null;
  title: string | null;
  description: string | null;
  format: string;
  goal_type: string | null;
  target_audience: string | null;
  platform: string | null;
  in_language: string | null;
  image_url: string;
  created_at: Date;
  updated_at: Date;
  applies_guidelines: string[];
  suitable_for_curricula: string[];
  analysis_version: number;
  embedding_version: number;
}

export interface BQColorItemRow {
  hex: string;
  approx_name: string;
  usage_ratio: number;
}

export interface BQDesignMetricsRow {
  id: string;
  analyzed_at: Date;
  layer1_hierarchy_score: number;
  layer1_scanability_score: number;
  layer1_goal_clarity_score: number;
  layer1_accessibility_low_contrast: boolean;
  layer1_accessibility_tiny_text: boolean;
  layer1_accessibility_cluttered: boolean;
  layer1_diagnosis_summary: string;
  layer2_grid_consistency: number;
  layer2_visual_balance: number;
  layer2_color_harmony: number;
  layer2_typography_quality: number;
  layer3_trust_vibe: string;
  layer3_engagement_potential: string;
  layer3_emotional_tone: string;
  overall_score: number;
  fix_scope: string;
  color_palette: BQColorItemRow[];
  detected_keywords: string[];
  rag_search_queries: string[];
}

// ============================================================================
// Validation Result Type
// ============================================================================

export interface FixScopeValidationResult {
  fixScope: FixScope;
  overridden: boolean;
  reason?: string;
}
