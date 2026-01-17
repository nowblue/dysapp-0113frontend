/**
 * analyzeDesign Cloud Function
 * Main entry point for design analysis
 * Reference: docs/dysapp_PRD.md - Section 8.1 (FR-001), 15.8.1
 */

import * as functions from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  VISION_MODEL,
  VISION_CONFIG,
  FUNCTIONS_REGION,
  STORAGE_BUCKET,
  COLLECTIONS,
  TIMEOUTS,
  MEMORY,
  LIMITS,
  FIRESTORE_DATABASE_ID,
} from "../constants";
import {
  AnalyzeDesignRequest,
  AnalyzeDesignResponse,
  DesignAnalysisResultLLM,
} from "../types";
import { VISION_SYSTEM_INSTRUCTION, DESIGN_ANALYSIS_SCHEMA } from "./visionSchema";
import { llmToFirestore, validateLLMResponse, sanitizeLLMResponse } from "./converter";
import { validateFixScope, generateDiagnosisDetails } from "./diagnose";
import { generateImageEmbedding } from "./embedding";
import { checkRateLimit } from "../utils/rateLimiter";
import {
  validateFileName,
  validateBase64Image,
  validateMimeType,
} from "../utils/validation";
import { handleError } from "../utils/errorHandler";
import { getValidatedApiKey } from "../utils/envValidation";

const db = getFirestore(FIRESTORE_DATABASE_ID);
const storage = getStorage();

/**
 * Upload image to Cloud Storage
 */
