/**
 * API Service
 * Cloud Functions API wrapper for dysapp
 * Reference: docs/dysapp_PRD.md - Section 8.1, 15.8
 */

import { callFunction, ensureAuth } from "./firebaseService.js";
import { handleApiError, withErrorHandling, parseError as parseErrorFromHandler } from "./errorHandler.js";
import { setLocalState, getLocalState, removeLocalState, clearState } from "../utils/stateManager.js";
import { mockData, isMockModeEnabled } from "./mockData.js";

// ============================================================================
// Constants
// ============================================================================

const FUNCTION_NAMES = {
  ANALYZE_DESIGN: "analyzeDesign",
  CHAT_WITH_MENTOR: "chatWithMentor",
  SEARCH_SIMILAR: "searchSimilar",
  SEARCH_TEXT: "searchText",
  CUSTOM_SEARCH: "customSearch",
  SAVE_ITEM: "saveItem",
  GET_BOOKMARKS: "getBookmarks",
  DELETE_BOOKMARK: "deleteBookmark",
  GET_ANALYSES: "getAnalyses",
  GET_ANALYSIS: "getAnalysis",
  GET_USER_PROFILE: "getUserProfile",
  UPDATE_USER_PROFILE: "updateUserProfile",
  DELETE_ANALYSIS: "deleteAnalysis",
  REGISTER_USER: "registerUser",
  HEALTH_CHECK: "healthCheck",
};

// ============================================================================
// Analysis APIs
// ============================================================================

/**
 * Analyze a design image
 * @param {Object} params
 * @param {string} params.imageData - Base64 encoded image data
 * @param {string} params.mimeType - Image MIME type (image/jpeg, image/png, etc.)
 * @param {string} params.fileName - Original file name
 * @param {string} [params.userPrompt] - Optional user prompt
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeDesign({ imageData, mimeType, fileName, userPrompt }) {
  // Check mock mode
  if (isMockModeEnabled()) {
    const result = await mockData.analyzeDesign({ imageData, mimeType, fileName, userPrompt });
    if (result.success && result.analysisId) {
      setLocalState("lastAnalysisId", result.analysisId);
    }
    return result;
  }

  return withErrorHandling(async () => {
    try {
      await ensureAuth();
    } catch (error) {
      // 인증 실패 시 더 명확한 에러 메시지
      if (error.message?.includes("익명 인증이 활성화되지 않았습니다")) {
        throw new Error("Firebase 설정 오류: 관리자에게 문의하세요");
      }
      throw new Error("인증에 실패했습니다. 페이지를 새로고침해주세요");
    }

    if (!imageData || !mimeType || !fileName) {
      throw new Error("Missing required fields: imageData, mimeType, fileName");
    }

    const result = await callFunction(FUNCTION_NAMES.ANALYZE_DESIGN, {
      imageData,
      mimeType,
      fileName,
      userPrompt,
    });

    // Store analysisId in localStorage for navigation
    if (result.success && result.analysisId) {
      setLocalState("lastAnalysisId", result.analysisId);
    }

    return result;
  }, { showToast: true });
}

/**
 * Get a single analysis by ID
 * @param {string} analysisId
 * @returns {Promise<Object>} Analysis document
 */
export async function getAnalysis(analysisId) {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.getAnalysis(analysisId);
  }

  return withErrorHandling(async () => {
    await ensureAuth();

    if (!analysisId) {
      throw new Error("Missing analysisId");
    }

    return callFunction(FUNCTION_NAMES.GET_ANALYSIS, { analysisId });
  }, { showToast: true });
}

/**
 * Get user's analysis history
 * @param {Object} [params]
 * @param {number} [params.limit=20]
 * @param {number} [params.offset=0]
 * @param {string} [params.filterFormat]
 * @param {string} [params.filterFixScope]
 * @returns {Promise<Object>} List of analyses
 */
export async function getAnalyses(params = {}) {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.getAnalyses(params);
  }

  return withErrorHandling(async () => {
    await ensureAuth();

    return callFunction(FUNCTION_NAMES.GET_ANALYSES, {
    limit: params.limit || 20,
    offset: params.offset || 0,
    filterFormat: params.filterFormat,
    filterFixScope: params.filterFixScope,
  });
  }, { showToast: true });
}

/**
 * Delete an analysis
 * @param {string} analysisId
 * @returns {Promise<Object>}
 */
export async function deleteAnalysis(analysisId) {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.deleteAnalysis(analysisId);
  }

  return withErrorHandling(async () => {
    await ensureAuth();

    if (!analysisId) {
      throw new Error("Missing analysisId");
    }

    return callFunction(FUNCTION_NAMES.DELETE_ANALYSIS, { analysisId });
  }, { showToast: true });
}

// ============================================================================
// Chat APIs
// ============================================================================

/**
 * Send message to AI mentor
 * @param {Object} params
 * @param {string} params.analysisId - Analysis ID for context
 * @param {string} params.message - User message
 * @param {string} [params.sessionId] - Existing session ID (optional)
 * @returns {Promise<Object>} Chat response
 */
