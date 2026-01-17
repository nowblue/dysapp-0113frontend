/**
 * Error Handler Utilities
 * Centralized error handling and logging
 */

import * as functions from "firebase-functions/v2";

/**
 * Mask sensitive information from error messages
 */
function maskSensitiveInfo(message: string): string {
  // Remove potential API keys
  let masked = message.replace(/AIza[0-9A-Za-z_-]{35}/g, "***API_KEY***");
  
  // Remove potential file paths
  masked = masked.replace(/\/[^\s]+/g, "***PATH***");
  
  // Remove potential email addresses
  masked = masked.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "***EMAIL***");
  
  return masked;
}

/**
 * Log error with context
 */
export function logError(
  functionName: string,
  userId: string | null,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const maskedMessage = maskSensitiveInfo(errorMessage);
  
  const logData: Record<string, unknown> = {
    function: functionName,
    userId: userId || "anonymous",
    error: maskedMessage,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Log to console (will be captured by Cloud Logging)
  console.error(`[${functionName}] Error:`, JSON.stringify(logData, null, 2));

  // Log stack trace if available (but mask sensitive info)
  if (error instanceof Error && error.stack) {
    console.error(`[${functionName}] Stack:`, maskSensitiveInfo(error.stack));
  }
}

/**
 * Create user-friendly error response
 */
export function createUserError(
  code: functions.https.FunctionsErrorCode,
  message: string,
  functionName: string,
  userId: string | null,
  originalError?: unknown
): functions.https.HttpsError {
  // Log the original error
  if (originalError) {
    logError(functionName, userId, originalError);
  }

  // Return generic error message to user
  const userMessages: Record<functions.https.FunctionsErrorCode, string> = {
    "ok": "Operation completed successfully",
    "cancelled": "Operation was cancelled",
    "unknown": "An unexpected error occurred. Please try again.",
    "invalid-argument": "Invalid input provided. Please check your request.",
    "deadline-exceeded": "Operation timed out. Please try again.",
    "not-found": "The requested resource was not found.",
    "already-exists": "The resource already exists.",
    "permission-denied": "You don't have permission to perform this action.",
    "resource-exhausted": "Rate limit exceeded. Please try again later.",
    "failed-precondition": "Operation cannot be performed in current state.",
    "aborted": "Operation was aborted.",
    "out-of-range": "Value is out of valid range.",
    "unimplemented": "This feature is not yet implemented.",
    "internal": "An internal error occurred. Please try again later.",
    "unavailable": "Service is temporarily unavailable. Please try again later.",
    "data-loss": "Data loss occurred. Please try again.",
    "unauthenticated": "Authentication required. Please sign in.",
  };

  const userMessage = userMessages[code] || userMessages.unknown;

  return new functions.https.HttpsError(code, userMessage);
}

/**
 * Handle and wrap errors consistently
 */
export function handleError(
  error: unknown,
  functionName: string,
  userId: string | null,
  defaultCode: functions.https.FunctionsErrorCode = "internal"
): functions.https.HttpsError {
  // If already an HttpsError, log and return
  if (error instanceof functions.https.HttpsError) {
    logError(functionName, userId, error);
    return error;
  }

  // Log the error with more context
  logError(functionName, userId, error, {
    errorType: error?.constructor?.name,
    errorMessage: error instanceof Error ? error.message : String(error),
  });

  // Try to determine more specific error code based on error message
  let errorCode: functions.https.FunctionsErrorCode = defaultCode;
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Network/timeout errors
  if (errorMessage.includes("Network") || errorMessage.includes("fetch") || errorMessage.includes("ECONNREFUSED")) {
    errorCode = "unavailable";
  }
  // Timeout errors
  else if (errorMessage.includes("timeout") || errorMessage.includes("deadline")) {
    errorCode = "deadline-exceeded";
  }
  // API errors (4xx)
  else if (errorMessage.includes("400") || errorMessage.includes("Bad Request")) {
    errorCode = "invalid-argument";
  }
  // API errors (401/403)
  else if (errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("Unauthorized") || errorMessage.includes("Forbidden")) {
    errorCode = "permission-denied";
  }
  // API errors (429)
  else if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
    errorCode = "resource-exhausted";
  }
  // API errors (5xx)
  else if (errorMessage.includes("500") || errorMessage.includes("502") || errorMessage.includes("503") || errorMessage.includes("504")) {
    errorCode = "unavailable";
  }

  // Create user-friendly error
  return createUserError(errorCode, "", functionName, userId, error);
}



