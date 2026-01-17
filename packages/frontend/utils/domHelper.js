/**
 * DOM Helper
 * Safe DOM manipulation utilities to prevent XSS attacks
 * Provides secure alternatives to innerHTML
 */

// ============================================================================
// HTML Sanitization
// ============================================================================

/**
 * Allowed HTML tags for sanitization
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "span",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "button",
];

/**
 * Allowed attributes per tag
 */
const ALLOWED_ATTRIBUTES = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "width", "height", "loading"],
  button: ["type", "class", "id", "aria-label"],
  "*": ["class", "id", "style", "data-*", "aria-*"],
};

/**
 * Sanitize HTML string to prevent XSS
 * @param {string} html - HTML string to sanitize
 * @param {Object} options - Sanitization options
 * @param {string[]} [options.allowedTags] - Custom allowed tags
 * @param {Object} [options.allowedAttributes] - Custom allowed attributes
 * @returns {string} Sanitized HTML string
 */
export function sanitizeHTML(html, options = {}) {
  if (!html || typeof html !== "string") {
    return "";
  }

  const { allowedTags = ALLOWED_TAGS, allowedAttributes = ALLOWED_ATTRIBUTES } = options;

  // Create a temporary container
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // Remove script tags and event handlers
  const scripts = temp.querySelectorAll("script, style, iframe, object, embed");
  scripts.forEach((el) => el.remove());

  // Remove event handlers from all elements
  const allElements = temp.querySelectorAll("*");
  allElements.forEach((el) => {
    // Remove all event handlers
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      if (attr.name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }
    });

    // Remove disallowed tags
    if (!allowedTags.includes(el.tagName.toLowerCase())) {
      el.replaceWith(...Array.from(el.childNodes));
    }

    // Remove disallowed attributes
    const tagName = el.tagName.toLowerCase();
    const allowedAttrs = allowedAttributes[tagName] || allowedAttributes["*"] || [];
    attrs.forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      const isAllowed =
        allowedAttrs.includes(attrName) ||
        allowedAttrs.some((pattern) => attrName.match(pattern)) ||
        attrName.startsWith("data-") ||
        attrName.startsWith("aria-");

      if (!isAllowed) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return temp.innerHTML;
}

// ============================================================================
// Element Creation
// ============================================================================

/**
 * Create element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {Array|string|Node} children - Child elements, text, or nodes
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);

  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "style" && typeof value === "object") {
      // Handle style object
      Object.assign(element.style, value);
    } else if (key === "dataset" && typeof value === "object") {
      // Handle dataset object
      Object.assign(element.dataset, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      // Handle event listeners (use eventManager instead)
      console.warn(
        `[DOMHelper] Event handlers should be added via eventManager, not as attributes`
      );
    } else if (value !== null && value !== undefined) {
      element.setAttribute(key, value);
    }
  });

  // Append children
  if (children) {
    if (typeof children === "string") {
      element.textContent = children;
    } else if (children instanceof Node) {
      element.appendChild(children);
    } else if (Array.isArray(children)) {
      children.forEach((child) => {
        if (typeof child === "string") {
          element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
          element.appendChild(child);
        } else if (child) {
          console.warn("[DOMHelper] Invalid child type:", typeof child);
        }
      });
    }
  }

  return element;
}

/**
 * Set text content safely (prevents XSS)
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text content
 */
export function setTextContent(element, text) {
  if (!element) return;
  element.textContent = text || "";
}

/**
 * Set HTML content safely (with optional sanitization)
 * @param {HTMLElement} element - Target element
 * @param {string} html - HTML content
 * @param {Object} options - Options
 * @param {boolean} [options.sanitize=true] - Sanitize HTML
 */
export function setHTML(element, html, options = {}) {
  if (!element) return;

  const { sanitize = true } = options;

  if (sanitize) {
    const sanitized = sanitizeHTML(html);
    element.innerHTML = sanitized;
  } else {
    // Only allow if html doesn't contain user input
    console.warn(
      "[DOMHelper] Setting HTML without sanitization. Ensure content is safe."
    );
    element.innerHTML = html;
  }
}

/**
 * Append child elements safely
 * @param {HTMLElement} parent - Parent element
 * @param {Array|Node|string} children - Children to append
 */
export function appendChildren(parent, children) {
  if (!parent) return;

  if (typeof children === "string") {
    parent.appendChild(document.createTextNode(children));
  } else if (children instanceof Node) {
    parent.appendChild(children);
  } else if (Array.isArray(children)) {
    children.forEach((child) => {
      if (typeof child === "string") {
        parent.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        parent.appendChild(child);
      }
    });
  }
}

/**
 * Clear element content safely
 * @param {HTMLElement} element - Element to clear
 */
export function clearElement(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

// ============================================================================
// Template Helpers
// ============================================================================

/**
 * Create element from template string (safe)
 * @param {string} template - Template string with placeholders like {{key}}
 * @param {Object} data - Data object
 * @returns {DocumentFragment} Document fragment with elements
 */
export function createFromTemplate(template, data = {}) {
  const fragment = document.createDocumentFragment();
  const temp = document.createElement("div");

  // Replace placeholders
  let processed = template;
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    // Escape HTML in values
    const safeValue = typeof value === "string" ? escapeHTML(value) : String(value);
    processed = processed.replace(placeholder, safeValue);
  });

  temp.innerHTML = sanitizeHTML(processed);
  while (temp.firstChild) {
    fragment.appendChild(temp.firstChild);
  }

  return fragment;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHTML(text) {
  if (typeof text !== "string") {
    return String(text);
  }

  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Unescape HTML special characters
 * @param {string} text - Text to unescape
 * @returns {string} Unescaped text
 */
export function unescapeHTML(text) {
  if (typeof text !== "string") {
    return String(text);
  }

  const map = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#039;": "'",
  };

  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, (m) => map[m] || m);
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Safe querySelector with null check
 * @param {string} selector - CSS selector
 * @param {HTMLElement} [context=document] - Context element
 * @returns {HTMLElement|null} Found element or null
 */
export function safeQuerySelector(selector, context = document) {
  if (!selector || typeof selector !== "string") {
    return null;
  }
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.error(`[DOMHelper] Invalid selector: ${selector}`, error);
    return null;
  }
}

/**
 * Safe querySelectorAll with null check
 * @param {string} selector - CSS selector
 * @param {HTMLElement} [context=document] - Context element
 * @returns {NodeList|Array} Found elements
 */
export function safeQuerySelectorAll(selector, context = document) {
  if (!selector || typeof selector !== "string") {
    return [];
  }
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    console.error(`[DOMHelper] Invalid selector: ${selector}`, error);
    return [];
  }
}

// ============================================================================
// Export
// ============================================================================

export default {
  sanitizeHTML,
  createElement,
  setTextContent,
  setHTML,
  appendChildren,
  clearElement,
  createFromTemplate,
  escapeHTML,
  unescapeHTML,
  safeQuerySelector,
  safeQuerySelectorAll,
};
