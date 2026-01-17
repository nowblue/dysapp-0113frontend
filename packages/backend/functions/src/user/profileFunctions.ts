/**
 * User Profile & Analysis Functions
 * getAnalyses, getUserProfile, updateUserProfile
 * Reference: docs/dysapp_PRD.md - Section 8.1 (FR-004, FR-005)
 */

import * as functions from "firebase-functions/v2";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  FUNCTIONS_REGION,
  COLLECTIONS,
  TIMEOUTS,
  MEMORY,
  FIRESTORE_DATABASE_ID,
} from "../constants";
import { checkRateLimit } from "../utils/rateLimiter";
import { validateAnalysisId } from "../utils/validation";
import { handleError } from "../utils/errorHandler";
import {
  GetAnalysesRequest,
  GetAnalysesResponse,
  GetUserProfileResponse,
  AnalysisDocument,
  UserDocument,
  AnalysisSummary,
  RegisterUserRequest,
  RegisterUserResponse,
  PrivacyConsent,
} from "../types";

const db = getFirestore(FIRESTORE_DATABASE_ID);

// ============================================================================
// getAnalyses - User's analysis history
// ============================================================================

export async function getAnalysesHandler(
  request: functions.https.CallableRequest<GetAnalysesRequest>
): Promise<GetAnalysesResponse> {
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
  if (!checkRateLimit(userId, "GET_ANALYSES")) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Rate limit exceeded. Please try again later."
    );
  }

  // 3. Parse pagination params
  const limit = Math.min(data.limit || 20, 100);
  const offset = data.offset || 0;

  try {
    console.log(`[getAnalyses] User ${userId}, Limit ${limit}, Offset ${offset}`);

    // 3. Build query
    let query = db
      .collection(COLLECTIONS.ANALYSES)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc");

    // Apply filters
    if (data.filterFormat) {
      query = query.where("formatPrediction", "==", data.filterFormat);
    }

    if (data.filterFixScope) {
      query = query.where("fixScope", "==", data.filterFixScope);
    }

    // Get total count first (for hasMore calculation)
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // Apply pagination
    query = query.offset(offset).limit(limit + 1); // +1 to check hasMore

    // 4. Execute query
    const snapshot = await query.get();

    // 5. Process results
    const analyses: AnalysisSummary[] = [];
    let hasMore = false;

    snapshot.docs.forEach((doc, index) => {
      if (index >= limit) {
        hasMore = true;
        return;
      }

      const data = doc.data() as AnalysisDocument;
      analyses.push({
        id: doc.id,
        fileName: data.fileName,
        imageUrl: data.imageUrl,
        formatPrediction: data.formatPrediction,
        overallScore: data.overallScore,
        fixScope: data.fixScope,
        createdAt: data.createdAt as Timestamp,
      });
    });

    console.log(`[getAnalyses] Returning ${analyses.length} analyses, hasMore: ${hasMore}`);

    return {
      success: true,
      analyses,
      total,
      hasMore,
    };
  } catch (error) {
    throw handleError(error, "getAnalyses", userId);
  }
}

export const getAnalyses = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.GET_ANALYSES,
    memory: MEMORY.DEFAULT,
  },
  getAnalysesHandler
);

// ============================================================================
// getUserProfile - Get user profile data
// ============================================================================

export async function getUserProfileHandler(
  request: functions.https.CallableRequest<Record<string, unknown>>
): Promise<GetUserProfileResponse> {
  // 1. Auth check
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required"
    );
  }

  const userId = request.auth.uid;

  try {
    console.log(`[getUserProfile] User ${userId}`);

    // 2. Get user document
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();

    if (!userDoc.exists) {
      // Create default profile if it doesn't exist
      // Note: For anonymous users, privacyConsent is not set here
      // They must use registerUser to upgrade and provide privacyConsent
      // For email authenticated users, privacyConsent should be provided via registerUser
      const authToken = request.auth.token;
      const isAnonymous = authToken.firebase?.sign_in_provider === "anonymous";
      
      const defaultProfile: UserDocument = {
        uid: userId,
        email: request.auth.token.email || undefined,
        displayName: request.auth.token.name || undefined,
        photoURL: request.auth.token.picture || undefined,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        subscriptionTier: "free",
        analysisCount: 0,
        // privacyConsent is only set via registerUser function
        // Anonymous users must upgrade via registerUser to provide consent
      };

      await db.collection(COLLECTIONS.USERS).doc(userId).set(defaultProfile);
      
      console.log(`[getUserProfile] Created default profile for user ${userId}, Anonymous: ${isAnonymous}`);

      return {
        success: true,
        profile: {
          ...defaultProfile,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      };
    }

    const profile = userDoc.data() as UserDocument;

    return {
      success: true,
      profile,
    };
  } catch (error) {
    throw handleError(error, "getUserProfile", userId);
  }
}

