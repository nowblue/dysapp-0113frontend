/**
 * Centralized Error Handler
 * Provides unified error handling for all API calls and user-facing errors
 * Reference: docs/dysapp_PRD.md - Section 8.3
 */

// Toast will be imported dynamically to avoid circular dependencies
let toast = null;

/**
 * Set toast function (called from app.js after initialization)
 * @param {Object} toastObj - Toast object with success, error, warning, info methods
 */
export function setToast(toastObj) {
  toast = toastObj;
}

/**
 * Get toast function (fallback if not set)
 */
function getToast() {
  if (!toast && typeof window !== "undefined" && window.dysapp?.toast) {
    return window.dysapp.toast;
  }
  return toast;
}

// ============================================================================
// Error Code Mapping
// ============================================================================

/**
 * Firebase error code to user-friendly message mapping
 */
const ERROR_CODE_MAP = {
  // Firebase Functions errors
  "functions/unauthenticated": {
    message: "로그인이 필요합니다. 잠시 후 다시 시도해주세요.",
    action: "auth",
    retryable: true,
  },
  "functions/invalid-argument": {
    message: "입력 정보를 확인해주세요.",
    action: "validation",
    retryable: false,
  },
  "functions/not-found": {
    message: "요청한 정보를 찾을 수 없습니다.",
    action: "redirect",
    redirectTo: "index.html",
    retryable: false,
  },
  "functions/permission-denied": {
    message: "권한이 없습니다.",
    action: "redirect",
    redirectTo: "index.html",
    retryable: false,
  },
  "functions/resource-exhausted": {
    message: "서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.",
    action: "retry",
    retryDelay: 60000,
    retryable: true,
  },
  "functions/internal": {
    message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    action: "retry",
    retryDelay: 3000,
    retryable: true,
  },
  "functions/failed-precondition": {
    message: "분석을 먼저 수행해주세요.",
    action: "redirect",
    redirectTo: "index.html",
    retryable: false,
  },
  "functions/deadline-exceeded": {
    message: "요청 시간이 초과되었습니다. 다시 시도해주세요.",
    action: "retry",
    retryDelay: 3000,
    retryable: true,
  },
  "functions/cancelled": {
    message: "요청이 취소되었습니다.",
    action: "none",
    retryable: false,
  },
  "functions/aborted": {
    message: "요청이 중단되었습니다.",
    action: "none",
    retryable: false,
  },
  "functions/out-of-range": {
    message: "요청 범위를 벗어났습니다.",
    action: "validation",
    retryable: false,
  },
  "functions/unimplemented": {
    message: "아직 구현되지 않은 기능입니다.",
    action: "none",
    retryable: false,
  },
  "functions/data-loss": {
    message: "데이터 손실이 발생했습니다.",
    action: "none",
    retryable: false,
  },
  "functions/unavailable": {
    message: "서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.",
    action: "retry",
    retryDelay: 5000,
    retryable: true,
  },
};

// ============================================================================
// Network Error Detection
// ============================================================================

/**
 * Check if error is a network error
 * @param {Error} error
 * @returns {boolean}
 */
function isNetworkError(error) {
  if (!navigator.onLine) {
    return true;
  }

  const networkErrorPatterns = [
    "Failed to fetch",
    "NetworkError",
    "Network request failed",
    "ERR_CONNECTION_REFUSED",
    "ERR_CONNECTION_TIMED_OUT",
    "ERR_INTERNET_DISCONNECTED",
    "ECONNREFUSED",
    "ETIMEDOUT",
  ];

  const errorMessage = error.message || error.toString();
  return networkErrorPatterns.some((pattern) =>
    errorMessage.includes(pattern)
  );
}

// ============================================================================
// Error Parsing
// ============================================================================

/**
 * Parse error to extract code and message
 * @param {Error} error
 * @returns {{code: string, message: string, originalError: Error}}
 */