async function uploadToStorage(
  imageData: string,
  mimeType: string,
  fileName: string,
  userId: string
): Promise<string> {
  const bucket = storage.bucket(STORAGE_BUCKET);
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `design-uploads/${userId}/${timestamp}_${sanitizedFileName}`;

  const buffer = Buffer.from(imageData, "base64");

  // Check file size
  if (buffer.length > LIMITS.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Image size exceeds ${LIMITS.MAX_IMAGE_SIZE_MB}MB limit`
    );
  }

  const file = bucket.file(filePath);
  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata: {
        uploadedBy: userId,
        originalName: fileName,
      },
    },
  });

  // Generate signed URL for secure access
  // Storage rules require authentication, so we use signed URL
  // Expires in 10 years (analysis results should be accessible long-term)
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 10);
  
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: expires,
  });
  
  return signedUrl;
}

/**
 * Analyze image using Gemini Vision
 */
async function analyzeWithVision(
  imageData: string,
  mimeType: string
): Promise<DesignAnalysisResultLLM> {
  let apiKey: string;
  try {
    apiKey = getValidatedApiKey();
  } catch (error) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Gemini API key not configured or invalid"
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: VISION_MODEL,
    systemInstruction: VISION_SYSTEM_INSTRUCTION,
    generationConfig: {
      ...VISION_CONFIG,
      responseMimeType: "application/json",
      responseSchema: DESIGN_ANALYSIS_SCHEMA,
    },
  });

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: imageData,
        },
      },
      "Analyze this design image and return the evaluation results.",
    ]);

    const response = result.response;
    const text = response.text();

    // Parse JSON response
    let analysisResult: DesignAnalysisResultLLM;
    try {
      analysisResult = JSON.parse(text);
    } catch {
      console.error("Failed to parse LLM response:", text);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to parse analysis result"
      );
    }

    // Validate response structure
    if (!validateLLMResponse(analysisResult)) {
      throw new functions.https.HttpsError(
        "internal",
        "Invalid analysis result structure"
      );
    }

    // Sanitize and normalize
    return sanitizeLLMResponse(analysisResult);
  } catch (error) {
    console.error("Vision analysis error:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      `Vision analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Main analyzeDesign function handler
 */
export async function analyzeDesignHandler(
  request: functions.https.CallableRequest<AnalyzeDesignRequest>
): Promise<AnalyzeDesignResponse> {
  // 1. Auth check
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required"
    );
  }

  const userId = request.auth.uid;
  const data = request.data;

  // 2. Rate limiting check
  if (!checkRateLimit(userId, "ANALYZE_DESIGN")) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Rate limit exceeded. Please try again later."
    );
  }

  // 3. Validate input
  const { imageData, mimeType, fileName } = data;

  if (!imageData || !mimeType || !fileName) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required fields: imageData, mimeType, fileName"
    );
  }

  // Validate and sanitize filename
  let sanitizedFileName: string;
  try {
    sanitizedFileName = validateFileName(fileName);
  } catch (error) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Invalid filename: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Validate mime type
  if (!validateMimeType(mimeType)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Invalid image type. Supported: image/jpeg, image/png, image/webp, image/gif`
    );
  }

  // Validate base64 data
  const base64Validation = validateBase64Image(imageData);
  if (!base64Validation.valid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      base64Validation.error || "Invalid image data"
    );
  }

  try {
    console.log(`[analyzeDesign] Starting analysis for user ${userId}, file: ${fileName}`);

    // 4. Upload to Storage (use sanitized filename)
    const imageUrl = await uploadToStorage(imageData, mimeType, sanitizedFileName, userId);
    console.log(`[analyzeDesign] Uploaded to: ${imageUrl}`);

    // 5. Run Vision analysis
    const llmResult = await analyzeWithVision(imageData, mimeType);
    console.log(`[analyzeDesign] Vision analysis complete. Format: ${llmResult.format_prediction}, Score: ${llmResult.overall_score}`);

    // 6. Validate and potentially override fixScope
    const fixScopeValidation = validateFixScope(
      llmResult.fix_scope,
      {
        hierarchyScore: llmResult.layer1_performance.hierarchy_score,
        scanabilityScore: llmResult.layer1_performance.scanability_score,
        goalClarityScore: llmResult.layer1_performance.goal_clarity_score,
        accessibility: {
          lowContrast: llmResult.layer1_performance.accessibility.low_contrast,
          tinyText: llmResult.layer1_performance.accessibility.tiny_text,
          cluttered: llmResult.layer1_performance.accessibility.cluttered,
        },
        diagnosisSummary: llmResult.layer1_performance.diagnosis_summary,
        hierarchyAnalysis: llmResult.layer1_performance.hierarchy_analysis,
        scanabilityAnalysis: llmResult.layer1_performance.scanability_analysis,
        goalClarityAnalysis: llmResult.layer1_performance.goal_clarity_analysis,
      },
      {
        gridConsistency: llmResult.layer2_form.grid_consistency,
        visualBalance: llmResult.layer2_form.visual_balance,
        colorHarmony: llmResult.layer2_form.color_harmony,
        typographyQuality: llmResult.layer2_form.typography_quality,
        gridAnalysis: llmResult.layer2_form.grid_analysis,
        balanceAnalysis: llmResult.layer2_form.balance_analysis,
        colorAnalysis: llmResult.layer2_form.color_analysis,
        typographyAnalysis: llmResult.layer2_form.typography_analysis,
      }
    );

    // Apply validated fixScope
    const finalLLMResult: DesignAnalysisResultLLM = {
      ...llmResult,
      fix_scope: fixScopeValidation.fixScope,
    };

    if (fixScopeValidation.overridden) {
      console.log(`[analyzeDesign] FixScope overridden: ${fixScopeValidation.reason}`);
    }

    // 7. Generate image embedding (optional - may fail gracefully)
    let embedding: number[] | undefined;
    try {
      embedding = await generateImageEmbedding(imageData, mimeType);
      console.log(`[analyzeDesign] Embedding generated: ${embedding?.length || 0} dimensions`);
    } catch (embeddingError) {
      console.warn("[analyzeDesign] Embedding generation failed, continuing without embedding:", embeddingError);
    }

    // 8. Convert and save to Firestore (use sanitized filename)
    const firestoreDoc = llmToFirestore(
      finalLLMResult,
      userId,
      sanitizedFileName,
      imageUrl,
      embedding
    );

    const docRef = await db.collection(COLLECTIONS.ANALYSES).add(firestoreDoc);
    const analysisId = docRef.id;
    console.log(`[analyzeDesign] Saved to Firestore: ${analysisId}`);

    // 9. Update user analysis count
    await db.collection(COLLECTIONS.USERS).doc(userId).set(
      {
        analysisCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 10. Generate diagnosis details for logging
    const diagnosisDetails = generateDiagnosisDetails(
      {
        hierarchyScore: finalLLMResult.layer1_performance.hierarchy_score,
        scanabilityScore: finalLLMResult.layer1_performance.scanability_score,
        goalClarityScore: finalLLMResult.layer1_performance.goal_clarity_score,
        accessibility: {
          lowContrast: finalLLMResult.layer1_performance.accessibility.low_contrast,
          tinyText: finalLLMResult.layer1_performance.accessibility.tiny_text,
          cluttered: finalLLMResult.layer1_performance.accessibility.cluttered,
        },
        diagnosisSummary: finalLLMResult.layer1_performance.diagnosis_summary,
        hierarchyAnalysis: finalLLMResult.layer1_performance.hierarchy_analysis,
        scanabilityAnalysis: finalLLMResult.layer1_performance.scanability_analysis,
        goalClarityAnalysis: finalLLMResult.layer1_performance.goal_clarity_analysis,
      },
      {
        gridConsistency: finalLLMResult.layer2_form.grid_consistency,
        visualBalance: finalLLMResult.layer2_form.visual_balance,
        colorHarmony: finalLLMResult.layer2_form.color_harmony,
        typographyQuality: finalLLMResult.layer2_form.typography_quality,
        gridAnalysis: finalLLMResult.layer2_form.grid_analysis,
        balanceAnalysis: finalLLMResult.layer2_form.balance_analysis,
        colorAnalysis: finalLLMResult.layer2_form.color_analysis,
        typographyAnalysis: finalLLMResult.layer2_form.typography_analysis,
      },
      fixScopeValidation.fixScope
    );
    console.log(`[analyzeDesign] Diagnosis: L1Avg=${diagnosisDetails.l1Average}, L2Avg=${diagnosisDetails.l2Average}`);

    // 11. Return response
    return {
      success: true,
      analysisId,
      imageUrl,
      formatPrediction: finalLLMResult.format_prediction,
      overallScore: finalLLMResult.overall_score,
      fixScope: fixScopeValidation.fixScope,
      layer1Metrics: {
        hierarchyScore: finalLLMResult.layer1_performance.hierarchy_score,
        scanabilityScore: finalLLMResult.layer1_performance.scanability_score,
        goalClarityScore: finalLLMResult.layer1_performance.goal_clarity_score,
        accessibility: {
          lowContrast: finalLLMResult.layer1_performance.accessibility.low_contrast,
          tinyText: finalLLMResult.layer1_performance.accessibility.tiny_text,
          cluttered: finalLLMResult.layer1_performance.accessibility.cluttered,
        },
        diagnosisSummary: finalLLMResult.layer1_performance.diagnosis_summary,
        hierarchyAnalysis: finalLLMResult.layer1_performance.hierarchy_analysis,
        scanabilityAnalysis: finalLLMResult.layer1_performance.scanability_analysis,
        goalClarityAnalysis: finalLLMResult.layer1_performance.goal_clarity_analysis,
      },
      layer2Metrics: {
        gridConsistency: finalLLMResult.layer2_form.grid_consistency,
        visualBalance: finalLLMResult.layer2_form.visual_balance,
        colorHarmony: finalLLMResult.layer2_form.color_harmony,
        typographyQuality: finalLLMResult.layer2_form.typography_quality,
        gridAnalysis: finalLLMResult.layer2_form.grid_analysis,
        balanceAnalysis: finalLLMResult.layer2_form.balance_analysis,
        colorAnalysis: finalLLMResult.layer2_form.color_analysis,
        typographyAnalysis: finalLLMResult.layer2_form.typography_analysis,
      },
      layer3Metrics: {
        trustVibe: finalLLMResult.layer3_communicative.trust_vibe,
        engagementPotential: finalLLMResult.layer3_communicative.engagement_potential,
        emotionalTone: finalLLMResult.layer3_communicative.emotional_tone,
        trustAnalysis: finalLLMResult.layer3_communicative.trust_analysis,
        engagementAnalysis: finalLLMResult.layer3_communicative.engagement_analysis,
        emotionalAnalysis: finalLLMResult.layer3_communicative.emotional_analysis,
      },
      colorPalette: finalLLMResult.color_palette.map((c) => ({
        hex: c.hex,
        approxName: c.approx_name,
        usageRatio: c.usage_ratio,
      })),
      detectedKeywords: finalLLMResult.detected_keywords,
      nextActions: finalLLMResult.next_actions,
      strengths: finalLLMResult.strengths,
      weaknesses: finalLLMResult.weaknesses,
      overallAnalysis: finalLLMResult.overall_analysis,
    };
  } catch (error) {
    throw handleError(error, "analyzeDesign", userId);
  }
}

/**
 * Export the Cloud Function
 */
export const analyzeDesign = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.ANALYZE_DESIGN,
    memory: MEMORY.ANALYZE_DESIGN,
  },
  analyzeDesignHandler
);
