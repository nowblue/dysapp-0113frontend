/**
 * searchText Cloud Function
 * Text-based search for designs using OCR text
 * Reference: docs/dysapp_PRD.md - Section 8.1 (FR-003)
 */

import * as functions from "firebase-functions/v2";
import { CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import {
  FUNCTIONS_REGION,
  COLLECTIONS,
  TIMEOUTS,
  MEMORY,
  LIMITS,
  FIRESTORE_DATABASE_ID,
} from "../constants";
import {
  FormatPrediction,
  FixScope,
  AnalysisDocument,
} from "../types";
import { checkRateLimit } from "../utils/rateLimiter";
import { handleError } from "../utils/errorHandler";

const db = getFirestore(FIRESTORE_DATABASE_ID);

/**
 * Search designs by OCR text content
 */
export interface SearchTextRequest {
  query: string;
  limit?: number;
  filterFormat?: FormatPrediction;
  filterFixScope?: FixScope;
  minScore?: number;
}

export interface SearchTextResponse {
  success: boolean;
  results: TextSearchResult[];
  count: number;
}

export interface TextSearchResult {
  id: string;
  fileName: string;
  imageUrl: string;
  formatPrediction: FormatPrediction;
  overallScore: number;
  fixScope: FixScope;
  ocrText?: string;
  relevanceScore?: number; // Simple relevance score based on text match
}

/**
 * Normalize text for search (lowercase, trim, remove extra spaces)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Calculate simple relevance score based on text match
 */
function calculateRelevanceScore(query: string, ocrText: string): number {
  const normalizedQuery = normalizeText(query);
  const normalizedOcr = normalizeText(ocrText);

  if (!normalizedOcr) return 0;

  // Simple contains match
  if (normalizedOcr.includes(normalizedQuery)) {
    // Count occurrences
    const occurrences = (normalizedOcr.match(new RegExp(normalizedQuery, "g")) || []).length;
    // Base score + bonus for multiple occurrences
    return Math.min(100, 50 + (occurrences * 10));
  }

  // Check if any word matches
  const queryWords = normalizedQuery.split(/\s+/);
  const ocrWords = normalizedOcr.split(/\s+/);
  const matchingWords = queryWords.filter((word) => ocrWords.includes(word)).length;
  
  if (matchingWords > 0) {
    return (matchingWords / queryWords.length) * 50;
  }

  return 0;
}

/**
 * Search designs by text query
 */
async function searchTextHandler(
  request: CallableRequest<SearchTextRequest>
): Promise<SearchTextResponse> {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const data = request.data;

  // Validate query
  const query = data.query?.trim();
  if (!query || query.length < 2) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Query must be at least 2 characters"
    );
  }

  if (query.length > LIMITS.MAX_SEARCH_QUERY_LENGTH) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Query exceeds maximum length of ${LIMITS.MAX_SEARCH_QUERY_LENGTH} characters`
    );
  }

  // Check rate limit
  if (!checkRateLimit(userId, "SEARCH_TEXT")) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Rate limit exceeded. Please try again later."
    );
  }

  const limit = Math.min(data.limit || 20, LIMITS.MAX_SEARCH_RESULTS);
  const filterFormat = data.filterFormat;
  const filterFixScope = data.filterFixScope;
  // Firestore cannot compare using >,>=,<,<= against null.
  // Some callers may pass null from JSON payload even if the TS type is number | undefined.
  const minScore = typeof data.minScore === "number" ? data.minScore : undefined;

  try {
    console.log(`[searchText] Searching for: "${query}" by user ${userId}`);

    // Build base query - only search user's own analyses with OCR text
    // Note: Firestore doesn't support != null and != "" in same query, so we filter empty strings in memory
    let queryRef = db.collection(COLLECTIONS.ANALYSES)
      .where("userId", "==", userId);

    // Apply filters
    if (filterFormat) {
      queryRef = queryRef.where("formatPrediction", "==", filterFormat) as FirebaseFirestore.Query;
    }

    if (filterFixScope) {
      queryRef = queryRef.where("fixScope", "==", filterFixScope) as FirebaseFirestore.Query;
    }

    if (typeof minScore === "number") {
      queryRef = queryRef.where("overallScore", ">=", minScore) as FirebaseFirestore.Query;
    }

    // Get all matching documents (Firestore doesn't support full-text search natively)
    // We'll fetch and filter in memory for now
    const snapshot = await queryRef.get();

    if (snapshot.empty) {
      console.log(`[searchText] No documents found`);
      return {
        success: true,
        results: [],
        count: 0,
      };
    }

    // Filter by text match and calculate relevance
    const results: TextSearchResult[] = [];
    const normalizedQuery = normalizeText(query);

    snapshot.forEach((doc) => {
      const docData = doc.data() as AnalysisDocument;
      const ocrText = docData.ocrText;

      // Skip if no OCR text (filter empty strings here since Firestore query limitation)
      if (!ocrText || typeof ocrText !== "string" || ocrText.trim().length === 0) return;

      // Simple text matching
      const normalizedOcr = normalizeText(ocrText);
      if (normalizedOcr.includes(normalizedQuery)) {
        const relevanceScore = calculateRelevanceScore(query, ocrText);
        
        results.push({
          id: doc.id,
          fileName: docData.fileName,
          imageUrl: docData.imageUrl,
          formatPrediction: docData.formatPrediction,
          overallScore: docData.overallScore,
          fixScope: docData.fixScope,
          ocrText: ocrText.length > 200 ? ocrText.substring(0, 200) + "..." : ocrText, // Truncate for response
          relevanceScore,
        });
      }
    });

    // Sort by relevance score (descending), then by overall score
    results.sort((a, b) => {
      const relevanceDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
      if (relevanceDiff !== 0) return relevanceDiff;
      return b.overallScore - a.overallScore;
    });

    // Limit results
    const limitedResults = results.slice(0, limit);

    console.log(`[searchText] Found ${limitedResults.length} results`);

    return {
      success: true,
      results: limitedResults,
      count: limitedResults.length,
    };
  } catch (error) {
    throw handleError(error, "searchText", userId);
  }
}

/**
 * Export the Cloud Function
 */
export const searchText = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.SEARCH_SIMILAR || 30,
    memory: MEMORY.SEARCH_SIMILAR || "256MiB",
  },
  searchTextHandler
);

