/**
 * saveItem Cloud Function
 * Save a design analysis to user's bookmarks
 */

import * as functions from "firebase-functions/v2";
import { CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  FUNCTIONS_REGION,
  COLLECTIONS,
  TIMEOUTS,
  MEMORY,
  FIRESTORE_DATABASE_ID,
} from "../constants";
import { checkRateLimit } from "../utils/rateLimiter";
import { handleError } from "../utils/errorHandler";

const db = getFirestore(FIRESTORE_DATABASE_ID);

export interface SaveItemRequest {
  analysisId: string;
}

export interface SaveItemResponse {
  success: boolean;
  bookmarkId?: string;
  message: string;
}

async function saveItemHandler(
  request: CallableRequest<SaveItemRequest>
): Promise<SaveItemResponse> {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const data = request.data;
  const { analysisId } = data;
  if (!analysisId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing analysisId"
    );
  }

  // Check rate limit
  if (!checkRateLimit(userId, "SAVE_ITEM")) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Rate limit exceeded. Please try again later."
    );
  }

  try {
    // Check if analysis exists and user has access
    const analysisDoc = await db.collection(COLLECTIONS.ANALYSES).doc(analysisId).get();
    
    if (!analysisDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Analysis not found"
      );
    }

    const analysisData = analysisDoc.data();
    if (analysisData?.userId !== userId && !analysisData?.isPublic) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You don't have access to this analysis"
      );
    }

    // Check if already bookmarked
    const existingBookmark = await db.collection(COLLECTIONS.BOOKMARKS)
      .where("userId", "==", userId)
      .where("analysisId", "==", analysisId)
      .limit(1)
      .get();

    if (!existingBookmark.empty) {
      return {
        success: true,
        bookmarkId: existingBookmark.docs[0].id,
        message: "이미 저장된 항목입니다",
      };
    }

    // Create bookmark
    const bookmarkRef = await db.collection(COLLECTIONS.BOOKMARKS).add({
      userId,
      analysisId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[saveItem] Saved bookmark ${bookmarkRef.id} for user ${userId}`);

    return {
      success: true,
      bookmarkId: bookmarkRef.id,
      message: "저장되었습니다",
    };
  } catch (error) {
    throw handleError(error, "saveItem", userId);
  }
}

export const saveItem = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.GET_ANALYSES || 30,
    memory: MEMORY.DEFAULT,
  },
  saveItemHandler
);

