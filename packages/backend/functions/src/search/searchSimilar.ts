/**
 * searchSimilar Cloud Function
 * Vector search for similar designs using Firestore Native
 * Reference: docs/dysapp_PRD.md - Section 8.1 (FR-003), 15.9
 */

import * as functions from "firebase-functions/v2";
import { getFirestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  FUNCTIONS_REGION,
  COLLECTIONS,
  TIMEOUTS,
  MEMORY,
  LIMITS,
  THRESHOLDS,
  EMBEDDING_DIM,
  FIRESTORE_DATABASE_ID,
} from "../constants";
import {
  SearchSimilarRequest,
  SearchSimilarResponse,
  SimilarDesignResult,
  AnalysisDocument,
  FormatPrediction,
  FixScope,
} from "../types";
import { checkRateLimit } from "../utils/rateLimiter";
import { validateAnalysisId } from "../utils/validation";
import { handleError } from "../utils/errorHandler";

const db = getFirestore(FIRESTORE_DATABASE_ID);

/**
 * Find similar designs using Firestore Vector Search
 */
async function findSimilarDesigns(
  queryVector: number[],
  limit: number,
  filterFormat?: FormatPrediction,
  filterFixScope?: FixScope,
  minScore?: number,
  excludeId?: string
): Promise<SimilarDesignResult[]> {
  // Build query with optional filters
  let query = db.collection(COLLECTIONS.ANALYSES);

  // Apply filters
  if (filterFormat) {
    query = query.where("formatPrediction", "==", filterFormat) as FirebaseFirestore.CollectionReference;
  }

  if (filterFixScope) {
    query = query.where("fixScope", "==", filterFixScope) as FirebaseFirestore.CollectionReference;
  }

  // Firestore cannot compare using >,>=,<,<= against null.
  // Some callers may pass null from JSON payload even if the TS type is number | undefined.
  if (typeof minScore === "number") {
    query = query.where("overallScore", ">=", minScore) as FirebaseFirestore.CollectionReference;
  }

  // Execute vector search
  const vectorQuery = query.findNearest({
    vectorField: "imageEmbedding",
    queryVector: queryVector,
    limit: limit + 1, // +1 to account for potential self-match
    distanceMeasure: "COSINE",
  });

  const snapshot: any = await vectorQuery.get();

  // Process results
  const results: SimilarDesignResult[] = [];

  snapshot.docs.forEach((doc: QueryDocumentSnapshot) => {
    // Skip self-match
    if (doc.id === excludeId) {
      return;
    }

    // Skip if we've hit the limit
    if (results.length >= limit) {
      return;
    }

    const data = doc.data() as AnalysisDocument;
    const docWithDistance = doc as QueryDocumentSnapshot & { distance?: number };

    results.push({
      id: doc.id,
      distance: docWithDistance.distance || 0,
      formatPrediction: data.formatPrediction,
      overallScore: data.overallScore,
      fixScope: data.fixScope,
      imageUrl: data.imageUrl,
      fileName: data.fileName,
    });
  });

  return results;
}

/**
 * Pattern 1: User-scoped similar designs
 */
async function findUserSimilarDesigns(
  userId: string,
  queryVector: number[],
  limit: number = LIMITS.DEFAULT_SIMILAR_LIMIT
): Promise<SimilarDesignResult[]> {
  const query = db
    .collection(COLLECTIONS.ANALYSES)
    .where("userId", "==", userId);

  const vectorQuery = query.findNearest({
    vectorField: "imageEmbedding",
    queryVector: queryVector,
    limit: limit,
    distanceMeasure: "COSINE",
  });

  const snapshot: any = await vectorQuery.get();

  return snapshot.docs.map((doc: QueryDocumentSnapshot) => {
    const data = doc.data() as AnalysisDocument;
    const docWithDistance = doc as QueryDocumentSnapshot & { distance?: number };
    return {
      id: doc.id,
      distance: docWithDistance.distance || 0,
      formatPrediction: data.formatPrediction,
      overallScore: data.overallScore,
      fixScope: data.fixScope,
      imageUrl: data.imageUrl,
      fileName: data.fileName,
    };
  });
}

/**
 * Pattern 2: Format-filtered reference search
 */
async function findFormatReferences(
  format: FormatPrediction,
  queryVector: number[],
  minScore: number = THRESHOLDS.MIN_REFERENCE_SCORE,
  limit: number = LIMITS.DEFAULT_SIMILAR_LIMIT
): Promise<SimilarDesignResult[]> {
  return findSimilarDesigns(
    queryVector,
    limit,
    format,
    undefined,
    minScore
  );
}

/**
 * Pattern 3: FixScope-aware examples
 */
async function findFixScopeExamples(
  fixScope: FixScope,
  queryVector: number[],
  limit: number = 5
): Promise<SimilarDesignResult[]> {
  return findSimilarDesigns(
    queryVector,
    limit,
    undefined,
    fixScope
  );
}

/**
 * Main searchSimilar function handler
 */
export async function searchSimilarHandler(
  request: functions.https.CallableRequest<SearchSimilarRequest>
): Promise<SearchSimilarResponse> {
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
  if (!checkRateLimit(userId, "SEARCH_SIMILAR")) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Rate limit exceeded. Please try again later."
    );
  }

  // 3. Validate input
  const {
    analysisId,
    limit,
    filterFormat,
    filterFixScope,
    minScore: minScoreRaw,
  } = data;
  const minScore = typeof minScoreRaw === "number" ? minScoreRaw : undefined;

  if (!analysisId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing analysisId"
    );
  }

  // Validate analysis ID format
  if (!validateAnalysisId(analysisId)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid analysisId format"
    );
  }

  const searchLimit = Math.min(
    limit || LIMITS.DEFAULT_SIMILAR_LIMIT,
    LIMITS.MAX_SIMILAR_RESULTS
  );

  try {
    console.log(
      `[searchSimilar] User ${userId}, Analysis ${analysisId}, Limit ${searchLimit}`
    );

    // 3. Load source analysis document
    const analysisDoc = await db
      .collection(COLLECTIONS.ANALYSES)
      .doc(analysisId)
      .get();

    if (!analysisDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Analysis not found");
    }

    const analysis = analysisDoc.data() as AnalysisDocument;

    // 4. Check for embedding
    if (!analysis.imageEmbedding || analysis.imageEmbedding.length !== EMBEDDING_DIM) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "No embedding available for this analysis"
      );
    }

    // 5. Execute vector search
    const results = await findSimilarDesigns(
      analysis.imageEmbedding,
      searchLimit,
      filterFormat,
      filterFixScope,
      minScore,
      analysisId // Exclude self
    );

    console.log(
      `[searchSimilar] Found ${results.length} similar designs`
    );

    return {
      success: true,
      results,
      count: results.length,
    };
  } catch (error) {
    throw handleError(error, "searchSimilar", userId);
  }
}

/**
 * Export the Cloud Function
 */
export const searchSimilar = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.SEARCH_SIMILAR,
    memory: MEMORY.SEARCH_SIMILAR,
  },
  searchSimilarHandler
);

// Export utility functions for internal use
export {
  findSimilarDesigns,
  findUserSimilarDesigns,
  findFormatReferences,
  findFixScopeExamples,
};
