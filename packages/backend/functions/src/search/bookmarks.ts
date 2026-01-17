/**
 * Bookmarks Cloud Functions
 * Get user bookmarks and delete bookmarks
 */

import * as functions from "firebase-functions/v2";
import { CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
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

// ============================================================================
// Get Bookmarks
// ============================================================================

export interface GetBookmarksRequest {
  limit?: number;
  startAfter?: string; // bookmarkId for pagination
}

export interface BookmarkItem {
  bookmarkId: string;
  analysisId: string;
  createdAt: string;
  updatedAt: string;
  // Analysis metadata
  analysis?: {
    id: string;
    imageUrl?: string;
    formatPrediction?: string;
    overallScore?: number;
    createdAt?: string;
  };
}

export interface GetBookmarksResponse {
  success: boolean;
  bookmarks: BookmarkItem[];
  hasMore: boolean;
  nextStartAfter?: string;
}

async function getBookmarksHandler(
  request: CallableRequest<GetBookmarksRequest>
): Promise<GetBookmarksResponse> {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const data = request.data || {};
  const limit = data.limit || 20;
  const startAfter = data.startAfter;

  // Check rate limit
  if (!checkRateLimit(userId, "GET_BOOKMARKS")) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Rate limit exceeded. Please try again later."
    );
  }

  try {
    let query = db.collection(COLLECTIONS.BOOKMARKS)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit + 1); // Fetch one extra to check if there are more

    if (startAfter) {
      const startAfterDoc = await db.collection(COLLECTIONS.BOOKMARKS).doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const bookmarksSnapshot = await query.get();
    const hasMore = bookmarksSnapshot.docs.length > limit;
    const bookmarksDocs = hasMore 
      ? bookmarksSnapshot.docs.slice(0, limit)
      : bookmarksSnapshot.docs;

    // Fetch analysis metadata for each bookmark
    const bookmarks: BookmarkItem[] = await Promise.all(
      bookmarksDocs.map(async (doc) => {
        const bookmarkData = doc.data();
        const bookmark: BookmarkItem = {
          bookmarkId: doc.id,
          analysisId: bookmarkData.analysisId,
          createdAt: bookmarkData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: bookmarkData.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };

        // Fetch analysis metadata
        try {
          const analysisDoc = await db.collection(COLLECTIONS.ANALYSES)
            .doc(bookmarkData.analysisId)
            .get();
          
          if (analysisDoc.exists) {
            const analysisData = analysisDoc.data();
            bookmark.analysis = {
              id: analysisDoc.id,
              imageUrl: analysisData?.imageUrl,
              formatPrediction: analysisData?.formatPrediction,
              overallScore: analysisData?.overallScore,
              createdAt: analysisData?.createdAt?.toDate?.()?.toISOString(),
            };
          }
        } catch (error) {
          console.warn(`[getBookmarks] Failed to fetch analysis ${bookmarkData.analysisId}:`, error);
          // Continue without analysis metadata
        }

        return bookmark;
      })
    );

    const nextStartAfter = hasMore && bookmarks.length > 0
      ? bookmarks[bookmarks.length - 1].bookmarkId
      : undefined;

    console.log(`[getBookmarks] Retrieved ${bookmarks.length} bookmarks for user ${userId}`);

    return {
      success: true,
      bookmarks,
      hasMore,
      nextStartAfter,
    };
  } catch (error) {
    throw handleError(error, "getBookmarks", userId);
  }
}

export const getBookmarks = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.GET_ANALYSES || 60,
    memory: MEMORY.DEFAULT,
  },
  getBookmarksHandler
);

// ============================================================================
// Delete Bookmark
// ============================================================================

export interface DeleteBookmarkRequest {
  bookmarkId: string;
}

export interface DeleteBookmarkResponse {
  success: boolean;
  message: string;
}

async function deleteBookmarkHandler(
  request: CallableRequest<DeleteBookmarkRequest>
): Promise<DeleteBookmarkResponse> {
  const userId = request.auth?.uid;
  if (!userId) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const data = request.data;
  const { bookmarkId } = data;
  if (!bookmarkId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing bookmarkId"
    );
  }

  // Check rate limit
  if (!checkRateLimit(userId, "DELETE_BOOKMARK")) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Rate limit exceeded. Please try again later."
    );
  }

  try {
    // Verify bookmark exists and belongs to user
    const bookmarkDoc = await db.collection(COLLECTIONS.BOOKMARKS).doc(bookmarkId).get();
    
    if (!bookmarkDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Bookmark not found"
      );
    }

    const bookmarkData = bookmarkDoc.data();
    if (bookmarkData?.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You don't have permission to delete this bookmark"
      );
    }

    // Delete bookmark
    await db.collection(COLLECTIONS.BOOKMARKS).doc(bookmarkId).delete();

    console.log(`[deleteBookmark] Deleted bookmark ${bookmarkId} for user ${userId}`);

    return {
      success: true,
      message: "북마크가 삭제되었습니다",
    };
  } catch (error) {
    throw handleError(error, "deleteBookmark", userId);
  }
}

export const deleteBookmark = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.GET_ANALYSES || 30,
    memory: MEMORY.DEFAULT,
  },
  deleteBookmarkHandler
);