export function parseError(error) {
  // Network error
  if (isNetworkError(error)) {
    return {
      code: "network-error",
      message: "네트워크 연결을 확인해주세요.",
      originalError: error,
    };
  }

  // Firebase error with code
  if (error.code) {
    const errorInfo = ERROR_CODE_MAP[error.code] || {
      message: error.message || "알 수 없는 오류가 발생했습니다.",
      action: "none",
      retryable: false,
    };

    return {
      code: error.code,
      message: errorInfo.message,
      action: errorInfo.action,
      retryable: errorInfo.retryable,
      retryDelay: errorInfo.retryDelay,
      redirectTo: errorInfo.redirectTo,
      originalError: error,
    };
  }

  // Generic error
  return {
    code: "unknown",
    message: error.message || "알 수 없는 오류가 발생했습니다.",
    originalError: error,
  };
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Handle API error with user-friendly message and actions
 * @param {Error} error - The error object
 * @param {Object} options - Handling options
 * @param {boolean} options.showToast - Show toast message (default: true)
 * @param {Function} options.onRetry - Retry callback function
 * @param {Function} options.onRedirect - Redirect callback function
 * @param {boolean} options.silent - Don't show any UI feedback (default: false)
 * @returns {Object} Error information object
 */
export function handleApiError(error, options = {}) {
  const {
    showToast = true,
    onRetry = null,
    onRedirect = null,
    silent = false,
  } = options;

  const errorInfo = parseError(error);

  // Log error for debugging
  console.error("[ErrorHandler] API Error:", {
    code: errorInfo.code,
    message: errorInfo.message,
    originalError: errorInfo.originalError,
  });

  // Don't show UI feedback if silent
  if (silent) {
    return errorInfo;
  }

  // Show toast message
  if (showToast) {
    const toastFn = getToast();
    if (toastFn) {
      if (errorInfo.code === "network-error") {
        toastFn.error(errorInfo.message);
      } else if (errorInfo.retryable) {
        toastFn.warning(errorInfo.message);
      } else {
        toastFn.error(errorInfo.message);
      }
    } else {
      // Fallback: console log if toast is not available
      console.error("[ErrorHandler]", errorInfo.message);
    }
  }

  // Handle actions
  switch (errorInfo.action) {
    case "redirect":
      if (errorInfo.redirectTo) {
        if (onRedirect) {
          onRedirect(errorInfo.redirectTo);
        } else {
          setTimeout(() => {
            window.location.href = errorInfo.redirectTo;
          }, 2000);
        }
      }
      break;

    case "retry":
      if (errorInfo.retryable && onRetry) {
        const delay = errorInfo.retryDelay || 3000;
        setTimeout(() => {
          onRetry();
        }, delay);
      }
      break;

    case "auth":
      // Auth errors are handled by firebaseService.js automatically
      // Just show the message
      break;

    case "validation":
      // Validation errors should be handled by the calling code
      break;

    default:
      // No action needed
      break;
  }

  return errorInfo;
}

/**
 * Wrap API call with error handling
 * @param {Function} apiCall - Async function that returns a promise
 * @param {Object} options - Error handling options
 * @returns {Promise} Wrapped promise
 */
export async function withErrorHandling(apiCall, options = {}) {
  try {
    return await apiCall();
  } catch (error) {
    handleApiError(error, options);
    throw error; // Re-throw to allow caller to handle if needed
  }
}

/**
 * Retry API call with exponential backoff
 * @param {Function} apiCall - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @returns {Promise} Result of API call
 */
export async function retryApiCall(apiCall, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      const errorInfo = parseError(error);

      // Don't retry if error is not retryable
      if (!errorInfo.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  throw lastError;
}

// ============================================================================
// Error Boundary (for React-like error boundaries in vanilla JS)
// ============================================================================

/**
 * Error boundary wrapper for async functions
 * @param {Function} fn - Async function to wrap
 * @param {Function} fallback - Fallback function if error occurs
 * @returns {Function} Wrapped function
 */
export function errorBoundary(fn, fallback = null) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorInfo = handleApiError(error, { showToast: true });
      if (fallback) {
        return fallback(errorInfo, ...args);
      }
      throw error;
    }
  };
}

// ============================================================================
// Export
// ============================================================================

export default {
  parseError,
  handleApiError,
  withErrorHandling,
  retryApiCall,
  errorBoundary,
  isNetworkError,
  setToast,
};