export const getUserProfile = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.GET_USER_PROFILE,
    memory: MEMORY.DEFAULT,
  },
  getUserProfileHandler
);

// ============================================================================
// updateUserProfile - Update user profile data
// ============================================================================

interface UpdateUserProfileRequest {
  displayName?: string;
  preferences?: {
    preferredFormats?: string[];
    preferredColors?: string[];
    language?: string;
  };
}

export async function updateUserProfileHandler(
  request: functions.https.CallableRequest<UpdateUserProfileRequest>
): Promise<{ success: boolean }> {
  // 1. Auth check
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required"
    );
  }

  const userId = request.auth.uid;
  const data = request.data || {}; // null/undefined 체크

  try {
    // 2. Request data validation
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid request data: data must be an object"
      );
    }

    console.log(`[updateUserProfile] User ${userId}`, JSON.stringify(data));

    // 3. Build update object with validation
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (data.displayName !== undefined) {
      if (typeof data.displayName !== 'string') {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "displayName must be a string"
        );
      }
      if (data.displayName.trim().length === 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "displayName cannot be empty"
        );
      }
      updates.displayName = data.displayName.trim();
    }

    if (data.preferences !== undefined) {
      if (typeof data.preferences !== 'object' || data.preferences === null || Array.isArray(data.preferences)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "preferences must be an object"
        );
      }
      // preferences 구조 검증
      if (data.preferences.preferredFormats !== undefined && !Array.isArray(data.preferences.preferredFormats)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "preferences.preferredFormats must be an array"
        );
      }
      if (data.preferences.preferredColors !== undefined && !Array.isArray(data.preferences.preferredColors)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "preferences.preferredColors must be an array"
        );
      }
      if (data.preferences.language !== undefined && typeof data.preferences.language !== 'string') {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "preferences.language must be a string"
        );
      }
      updates.preferences = data.preferences;
    }

    // 4. Check if there are any fields to update (besides updatedAt)
    if (Object.keys(updates).length === 1) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "No valid fields to update. Provide displayName or preferences."
      );
    }

    // 5. Update user document
    await db.collection(COLLECTIONS.USERS).doc(userId).update(updates);

    console.log(`[updateUserProfile] Profile updated for user ${userId}`);

    return { success: true };
  } catch (error) {
    // HttpsError는 그대로 전달
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    // 기타 에러는 handleError로 처리
    throw handleError(error, "updateUserProfile", userId);
  }
}

export const updateUserProfile = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.GET_USER_PROFILE,
    memory: MEMORY.DEFAULT,
  },
  updateUserProfileHandler
);

// ============================================================================
// getAnalysis - Get single analysis by ID
// ============================================================================

interface GetAnalysisRequest {
  analysisId: string;
}

interface GetAnalysisResponse {
  success: boolean;
  analysis: AnalysisDocument | null;
}

export async function getAnalysisHandler(
  request: functions.https.CallableRequest<GetAnalysisRequest>
): Promise<GetAnalysisResponse> {
  // 1. Auth check
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required"
    );
  }

  const userId = request.auth.uid;
  const { analysisId } = request.data;

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

  try {
    console.log(`[getAnalysis] User ${userId}, Analysis ${analysisId}`);

    // 2. Get analysis document
    const analysisDoc = await db
      .collection(COLLECTIONS.ANALYSES)
      .doc(analysisId)
      .get();

    if (!analysisDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Analysis not found");
    }

    const analysis = analysisDoc.data() as AnalysisDocument;

    // 3. Verify ownership
    if (analysis.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not your analysis"
      );
    }

    return {
      success: true,
      analysis,
    };
  } catch (error) {
    throw handleError(error, "getAnalysis", userId);
  }
}

export const getAnalysis = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.GET_ANALYSES,
    memory: MEMORY.DEFAULT,
  },
  getAnalysisHandler
);

