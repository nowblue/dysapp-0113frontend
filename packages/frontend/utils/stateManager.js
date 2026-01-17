/**
 * State Manager
 * Centralized state management utility for localStorage/sessionStorage
 * Provides type-safe state access, change events, and validation
 */

// ============================================================================
// State Storage Types
// ============================================================================

const STORAGE_TYPES = {
  LOCAL: "localStorage",
  SESSION: "sessionStorage",
};

// ============================================================================
// State Change Events
// ============================================================================

const stateChangeListeners = new Map();

/**
 * Subscribe to state changes
 * @param {string} key - State key to watch
 * @param {Function} callback - Callback function (newValue, oldValue) => void
 * @returns {Function} Unsubscribe function
 */
export function subscribe(key, callback) {
  if (!stateChangeListeners.has(key)) {
    stateChangeListeners.set(key, new Set());
  }
  stateChangeListeners.get(key).add(callback);

  // Return unsubscribe function
  return () => {
    const listeners = stateChangeListeners.get(key);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        stateChangeListeners.delete(key);
      }
    }
  };
}

/**
 * Notify listeners of state change
 * @param {string} key - State key that changed
 * @param {*} newValue - New value
 * @param {*} oldValue - Old value
 */
function notifyListeners(key, newValue, oldValue) {
  const listeners = stateChangeListeners.get(key);
  if (listeners) {
    listeners.forEach((callback) => {
      try {
        callback(newValue, oldValue);
      } catch (error) {
        console.error(`[StateManager] Listener error for key "${key}":`, error);
      }
    });
  }
}

// ============================================================================
// Storage Helpers
// ============================================================================

/**
 * Get storage instance
 * @param {string} type - Storage type (localStorage or sessionStorage)
 * @returns {Storage}
 */
function getStorage(type = STORAGE_TYPES.LOCAL) {
  if (typeof window === "undefined") {
    throw new Error("StateManager requires browser environment");
  }

  if (type === STORAGE_TYPES.LOCAL) {
    return localStorage;
  } else if (type === STORAGE_TYPES.SESSION) {
    return sessionStorage;
  } else {
    throw new Error(`Invalid storage type: ${type}`);
  }
}

/**
 * Serialize value for storage
 * @param {*} value - Value to serialize
 * @returns {string}
 */
function serialize(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error("[StateManager] Serialization error:", error);
    throw new Error("Failed to serialize value");
  }
}

/**
 * Deserialize value from storage
 * @param {string} value - Serialized value
 * @returns {*}
 */
function deserialize(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    // Return as-is if not JSON
    return value;
  }
}

// ============================================================================
// State Management API
// ============================================================================

/**
 * Set state value
 * @param {string} key - State key
 * @param {*} value - Value to set
 * @param {Object} options - Options
 * @param {string} [options.storage=localStorage] - Storage type (localStorage or sessionStorage)
 * @param {Function} [options.validator] - Validation function (value) => boolean
 * @param {boolean} [options.silent=false] - Don't notify listeners
 * @returns {boolean} Success status
 */
export function setState(key, value, options = {}) {
  const {
    storage = STORAGE_TYPES.LOCAL,
    validator = null,
    silent = false,
  } = options;

  try {
    // Validate key
    if (!key || typeof key !== "string") {
      throw new Error("Key must be a non-empty string");
    }

    // Run validator if provided
    if (validator && !validator(value)) {
      throw new Error(`Validation failed for key "${key}"`);
    }

    const storageInstance = getStorage(storage);
    const oldValue = getState(key, null, { storage });

    // Serialize and store
    const serialized = serialize(value);
    storageInstance.setItem(key, serialized);

    // Notify listeners
    if (!silent) {
      notifyListeners(key, value, oldValue);
    }

    return true;
  } catch (error) {
    console.error(`[StateManager] Failed to set state "${key}":`, error);
    return false;
  }
}

/**
 * Get state value
 * @param {string} key - State key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @param {Object} options - Options
 * @param {string} [options.storage=localStorage] - Storage type
 * @returns {*} State value or defaultValue
 */
