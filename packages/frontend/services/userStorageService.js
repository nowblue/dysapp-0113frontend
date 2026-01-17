/**
 * User Storage Service
 * 사용자별 저장소 검증 및 초기화 유틸리티
 * 
 * 기능:
 * - Firestore users/{uid} 문서 존재 확인
 * - 사용자 프로필 로드 검증
 * - Storage 경로 접근 가능 여부 확인
 * - 저장소 초기화 (필요 시)
 */

import { getDocument } from './firebaseService.js';
import { getUserProfile } from './apiService.js';

// ============================================================================
// Constants
// ============================================================================

const COLLECTIONS = {
  USERS: 'users',
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1초

// ============================================================================
// User Storage Verification
// ============================================================================

/**
 * Verify user storage exists
 * Firestore users/{uid} 문서 존재 확인
 * 
 * @param {string} userId - User ID (Firebase Auth UID)
 * @param {number} [retries=MAX_RETRIES] - Maximum retry attempts
 * @returns {Promise<{exists: boolean, profile: Object|null, error: Error|null}>}
 */
export async function verifyUserStorage(userId, retries = MAX_RETRIES) {
  if (!userId) {
    return {
      exists: false,
      profile: null,
      error: new Error('User ID is required'),
    };
  }

  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Try to get user document from Firestore
      const userDoc = await getDocument(COLLECTIONS.USERS, userId);
      
      if (userDoc) {
        console.log(`[UserStorage] User storage verified: ${userId}`);
        return {
          exists: true,
          profile: userDoc,
          error: null,
        };
      }

      // Document doesn't exist yet
      if (attempt < retries) {
        console.log(`[UserStorage] User document not found (attempt ${attempt}/${retries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }

      return {
        exists: false,
        profile: null,
        error: new Error('User document not found'),
      };
    } catch (error) {
      lastError = error;
      console.error(`[UserStorage] Verification failed (attempt ${attempt}/${retries}):`, error);
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }
    }
  }

  return {
    exists: false,
    profile: null,
    error: lastError || new Error('Verification failed after all retries'),
  };
}

/**
 * Verify user profile via API
 * API를 통해 사용자 프로필 로드 성공 확인
 * 
 * @param {string} userId - User ID (Firebase Auth UID)
 * @param {number} [retries=MAX_RETRIES] - Maximum retry attempts
 * @returns {Promise<{success: boolean, profile: Object|null, error: Error|null}>}
 */
export async function verifyUserProfile(userId, retries = MAX_RETRIES) {
  if (!userId) {
    return {
      success: false,
      profile: null,
      error: new Error('User ID is required'),
    };
  }

  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await getUserProfile();
      
      if (response && response.success && response.profile) {
        // Verify the profile belongs to the current user
        if (response.profile.uid === userId || response.profile.id === userId) {
          console.log(`[UserStorage] User profile verified via API: ${userId}`);
          return {
            success: true,
            profile: response.profile,
            error: null,
          };
        }
      }

      if (attempt < retries) {
        console.log(`[UserStorage] Profile verification failed (attempt ${attempt}/${retries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }

      return {
        success: false,
        profile: null,
        error: new Error('Profile verification failed'),
      };
    } catch (error) {
      lastError = error;
      console.error(`[UserStorage] Profile verification error (attempt ${attempt}/${retries}):`, error);
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }
    }
  }

  return {
    success: false,
    profile: null,
    error: lastError || new Error('Profile verification failed after all retries'),
  };
}

/**
 * Verify user storage comprehensively
 * Firestore와 API를 모두 사용하여 종합 검증
 * 
 * @param {string} userId - User ID (Firebase Auth UID)
 * @returns {Promise<{verified: boolean, firestore: Object, api: Object, error: Error|null}>}
 */
export async function verifyUserStorageComprehensive(userId) {
  console.log(`[UserStorage] Starting comprehensive verification for user: ${userId}`);
  
  const [firestoreResult, apiResult] = await Promise.allSettled([
    verifyUserStorage(userId),
    verifyUserProfile(userId),
  ]);

  const firestore = firestoreResult.status === 'fulfilled' 
    ? firestoreResult.value 
    : { exists: false, profile: null, error: firestoreResult.reason };
  
  const api = apiResult.status === 'fulfilled' 
    ? apiResult.value 
    : { success: false, profile: null, error: apiResult.reason };

  const verified = firestore.exists || api.success;

  if (!verified) {
    console.warn(`[UserStorage] Comprehensive verification failed:`, {
      firestore: firestore.error?.message,
      api: api.error?.message,
    });
  } else {
    console.log(`[UserStorage] Comprehensive verification successful`);
  }

  return {
    verified,
    firestore,
    api,
    error: verified ? null : new Error('User storage verification failed'),
  };
}

/**
 * Initialize user storage (if needed)
 * 저장소가 없을 경우 초기화 (현재는 검증만 수행)
 * 
 * @param {string} userId - User ID (Firebase Auth UID)
 * @returns {Promise<{initialized: boolean, error: Error|null}>}
 */
export async function initializeUserStorage(userId) {
  console.log(`[UserStorage] Initializing storage for user: ${userId}`);
  
  // Check if storage already exists
  const verification = await verifyUserStorageComprehensive(userId);
  
  if (verification.verified) {
    console.log(`[UserStorage] Storage already exists, no initialization needed`);
    return {
      initialized: true,
      error: null,
    };
  }

  // Storage doesn't exist - this should be handled by registerUser function
  // We just verify that it gets created
  console.warn(`[UserStorage] Storage not found for user: ${userId}`);
  
  return {
    initialized: false,
    error: verification.error || new Error('User storage not found and initialization failed'),
  };
}
