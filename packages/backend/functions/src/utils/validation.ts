/**
 * Input Validation Utilities
 * Sanitization and validation for user inputs
 */

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, "");

  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");

  return sanitized.trim();
}

/**
 * Validate and sanitize filename
 */
export function validateFileName(fileName: string): string {
  if (!fileName || typeof fileName !== "string") {
    throw new Error("Invalid filename");
  }

  // Remove path traversal attempts
  let sanitized = fileName.replace(/\.\./g, "").replace(/\//g, "_");

  // Remove special characters except alphanumeric, dash, underscore, dot
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }

  // Ensure it's not empty
  if (sanitized.length === 0) {
    throw new Error("Filename cannot be empty after sanitization");
  }

  return sanitized;
}

/**
 * Validate base64 image data
 */
export function validateBase64Image(base64Data: string): {
  valid: boolean;
  error?: string;
} {
  if (!base64Data || typeof base64Data !== "string") {
    return { valid: false, error: "Invalid base64 data" };
  }

  // Check base64 format
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64Data)) {
    return { valid: false, error: "Invalid base64 format" };
  }

  // Check minimum length (at least a small image header)
  if (base64Data.length < 100) {
    return { valid: false, error: "Base64 data too short" };
  }

  // Check maximum length (10MB base64 encoded ≈ 13.3MB)
  const maxLength = 13.3 * 1024 * 1024;
  if (base64Data.length > maxLength) {
    return { valid: false, error: "Base64 data too large" };
  }

  return { valid: true };
}

/**
 * Validate MIME type
 */
export function validateMimeType(mimeType: string): boolean {
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  return validTypes.includes(mimeType);
}

/**
 * Validate analysis ID format
 */
export function validateAnalysisId(analysisId: string): boolean {
  if (!analysisId || typeof analysisId !== "string") {
    return false;
  }

  // Firestore document IDs are alphanumeric and can contain underscores
  const idRegex = /^[a-zA-Z0-9_-]{1,1024}$/;
  return idRegex.test(analysisId);
}

/**
 * Validate session ID format
 */
export function validateSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== "string") {
    return false;
  }

  const idRegex = /^[a-zA-Z0-9_-]{1,1024}$/;
  return idRegex.test(sessionId);
}

/**
 * Validate chat message
 */
export function validateChatMessage(message: string): {
  valid: boolean;
  sanitized?: string;
  error?: string;
} {
  if (!message || typeof message !== "string") {
    return { valid: false, error: "Message is required" };
  }

  if (message.length === 0) {
    return { valid: false, error: "Message cannot be empty" };
  }

  if (message.length > 5000) {
    return { valid: false, error: "Message too long (max 5000 characters)" };
  }

  // Sanitize but preserve basic formatting
  const sanitized = sanitizeString(message);

  if (sanitized.length === 0) {
    return { valid: false, error: "Message contains only invalid characters" };
  }

  return { valid: true, sanitized };
}