export async function chatWithMentor({ analysisId, message, sessionId }) {
  // Check mock mode
  if (isMockModeEnabled()) {
    const result = await mockData.chatWithMentor({ analysisId, message, sessionId });
    if (result.success && result.sessionId) {
      const sessionKey = `chatSession_${analysisId}`;
      setLocalState(sessionKey, result.sessionId);
    }
    return result;
  }

  return withErrorHandling(async () => {
    await ensureAuth();

    if (!analysisId || !message) {
      throw new Error("Missing required fields: analysisId, message");
    }

    const result = await callFunction(FUNCTION_NAMES.CHAT_WITH_MENTOR, {
      analysisId,
      message,
      sessionId,
    });

  // Store sessionId for continuing conversation
  if (result.success && result.sessionId) {
    const sessionKey = `chatSession_${analysisId}`;
    setLocalState(sessionKey, result.sessionId);
  }

    return result;
  }, { showToast: true });
}

/**
 * Get stored session ID for an analysis
 * @param {string} analysisId
 * @returns {string|null}
 */
export function getStoredSessionId(analysisId) {
  const sessionKey = `chatSession_${analysisId}`;
  return getLocalState(sessionKey);
}

// ============================================================================
// Search APIs
// ============================================================================

/**
 * Search for similar designs
 * @param {Object} params
 * @param {string} params.analysisId - Source analysis ID
 * @param {number} [params.limit=10]
 * @param {string} [params.filterFormat]
 * @param {string} [params.filterFixScope]
 * @param {number} [params.minScore]
 * @returns {Promise<Object>} Search results
 */
export async function searchSimilar(params) {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.searchSimilar(params);
  }

  return withErrorHandling(async () => {
    await ensureAuth();

    const { analysisId } = params;

    if (!analysisId) {
      throw new Error("Missing analysisId");
    }

    return callFunction(FUNCTION_NAMES.SEARCH_SIMILAR, {
      analysisId,
      limit: params.limit || 10,
      filterFormat: params.filterFormat,
      filterFixScope: params.filterFixScope,
      minScore: params.minScore,
    });
  }, { showToast: true });
}

/**
 * Search designs by OCR text content
 * @param {Object} params
 * @param {string} params.query - Text query to search for
 * @param {number} [params.limit=20]
 * @param {string} [params.filterFormat]
 * @param {string} [params.filterFixScope]
 * @param {number} [params.minScore]
 * @returns {Promise<Object>} Search results
 */
export async function searchText(params) {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.searchText(params);
  }

  return withErrorHandling(async () => {
    await ensureAuth();

    const { query } = params;

    if (!query || query.trim().length < 2) {
      throw new Error("Query must be at least 2 characters");
    }

    return callFunction(FUNCTION_NAMES.SEARCH_TEXT, {
      query: query.trim(),
      limit: params.limit || 20,
      filterFormat: params.filterFormat,
      filterFixScope: params.filterFixScope,
      minScore: params.minScore,
    });
  }, { showToast: true });
}

/**
 * Search images using GCP Custom Search API
 * @param {Object} params
 * @param {string} params.query - Search query string
 * @param {number} [params.start=1] - Pagination start index
 * @param {number} [params.num=10] - Number of results per page
 * @returns {Promise<Object>} Search results
 */
export async function customSearch(params) {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.customSearch(params);
  }

  return withErrorHandling(async () => {
    await ensureAuth();

    const { query } = params;

    if (!query || query.trim().length < 2) {
      throw new Error("Query must be at least 2 characters");
    }

    return callFunction(FUNCTION_NAMES.CUSTOM_SEARCH, {
      query: query.trim(),
      start: params.start || 1,
      num: params.num || 10,
    });
  }, { showToast: true });
}

/**
 * Save an analysis to user's bookmarks
 * @param {Object} params
 * @param {string} params.analysisId - Analysis ID to save
 * @returns {Promise<Object>} Save result
 */
export async function saveItem(params) {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.saveItem(params);
  }

  return withErrorHandling(async () => {
    await ensureAuth();

    const { analysisId } = params;

    if (!analysisId) {
      throw new Error("Missing analysisId");
    }

    return callFunction(FUNCTION_NAMES.SAVE_ITEM, { analysisId });
  }, { showToast: true });
}

/**
 * Get user's bookmarks
 * @param {Object} [params]
 * @param {number} [params.limit=20] - Number of bookmarks to fetch
 * @param {string} [params.startAfter] - Bookmark ID for pagination
 * @returns {Promise<Object>} Bookmarks list with analysis metadata
 */
export async function getBookmarks(params = {}) {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.getBookmarks(params);
  }

  return withErrorHandling(async () => {
    await ensureAuth();

    return callFunction(FUNCTION_NAMES.GET_BOOKMARKS, {
      limit: params.limit || 20,
      startAfter: params.startAfter,
    });
  }, { showToast: true });
}