export function getState(key, defaultValue = null, options = {}) {
  const { storage = STORAGE_TYPES.LOCAL } = options;

  try {
    if (!key || typeof key !== "string") {
      return defaultValue;
    }

    const storageInstance = getStorage(storage);
    const item = storageInstance.getItem(key);

    if (item === null) {
      return defaultValue;
    }

    return deserialize(item);
  } catch (error) {
    console.error(`[StateManager] Failed to get state "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Remove state value
 * @param {string} key - State key to remove
 * @param {Object} options - Options
 * @param {string} [options.storage=localStorage] - Storage type
 * @param {boolean} [options.silent=false] - Don't notify listeners
 * @returns {boolean} Success status
 */
export function removeState(key, options = {}) {
  const { storage = STORAGE_TYPES.LOCAL, silent = false } = options;

  try {
    if (!key || typeof key !== "string") {
      return false;
    }

    const storageInstance = getStorage(storage);
    const oldValue = getState(key, null, { storage });

    storageInstance.removeItem(key);

    // Notify listeners
    if (!silent) {
      notifyListeners(key, null, oldValue);
    }

    return true;
  } catch (error) {
    console.error(`[StateManager] Failed to remove state "${key}":`, error);
    return false;
  }
}

/**
 * Clear all state (with optional prefix filter)
 * @param {Object} options - Options
 * @param {string} [options.prefix] - Only clear keys with this prefix
 * @param {string} [options.storage=localStorage] - Storage type
 * @param {boolean} [options.silent=false] - Don't notify listeners
 * @returns {number} Number of keys cleared
 */
export function clearState(options = {}) {
  const {
    prefix = null,
    storage = STORAGE_TYPES.LOCAL,
    silent = false,
  } = options;

  try {
    const storageInstance = getStorage(storage);
    let cleared = 0;

    if (prefix) {
      // Clear only keys with prefix
      const keysToRemove = [];
      for (let i = 0; i < storageInstance.length; i++) {
        const key = storageInstance.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        const oldValue = getState(key, null, { storage });
        storageInstance.removeItem(key);
        if (!silent) {
          notifyListeners(key, null, oldValue);
        }
        cleared++;
      });
    } else {
      // Clear all
      const keysToRemove = [];
      for (let i = 0; i < storageInstance.length; i++) {
        const key = storageInstance.key(i);
        if (key) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        const oldValue = getState(key, null, { storage });
        storageInstance.removeItem(key);
        if (!silent) {
          notifyListeners(key, null, oldValue);
        }
        cleared++;
      });
    }

    return cleared;
  } catch (error) {
    console.error("[StateManager] Failed to clear state:", error);
    return 0;
  }
}

/**
 * Check if state key exists
 * @param {string} key - State key
 * @param {Object} options - Options
 * @param {string} [options.storage=localStorage] - Storage type
 * @returns {boolean}
 */
export function hasState(key, options = {}) {
  const { storage = STORAGE_TYPES.LOCAL } = options;

  try {
    if (!key || typeof key !== "string") {
      return false;
    }

    const storageInstance = getStorage(storage);
    return storageInstance.getItem(key) !== null;
  } catch (error) {
    console.error(`[StateManager] Failed to check state "${key}":`, error);
    return false;
  }
}

/**
 * Get all state keys (with optional prefix filter)
 * @param {Object} options - Options
 * @param {string} [options.prefix] - Filter keys by prefix
 * @param {string} [options.storage=localStorage] - Storage type
 * @returns {string[]} Array of keys
 */
export function getAllKeys(options = {}) {
  const { prefix = null, storage = STORAGE_TYPES.LOCAL } = options;

  try {
    const storageInstance = getStorage(storage);
    const keys = [];

    for (let i = 0; i < storageInstance.length; i++) {
      const key = storageInstance.key(i);
      if (key) {
        if (!prefix || key.startsWith(prefix)) {
          keys.push(key);
        }
      }
    }

    return keys;
  } catch (error) {
    console.error("[StateManager] Failed to get all keys:", error);
    return [];
  }
}

// ============================================================================
// Convenience Methods
// ============================================================================

/**
 * Set state in localStorage
 */
export const setLocalState = (key, value, options = {}) =>
  setState(key, value, { ...options, storage: STORAGE_TYPES.LOCAL });

/**
 * Get state from localStorage
 */
export const getLocalState = (key, defaultValue = null, options = {}) =>
  getState(key, defaultValue, { ...options, storage: STORAGE_TYPES.LOCAL });

/**
 * Remove state from localStorage
 */
export const removeLocalState = (key, options = {}) =>
  removeState(key, { ...options, storage: STORAGE_TYPES.LOCAL });

/**
 * Set state in sessionStorage
 */
export const setSessionState = (key, value, options = {}) =>
  setState(key, value, { ...options, storage: STORAGE_TYPES.SESSION });

/**
 * Get state from sessionStorage
 */
export const getSessionState = (key, defaultValue = null, options = {}) =>
  getState(key, defaultValue, { ...options, storage: STORAGE_TYPES.SESSION });

/**
 * Remove state from sessionStorage
 */
export const removeSessionState = (key, options = {}) =>
  removeState(key, { ...options, storage: STORAGE_TYPES.SESSION });

// ============================================================================
// Export
// ============================================================================

export default {
  setState,
  getState,
  removeState,
  clearState,
  hasState,
  getAllKeys,
  subscribe,
  setLocalState,
  getLocalState,
  removeLocalState,
  setSessionState,
  getSessionState,
  removeSessionState,
  STORAGE_TYPES,
};
