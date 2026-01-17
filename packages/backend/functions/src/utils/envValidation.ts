/**
 * Environment Variable Validation
 * Validates required environment variables at startup
 */

/**
 * Validate Google AI API key format
 */
function validateApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== "string") {
    return false;
  }

  // Google API keys typically start with "AIza"
  if (apiKey.length < 20 || apiKey.length > 100) {
    return false;
  }

  // Basic format check
  return /^[A-Za-z0-9_-]+$/.test(apiKey);
}

/**
 * Validate Google Cloud Project ID format
 */
function validateProjectId(projectId: string): boolean {
  if (!projectId || typeof projectId !== "string") {
    return false;
  }

  // Project IDs are lowercase alphanumeric with hyphens
  if (projectId.length < 6 || projectId.length > 30) {
    return false;
  }

  return /^[a-z0-9-]+$/.test(projectId);
}

/**
 * Validate all required environment variables
 */
export function validateEnvironmentVariables(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check Google AI API Key
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    errors.push("GOOGLE_AI_API_KEY or GEMINI_API_KEY is not set");
  } else if (!validateApiKey(apiKey)) {
    errors.push("GOOGLE_AI_API_KEY or GEMINI_API_KEY has invalid format");
  }

  // Check Google Cloud Project ID (for Vertex AI)
  // Firebase Functions v2 automatically sets GOOGLE_CLOUD_PROJECT
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT || 
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT;
  if (!projectId) {
    // Try Firebase Admin fallback
    try {
      const admin = require("firebase-admin");
      if (admin.apps.length > 0 && admin.app().options.projectId) {
        // Project ID available from Firebase Admin, skip error
      } else {
        errors.push("GOOGLE_CLOUD_PROJECT is not set (Firebase Functions v2 should set this automatically)");
      }
    } catch (e) {
      errors.push("GOOGLE_CLOUD_PROJECT is not set");
    }
  } else if (!validateProjectId(projectId)) {
    errors.push("GOOGLE_CLOUD_PROJECT has invalid format");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get validated API key or throw error
 */
export function getValidatedApiKey(): string {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable is not set"
    );
  }

  if (!validateApiKey(apiKey)) {
    throw new Error(
      "GOOGLE_AI_API_KEY or GEMINI_API_KEY has invalid format"
    );
  }

  return apiKey;
}

/**
 * Get validated project ID or throw error
 * Firebase Functions v2 automatically sets GOOGLE_CLOUD_PROJECT
 */
export function getValidatedProjectId(): string {
  // Firebase Functions v2 automatically sets GOOGLE_CLOUD_PROJECT
  // Also check GCLOUD_PROJECT for compatibility
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT || 
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT;

  if (!projectId) {
    // Try to get from Firebase Admin (fallback)
    try {
      const admin = require("firebase-admin");
      if (admin.apps.length > 0) {
        const app = admin.app();
        const projectIdFromApp = app.options.projectId;
        if (projectIdFromApp) {
          return projectIdFromApp;
        }
      }
    } catch (e) {
      // Ignore
    }
    
    throw new Error(
      "GOOGLE_CLOUD_PROJECT environment variable is not set. Firebase Functions v2 should set this automatically."
    );
  }

  if (!validateProjectId(projectId)) {
    throw new Error(
      "GOOGLE_CLOUD_PROJECT has invalid format"
    );
  }

  return projectId;
}