// ============================================================================
// deleteAnalysis - Delete an analysis
// ============================================================================

interface DeleteAnalysisRequest {
  analysisId: string;
}

export async function deleteAnalysisHandler(
  request: functions.https.CallableRequest<DeleteAnalysisRequest>
): Promise<{ success: boolean }> {
  // 1. Auth check
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required"
    );
  }

  const userId = request.auth.uid;
  const { analysisId } = request.data;

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

  try {
    console.log(`[deleteAnalysis] User ${userId}, Analysis ${analysisId}`);

    // 2. Get analysis document to verify ownership
    const analysisDoc = await db
      .collection(COLLECTIONS.ANALYSES)
      .doc(analysisId)
      .get();

    if (!analysisDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Analysis not found");
    }

    const analysis = analysisDoc.data() as AnalysisDocument;

    // 3. Verify ownership
    if (analysis.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not your analysis"
      );
    }

    // 4. Delete analysis
    await db.collection(COLLECTIONS.ANALYSES).doc(analysisId).delete();

    // 5. Update user analysis count
    await db.collection(COLLECTIONS.USERS).doc(userId).update({
      analysisCount: FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[deleteAnalysis] Analysis ${analysisId} deleted`);

    return { success: true };
  } catch (error) {
    throw handleError(error, "deleteAnalysis", userId);
  }
}

export const deleteAnalysis = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.GET_ANALYSES,
    memory: MEMORY.DEFAULT,
  },
  deleteAnalysisHandler
);

// ============================================================================
// registerUser - Register new user or upgrade anonymous account
// ============================================================================

export async function registerUserHandler(
  request: functions.https.CallableRequest<RegisterUserRequest>
): Promise<RegisterUserResponse> {
  // 1. Auth check
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required"
    );
  }

  const userId = request.auth.uid;
  const data = request.data;
  // Check if user is anonymous (for logging purposes)
  // In Firebase Auth, anonymous users have sign_in_provider = "anonymous"
  const authToken = request.auth.token;
  const isAnonymous = authToken.firebase?.sign_in_provider === "anonymous";

  try {
    // 2. Validate request data
    if (!data.email || typeof data.email !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email is required"
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid email format"
      );
    }

    // Validate privacy consent
    if (!data.privacyConsent || !data.privacyConsent.consented) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Privacy consent is required"
      );
    }

    if (!data.privacyConsent.version || typeof data.privacyConsent.version !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Privacy consent version is required"
      );
    }

    console.log(`[registerUser] User ${userId}, Email ${data.email}, Anonymous: ${isAnonymous}`);

    // 3. Build privacy consent object
    // Note: IP address is optional and may not be available in callable functions
    const privacyConsent: PrivacyConsent = {
      consented: true,
      version: data.privacyConsent.version,
      agreedAt: FieldValue.serverTimestamp(),
      ip: data.privacyConsent.ip || undefined, // IP is optional, not available in callable context
    };

    // 4. Get or create user document
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();

    if (userDoc.exists) {
      // Update existing user (anonymous upgrade case)
      const updates: Record<string, unknown> = {
        email: data.email,
        updatedAt: FieldValue.serverTimestamp(),
        privacyConsent,
      };

      if (data.displayName) {
        updates.displayName = data.displayName.trim();
      }

      await db.collection(COLLECTIONS.USERS).doc(userId).update(updates);

      console.log(`[registerUser] Updated user ${userId} (anonymous upgrade)`);

      return {
        success: true,
        userId,
        email: data.email,
        isAnonymousUpgrade: true,
      };
    } else {
      // Create new user document
      const newUser: UserDocument = {
        uid: userId,
        email: data.email,
        displayName: data.displayName?.trim() || undefined,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        subscriptionTier: "free",
        analysisCount: 0,
        privacyConsent,
      };

      await db.collection(COLLECTIONS.USERS).doc(userId).set(newUser);

      console.log(`[registerUser] Created new user ${userId}`);

      return {
        success: true,
        userId,
        email: data.email,
        isAnonymousUpgrade: false,
      };
    }
  } catch (error) {
    // HttpsError는 그대로 전달
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    // 기타 에러는 handleError로 처리
    throw handleError(error, "registerUser", userId);
  }
}

export const registerUser = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.GET_USER_PROFILE,
    memory: MEMORY.DEFAULT,
  },
  registerUserHandler
);
