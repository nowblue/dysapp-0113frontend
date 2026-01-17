/**
 * Event Manager
 * Centralized event listener management with duplicate prevention and cleanup
 * Prevents memory leaks and ensures proper event listener cleanup
 */

// ============================================================================
// Event Listener Registry
// ============================================================================

/**
 * Track registered event listeners to prevent duplicates
 * Structure: Map<element, Map<eventType, Set<handler>>>
 */
const listenerRegistry = new WeakMap();

/**
 * Track cleanup callbacks for page navigation
 */
const cleanupCallbacks = new Set();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get or create listener map for an element
 * @param {EventTarget} element - DOM element
 * @returns {Map<string, Set<Function>>}
 */
function getListenerMap(element) {
  if (!listenerRegistry.has(element)) {
    listenerRegistry.set(element, new Map());
  }
  return listenerRegistry.get(element);
}

/**
 * Get or create handler set for an event type
 * @param {EventTarget} element - DOM element
 * @param {string} eventType - Event type (e.g., 'click', 'change')
 * @returns {Set<Function>}
 */
function getHandlerSet(element, eventType) {
  const listenerMap = getListenerMap(element);
  if (!listenerMap.has(eventType)) {
    listenerMap.set(eventType, new Set());
  }
  return listenerMap.get(eventType);
}

// ============================================================================
// Event Listener Management
// ============================================================================

/**
 * Add event listener with duplicate prevention
 * @param {EventTarget} element - DOM element
 * @param {string} eventType - Event type
 * @param {Function} handler - Event handler function
 * @param {Object} options - Event listener options (capture, once, passive, etc.)
 * @returns {Function} Unsubscribe function
 */
export function addEventListener(element, eventType, handler, options = {}) {
  if (!element || typeof handler !== "function") {
    console.warn("[EventManager] Invalid element or handler");
    return () => {};
  }

  const handlerSet = getHandlerSet(element, eventType);

  // Check if handler already exists
  if (handlerSet.has(handler)) {
    console.warn(
      `[EventManager] Handler already registered for ${eventType} on element`
    );
    // Return unsubscribe function for existing handler
    return () => {
      handlerSet.delete(handler);
      if (handlerSet.size === 0) {
        element.removeEventListener(eventType, handler, options);
      }
    };
  }

  // Add handler to registry
  handlerSet.add(handler);

  // Add actual event listener
  element.addEventListener(eventType, handler, options);

  // Return unsubscribe function
  return () => {
    handlerSet.delete(handler);
    element.removeEventListener(eventType, handler, options);

    // Clean up empty sets
    const listenerMap = getListenerMap(element);
    if (handlerSet.size === 0) {
      listenerMap.delete(eventType);
    }
    if (listenerMap.size === 0) {
      listenerRegistry.delete(element);
    }
  };
}

/**
 * Remove event listener
 * @param {EventTarget} element - DOM element
 * @param {string} eventType - Event type
 * @param {Function} handler - Event handler function
 * @param {Object} options - Event listener options
 * @returns {boolean} Success status
 */
export function removeEventListener(
  element,
  eventType,
  handler,
  options = {}
) {
  if (!element || typeof handler !== "function") {
    return false;
  }

  const listenerMap = listenerRegistry.get(element);
  if (!listenerMap) {
    return false;
  }

  const handlerSet = listenerMap.get(eventType);
  if (!handlerSet || !handlerSet.has(handler)) {
    return false;
  }

  // Remove from registry
  handlerSet.delete(handler);
  element.removeEventListener(eventType, handler, options);

  // Clean up empty sets
  if (handlerSet.size === 0) {
    listenerMap.delete(eventType);
  }
  if (listenerMap.size === 0) {
    listenerRegistry.delete(element);
  }

  return true;
}

/**
 * Remove all event listeners for an element
 * @param {EventTarget} element - DOM element
 * @param {string} [eventType] - Optional: specific event type to remove
 * @returns {number} Number of listeners removed
 */
export function removeAllListeners(element, eventType = null) {
  if (!element) {
    return 0;
  }

  const listenerMap = listenerRegistry.get(element);
  if (!listenerMap) {
    return 0;
  }

  let removed = 0;

  if (eventType) {
    // Remove specific event type
    const handlerSet = listenerMap.get(eventType);
    if (handlerSet) {
      handlerSet.forEach((handler) => {
        element.removeEventListener(eventType, handler);
        removed++;
      });
      listenerMap.delete(eventType);
    }
  } else {
    // Remove all event types
    listenerMap.forEach((handlerSet, type) => {
      handlerSet.forEach((handler) => {
        element.removeEventListener(type, handler);
        removed++;
      });
    });
    listenerRegistry.delete(element);
  }

  return removed;
}

/**
 * Cleanup all registered event listeners
 * Useful for page navigation or cleanup
 * @returns {number} Number of listeners cleaned up
 */
export function cleanupAll() {
  let totalRemoved = 0;

  // Note: WeakMap doesn't support iteration, so we track elements differently
  // For cleanup, we rely on cleanup callbacks registered by pages
  cleanupCallbacks.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      console.error("[EventManager] Cleanup callback error:", error);
    }
  });

  cleanupCallbacks.clear();
  return totalRemoved;
}

/**
 * Register cleanup callback
 * @param {Function} callback - Cleanup function
 * @returns {Function} Unregister function
 */
export function registerCleanup(callback) {
  if (typeof callback !== "function") {
    return () => {};
  }

  cleanupCallbacks.add(callback);

  return () => {
    cleanupCallbacks.delete(callback);
  };
}

// ============================================================================
// Convenience Methods
// ============================================================================

/**
 * Add click event listener
 */
export const onClick = (element, handler, options) =>
  addEventListener(element, "click", handler, options);

/**
 * Add change event listener
 */
export const onChange = (element, handler, options) =>
  addEventListener(element, "change", handler, options);

/**
 * Add input event listener
 */
export const onInput = (element, handler, options) =>
  addEventListener(element, "input", handler, options);

/**
 * Add submit event listener
 */
export const onSubmit = (element, handler, options) =>
  addEventListener(element, "submit", handler, options);

/**
 * Add keydown event listener
 */
export const onKeyDown = (element, handler, options) =>
  addEventListener(element, "keydown", handler, options);

/**
 * Add keyup event listener
 */
export const onKeyUp = (element, handler, options) =>
  addEventListener(element, "keyup", handler, options);

/**
 * Add focus event listener
 */
export const onFocus = (element, handler, options) =>
  addEventListener(element, "focus", handler, options);

/**
 * Add blur event listener
 */
export const onBlur = (element, handler, options) =>
  addEventListener(element, "blur", handler, options);

/**
 * Add mouseenter event listener
 */
export const onMouseEnter = (element, handler, options) =>
  addEventListener(element, "mouseenter", handler, options);

/**
 * Add mouseleave event listener
 */
export const onMouseLeave = (element, handler, options) =>
  addEventListener(element, "mouseleave", handler, options);

// ============================================================================
// Page Navigation Cleanup
// ============================================================================

/**
 * Setup automatic cleanup on page unload
 */
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    cleanupAll();
  });

  // Also cleanup on pagehide (for mobile browsers)
  window.addEventListener("pagehide", () => {
    cleanupAll();
  });
}

// ============================================================================
// Export
// ============================================================================

export default {
  addEventListener,
  removeEventListener,
  removeAllListeners,
  cleanupAll,
  registerCleanup,
  onClick,
  onChange,
  onInput,
  onSubmit,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
};
