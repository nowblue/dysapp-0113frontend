/**
 * customSearch Cloud Function
 * GCP Programmatic Search API (Custom Search) integration for image search
 * Reference: Plan - GCP Custom Search API 통합
 */

import * as functions from "firebase-functions/v2";
import { CallableRequest } from "firebase-functions/v2/https";
import {
  FUNCTIONS_REGION,
  TIMEOUTS,
  MEMORY,
  LIMITS,
} from "../constants";
import {
  CustomSearchRequest,
  CustomSearchResponse,
  CustomSearchItem,
} from "../types";
import { checkRateLimit } from "../utils/rateLimiter";
import { handleError } from "../utils/errorHandler";

// GCP Custom Search API Configuration
const SEARCH_API_BASE_URL = "https://www.googleapis.com/customsearch/v1";

/**
 * Get GCP Custom Search API credentials from environment variables
 * Firebase Functions v2에서 Secret은 자동으로 환경 변수로 매핑됩니다.
 */
function getSearchApiCredentials(): { apiKey: string; engineId: string } {
  // Firebase Functions v2에서 Secret Manager의 Secret은
  // 함수 정의에 secrets 옵션으로 명시하면 자동으로 환경 변수로 매핑됨
  // 값에 포함될 수 있는 줄바꿈 문자 제거를 위해 trim() 사용
  const apiKey = process.env.GCP_SEARCH_API_KEY?.trim();
  const engineId = process.env.GCP_SEARCH_ENGINE_ID?.trim();

  if (!apiKey) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "GCP_SEARCH_API_KEY is not configured. " +
      "Please ensure the secret is set in Firebase Console > Functions > Configuration > Secrets " +
      "and the function has 'secrets: [\"GCP_SEARCH_API_KEY\"]' in its configuration."
    );
  }

  if (!engineId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "GCP_SEARCH_ENGINE_ID is not configured. " +
      "Please ensure the secret is set in Firebase Console > Functions > Configuration > Secrets " +
      "and the function has 'secrets: [\"GCP_SEARCH_ENGINE_ID\"]' in its configuration."
    );
  }

  return { apiKey, engineId };
}

/**
 * Call GCP Custom Search API
 */
async function callCustomSearchAPI(
  query: string,
  start: number = 1,
  num: number = 10
): Promise<any> {
  const { apiKey, engineId } = getSearchApiCredentials();
  
  // Log credentials status (masked)
  console.log(`[customSearch] API Key present: ${!!apiKey}, Engine ID present: ${!!engineId}`);
  console.log(`[customSearch] Engine ID: ${engineId?.substring(0, 10)}...`);
  
  const params = new URLSearchParams({
    key: apiKey,
    cx: engineId,
    q: query,
    searchType: "image",
    safe: "active",
    start: start.toString(),
    num: num.toString(),
  });

  const url = `${SEARCH_API_BASE_URL}?${params.toString()}`;
  
  console.log(`[customSearch] Calling API: ${url.replace(apiKey, "***")}`);

  let response: Response;
  try {
    response = await fetch(url);
  } catch (fetchError) {
    console.error(`[customSearch] Fetch failed:`, fetchError);
    throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[customSearch] API error: ${response.status} - ${errorText}`);
    
    // Parse error response if possible
    let errorMessage = `Custom Search API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error?.message) {
        errorMessage = `Custom Search API error: ${errorJson.error.message}`;
      }
    } catch (e) {
      // Ignore JSON parse error, use default message
    }
    
    throw new Error(errorMessage);
  }

  let jsonResponse: any;
  try {
    jsonResponse = await response.json();
  } catch (parseError) {
    console.error(`[customSearch] JSON parse error:`, parseError);
    throw new Error(`Failed to parse API response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }

  return jsonResponse;
}

/**
 * Adapt Google Custom Search API response to our format
 */
function adaptSearchResponse(apiResponse: any): CustomSearchResponse {
  const items: CustomSearchItem[] = [];
  
  console.log(`[customSearch] API response structure:`, {
    hasItems: !!apiResponse.items,
    itemsIsArray: Array.isArray(apiResponse.items),
    itemsCount: apiResponse.items?.length || 0,
    hasSearchInfo: !!apiResponse.searchInformation,
  });
  
  if (apiResponse.items && Array.isArray(apiResponse.items)) {
    apiResponse.items.forEach((item: any, index: number) => {
      try {
        items.push({
          id: `custom_${index}_${Date.now()}`,
          imageUrl: item.link || item.image?.thumbnailLink || "",
          title: item.title || "",
          snippet: item.snippet || "",
          displayLink: item.displayLink || "",
          contextLink: item.image?.contextLink || item.link || "",
          thumbnailUrl: item.image?.thumbnailLink || item.link || "",
        });
      } catch (itemError) {
        console.error(`[customSearch] Error processing item ${index}:`, itemError);
        // Skip invalid items instead of failing
      }
    });
  } else {
    console.warn(`[customSearch] No items found in API response`);
  }

  return {
    success: true,
    items,
    totalResults: parseInt(apiResponse.searchInformation?.totalResults || "0", 10),
    searchTime: parseFloat(apiResponse.searchInformation?.searchTime || "0"),
  };
}

/**
 * Custom Search handler
 */
async function customSearchHandler(
  request: CallableRequest<CustomSearchRequest>
): Promise<CustomSearchResponse> {
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
  if (!checkRateLimit(userId, "CUSTOM_SEARCH")) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Rate limit exceeded. Please try again later."
    );
  }

  const start = Math.max(1, data.start || 1);
  const num = Math.min(Math.max(1, data.num || 10), 10); // Google API max is 10 per request

  try {
    console.log(`[customSearch] Searching for: "${query}" (start: ${start}, num: ${num}) by user ${userId}`);

    // Check credentials before API call
    try {
      const credentials = getSearchApiCredentials();
      console.log(`[customSearch] Credentials check passed: API Key=${!!credentials.apiKey}, Engine ID=${!!credentials.engineId}`);
    } catch (credError) {
      console.error(`[customSearch] Credentials check failed:`, credError);
      // Re-throw credential errors as-is (they're already HttpsError)
      throw credError;
    }

    const apiResponse = await callCustomSearchAPI(query, start, num);
    const adaptedResponse = adaptSearchResponse(apiResponse);

    console.log(`[customSearch] Found ${adaptedResponse.items.length} results`);

    return adaptedResponse;
  } catch (error) {
    // Log detailed error information
    console.error(`[customSearch] Error details:`, {
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      isHttpsError: error instanceof functions.https.HttpsError,
      errorCode: error instanceof functions.https.HttpsError ? error.code : undefined,
    });
    
    // If it's already an HttpsError (from credential check), re-throw as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // Otherwise, wrap with handleError
    throw handleError(error, "customSearch", userId);
  }
}

/**
 * Export the Cloud Function
 */
export const customSearch = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.SEARCH_SIMILAR || 60,
    memory: MEMORY.CUSTOM_SEARCH || "512MiB",
    secrets: ["GCP_SEARCH_API_KEY", "GCP_SEARCH_ENGINE_ID"],
  },
  customSearchHandler
);


