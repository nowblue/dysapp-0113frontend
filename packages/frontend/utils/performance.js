/**
 * Performance Utilities
 * Debounce, throttle, and other performance optimization helpers
 */

// ============================================================================
// Debounce
// ============================================================================

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {Object} options - Options
 * @param {boolean} [options.immediate=false] - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, options = {}) {
  if (typeof func !== "function") {
    throw new Error("First argument must be a function");
  }

  const { immediate = false } = options;
  let timeoutId = null;

  return function debounced(...args) {
    const context = this;

    const callNow = immediate && !timeoutId;

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) {
        func.apply(context, args);
      }
    }, wait);

    if (callNow) {
      func.apply(context, args);
    }
  };
}

// ============================================================================
// Throttle
// ============================================================================

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @param {Object} options - Options
 * @param {boolean} [options.trailing=true] - Execute on trailing edge
 * @param {boolean} [options.leading=true] - Execute on leading edge
 * @returns {Function} Throttled function
 */
export function throttle(func, limit, options = {}) {
  if (typeof func !== "function") {
    throw new Error("First argument must be a function");
  }

  const { trailing = true, leading = true } = options;
  let inThrottle = false;
  let lastResult = null;
  let lastArgs = null;
  let timeoutId = null;

  return function throttled(...args) {
    const context = this;

    if (!inThrottle) {
      if (leading) {
        lastResult = func.apply(context, args);
      } else {
        lastArgs = args;
      }

      inThrottle = true;

      timeoutId = setTimeout(() => {
        inThrottle = false;

        if (trailing && lastArgs) {
          lastResult = func.apply(context, lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }

    return lastResult;
  };
}

// ============================================================================
// Request Animation Frame Throttle
// ============================================================================

/**
 * Throttle function using requestAnimationFrame
 * @param {Function} func - Function to throttle
 * @returns {Function} Throttled function
 */
export function rafThrottle(func) {
  if (typeof func !== "function") {
    throw new Error("First argument must be a function");
  }

  let rafId = null;
  let lastArgs = null;

  return function throttled(...args) {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(this, lastArgs);
        rafId = null;
        lastArgs = null;
      });
    }
  };
}

// ============================================================================
// Memoization
// ============================================================================

/**
 * Memoize function results
 * @param {Function} func - Function to memoize
 * @param {Function} [keyGenerator] - Custom key generator function
 * @returns {Function} Memoized function
 */
export function memoize(func, keyGenerator = null) {
  if (typeof func !== "function") {
    throw new Error("First argument must be a function");
  }

  const cache = new Map();

  return function memoized(...args) {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func.apply(this, args);
    cache.set(key, result);

    return result;
  };
}

/**
 * Clear memoization cache
 * @param {Function} memoizedFunc - Memoized function
 */
export function clearMemoization(memoizedFunc) {
  if (memoizedFunc && memoizedFunc._cache) {
    memoizedFunc._cache.clear();
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Batch DOM updates using requestAnimationFrame
 * @param {Function} callback - Callback function
 * @returns {Promise} Promise that resolves after batch update
 */
export function batchUpdate(callback) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      callback();
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

/**
 * Batch multiple callbacks
 * @param {Function[]} callbacks - Array of callback functions
 * @returns {Promise} Promise that resolves after all callbacks
 */
export async function batchUpdates(callbacks) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      callbacks.forEach((callback) => {
        if (typeof callback === "function") {
          callback();
        }
      });
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

// ============================================================================
// Lazy Loading
// ============================================================================

/**
 * Create IntersectionObserver for lazy loading
 * @param {Function} callback - Callback when element enters viewport
 * @param {Object} options - IntersectionObserver options
 * @returns {IntersectionObserver} Observer instance
 */
export function createLazyLoader(callback, options = {}) {
  const {
    root = null,
    rootMargin = "50px",
    threshold = 0.01,
  } = options;

  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry.target, entry);
          // Unobserve after loading
          observer.unobserve(entry.target);
        }
      });
    },
    { root, rootMargin, threshold }
  );
}

// ============================================================================
// Export
// ============================================================================

export default {
  debounce,
  throttle,
  rafThrottle,
  memoize,
  clearMemoization,
  batchUpdate,
  batchUpdates,
  createLazyLoader,
};