/**
 * Delete a bookmark
 * @param {Object} params
 * @param {string} params.bookmarkId - Bookmark ID to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteBookmark(params) {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.deleteBookmark(params);
  }

  return withErrorHandling(async () => {
    await ensureAuth();

    const { bookmarkId } = params;

    if (!bookmarkId) {
      throw new Error("Missing bookmarkId");
    }

    return callFunction(FUNCTION_NAMES.DELETE_BOOKMARK, { bookmarkId });
  }, { showToast: true });
}

// ============================================================================
// User Profile APIs
// ============================================================================

/**
 * Get user profile
 * @returns {Promise<Object>} User profile
 */
export async function getUserProfile() {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.getUserProfile();
  }

  return withErrorHandling(async () => {
    await ensureAuth();
    return callFunction(FUNCTION_NAMES.GET_USER_PROFILE, {});
  }, { showToast: true });
}

/**
 * Update user profile
 * @param {Object} params
 * @param {string} [params.displayName]
 * @param {Object} [params.preferences]
 * @returns {Promise<Object>}
 */
export async function updateUserProfile(params) {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.updateUserProfile(params);
  }

  return withErrorHandling(async () => {
    await ensureAuth();
    return callFunction(FUNCTION_NAMES.UPDATE_USER_PROFILE, params);
  }, { showToast: true });
}

/**
 * Register new user
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} [params.displayName]
 * @param {Object} params.privacyConsent
 * @param {boolean} params.privacyConsent.consented
 * @param {string} params.privacyConsent.version
 * @param {string} [params.privacyConsent.ip]
 * @returns {Promise<Object>}
 */
export async function registerUser(params) {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.registerUser(params);
  }

  return withErrorHandling(async () => {
    const { email, password, displayName, privacyConsent } = params;
    
    if (!email || !password) {
      throw new Error("이메일과 비밀번호를 입력해주세요");
    }
    
    if (!privacyConsent || !privacyConsent.consented) {
      throw new Error("개인정보처리방침에 동의해주세요");
    }
    
    // Check if user is anonymous
    const { getCurrentUser } = await import("./firebaseService.js");
    const user = getCurrentUser();
    const isAnonymous = user && user.isAnonymous;
    
    if (isAnonymous) {
      // Link anonymous account
      const { linkAnonymousWithEmailPassword, updateUserProfile } = await import("./firebaseService.js");
      await linkAnonymousWithEmailPassword(email, password);
      
      // Update display name if provided
      if (displayName) {
        await updateUserProfile({ displayName });
      }
    } else {
      // Create new account
      const { createUserWithEmailPassword, updateUserProfile } = await import("./firebaseService.js");
      await createUserWithEmailPassword(email, password);
      
      // Update display name if provided
      if (displayName) {
        await updateUserProfile({ displayName });
      }
    }
    
    // Call backend to save profile and privacy consent
    await ensureAuth();
    return callFunction(FUNCTION_NAMES.REGISTER_USER, {
      email,
      displayName,
      privacyConsent,
    });
  }, { showToast: true });
}

// ============================================================================
// Utility APIs
// ============================================================================

/**
 * Health check
 * @returns {Promise<Object>}
 */
export async function healthCheck() {
  // Check mock mode
  if (isMockModeEnabled()) {
    return await mockData.healthCheck();
  }

  return withErrorHandling(async () => {
    return callFunction(FUNCTION_NAMES.HEALTH_CHECK, {});
  }, { showToast: false, silent: true });
}

// ============================================================================
// File Utilities
// ============================================================================

/**
 * Read file as base64
 * @param {File} file
 * @returns {Promise<{data: string, mimeType: string, fileName: string}>}
 */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      // Remove data URL prefix to get pure base64
      const base64 = reader.result.split(",")[1];
      resolve({
        data: base64,
        mimeType: file.type,
        fileName: file.name,
      });
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 * @param {File} file
 * @returns {{valid: boolean, error?: string}}
 */
export function validateImageFile(file) {
  const MAX_SIZE_MB = 10;
  const VALID_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (!VALID_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Supported: ${VALID_TYPES.join(", ")}`,
    };
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_SIZE_MB}MB`,
    };
  }

  return { valid: true };
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Parse Firebase function error (deprecated - use errorHandler.parseError instead)
 * @deprecated Use errorHandler.parseError for consistent error handling
 * @param {Error} error
 * @returns {{code: string, message: string}}
 */
export function parseError(error) {
  // Re-export from errorHandler for backward compatibility
  return parseErrorFromHandler(error);
}

// ============================================================================
// LocalStorage Helpers
// ============================================================================

/**
 * Get last analysis ID from localStorage
 * @returns {string|null}
 */
export function getLastAnalysisId() {
  return getLocalState("lastAnalysisId");
}

/**
 * Clear analysis data from localStorage
 */
export function clearAnalysisData() {
  removeLocalState("lastAnalysisId");
  // Clear all chat sessions
  clearState({ prefix: "chatSession_", storage: "localStorage" });
}
