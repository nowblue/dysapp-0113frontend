/**
 * dysapp Main Application Script
 * Initializes Firebase and provides global utilities
 */

import { initializeFirebase, ensureAuth, onAuthChange } from "../services/firebaseService.js";
import { setToast as setErrorHandlerToast } from "../services/errorHandler.js";
import { setLocalState, getLocalState, removeLocalState } from "../utils/stateManager.js";

// ============================================================================
// Global App State
// ============================================================================

window.dysapp = {
  initialized: false,
  user: null,
  loading: false,
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * 앱 초기화 함수
 * 
 * 애플리케이션의 전역 상태를 초기화하고 Firebase 인증을 설정합니다.
 * 모든 페이지에서 공통으로 사용되는 초기화 로직을 담당합니다.
 * 
 * 처리 과정:
 * 1. 중복 초기화 방지 체크
 * 2. Firebase 서비스 초기화
 * 3. 인증 상태 변경 리스너 등록
 * 4. 사용자 인증 확인 (익명 인증 자동 시도)
 * 5. 에러 핸들러에 Toast 함수 연결
 * 6. 앱 준비 완료 이벤트 발생
 * 7. 활성 네비게이션 설정
 * 
 * @returns {Promise<void>}
 * 
 * @throws {Error} Firebase 초기화 실패 시
 * @throws {Error} 인증 실패 시 (사용자 친화적 메시지 표시)
 * 
 * @example
 * // HTML 파일에서 호출
 * <script type="module">
 *   import { initApp } from './scripts/app.js';
 *   initApp();
 * </script>
 */
export async function initApp() {
  if (window.dysapp.initialized) {
    return;
  }

  console.log("[App] Initializing dysapp...");

  // Initialize Firebase
  initializeFirebase();

  // Listen for auth state changes
  onAuthChange((user) => {
    window.dysapp.user = user;
    if (user) {
      console.log("[App] User authenticated:", user.uid);
    } else {
      console.log("[App] User not authenticated");
    }
    // Dispatch auth changed event for other components (e.g., settings.js)
    window.dispatchEvent(new CustomEvent("dysapp:authChanged", { 
      detail: { user } 
    }));
  });

  // Ensure user is authenticated first
  try {
    await ensureAuth();
    
    // Check onboarding after auth is complete (user object is now available)
    const shouldShowOnboarding = checkOnboardingNeeded();
    
    // Show onboarding modal if needed (after auth is ensured)
    if (shouldShowOnboarding) {
      // Delay to ensure UI is ready
      setTimeout(async () => {
        try {
          const { showAuthModal } = await import('./auth.js');
          showAuthModal('signup');
        } catch (error) {
          console.error('[App] Failed to load auth modal:', error);
          toast.error('회원가입 모달을 불러올 수 없습니다.');
        }
      }, 1000);
    }
  } catch (error) {
    console.error("[App] Auth failed:", error);
    
    // 사용자에게 친화적인 에러 메시지 표시
    const errorMessage = error.message || "인증에 실패했습니다";
    if (errorMessage.includes("익명 인증이 활성화되지 않았습니다")) {
      toast.error("Firebase 설정 오류: 익명 인증을 활성화해주세요");
    } else if (errorMessage.includes("시간 초과")) {
      toast.warning("네트워크 연결을 확인하고 페이지를 새로고침해주세요");
    } else {
      toast.error("인증 오류가 발생했습니다. 잠시 후 다시 시도해주세요");
    }
  }

  window.dysapp.initialized = true;
  console.log("[App] Initialization complete");

  // Dispatch ready event
  window.dispatchEvent(new CustomEvent("dysapp:ready"));
  
  // Set active navigation after a short delay to ensure nav is loaded
  setTimeout(() => {
    setActiveNavigation();
  }, 300);
}

// ============================================================================
// Loading State Management
// ============================================================================

/**
 * 로딩 오버레이 표시 함수
 * 
 * 사용자에게 작업이 진행 중임을 알리는 로딩 오버레이를 표시합니다.
 * 페이지 전체를 덮는 오버레이로, 사용자가 다른 작업을 수행하지 못하도록 합니다.
 * 
 * @param {string} [message="처리 중..."] - 로딩 메시지 텍스트
 * 
 * @example
 * // 분석 시작 시
 * showLoading("디자인 분석 중...");
 * 
 * // API 호출 시
 * showLoading("데이터 불러오는 중...");
 */
export function showLoading(message = "처리 중...") {
  window.dysapp.loading = true;

  // Create or update loading overlay
  let overlay = document.getElementById("dysapp-loading");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "dysapp-loading";
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-message">${message}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    overlay.querySelector(".loading-message").textContent = message;
    overlay.style.display = "flex";
  }
}

/**
 * 로딩 오버레이 숨김 함수
 * 
 * 표시된 로딩 오버레이를 제거합니다.
 * 작업이 완료되면 반드시 호출해야 합니다.
 * 
 * @example
 * try {
 *   showLoading("처리 중...");
 *   await someAsyncOperation();
 * } finally {
 *   hideLoading();
 * }
 */
export function hideLoading() {
  window.dysapp.loading = false;
  const overlay = document.getElementById("dysapp-loading");
  if (overlay) {
    overlay.style.display = "none";
  }
}

// ============================================================================
// Toast Notifications
// ============================================================================

/**
 * Toast 알림 표시 함수
 * 
 * 사용자에게 일시적인 알림 메시지를 표시합니다.
 * 성공, 에러, 경고, 정보 등 다양한 타입의 메시지를 표시할 수 있습니다.
 * 
 * @param {string} message - 표시할 메시지 텍스트
 * @param {string} [type="info"] - Toast 타입 ("success", "error", "warning", "info")
 * @param {number} [duration=3000] - 표시 시간 (밀리초)
 * 
 * @example
 * // 성공 메시지
 * toast.success("분석이 완료되었습니다!");
 * 
 * // 에러 메시지
 * toast.error("오류가 발생했습니다.");
 * 
 * // 경고 메시지
 * toast.warning("파일 크기를 확인해주세요.");
 */
export function showToast(message, type = "info", duration = 3000) {
  // Create toast container if not exists
  let container = document.getElementById("dysapp-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "dysapp-toast-container";
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `dysapp-toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  // Remove after duration
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

/**
 * Shorthand toast methods
 */
export const toast = {
  success: (msg, duration) => showToast(msg, "success", duration),
  error: (msg, duration) => showToast(msg, "error", duration),
  warning: (msg, duration) => showToast(msg, "warning", duration),
  info: (msg, duration) => showToast(msg, "info", duration),
};

// Set toast for error handler
setErrorHandlerToast(toast);

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Navigate to analysis page with ID
 */
export function navigateToAnalysis(analysisId) {
  setLocalState("lastAnalysisId", analysisId);
  window.location.href = `analyze.html?id=${analysisId}`;
}

/**
 * Navigate to search page
 */
export function navigateToSearch() {
  window.location.href = "searchTab.html";
}

/**
 * Navigate to upload page
 */
export function navigateToUpload() {
  window.location.href = "index.html";
}

/**
 * Logout and redirect to index page
 * Standardized logout flow: sign out → show success toast → redirect to index.html
 * Also sets a flag to prevent onboarding modal from showing immediately after logout
 * 
 * @returns {Promise<void>}
 * 
 * @example
 * // In mypage.js or settings.js
 * import { logoutAndRedirect } from './app.js';
 * await logoutAndRedirect();
 */
export async function logoutAndRedirect() {
  try {
    const { signOut } = await import('../services/firebaseService.js');
    await signOut();
    
    // Show success toast
    toast.success('로그아웃되었습니다');
    
    // Set logout flag to prevent onboarding modal from showing immediately
    setLocalState('recentLogout', true);
    // Clear logout flag after 5 seconds (enough time for redirect)
    setTimeout(() => {
      removeLocalState('recentLogout');
    }, 5000);
    
    // Redirect to index page (guest state)
    window.location.href = './index.html';
  } catch (error) {
    console.error('[App] Logout failed:', error);
    toast.error('로그아웃 중 오류가 발생했습니다');
    throw error;
  }
}

/**
 * Get URL parameter
 */
export function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Set active navigation state for current page
 * Should be called after nav.html is loaded
 */
export function setActiveNavigation() {
  const currentPath = window.location.pathname;
  const currentPage = currentPath.split('/').pop() || 'index.html';
  
  // Find all nav links
  const navLinks = document.querySelectorAll('.nav_tab a, .nav_ul3 a');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      const linkPage = href.split('/').pop();
      // Remove active class from all links
      link.classList.remove('active');
      // Add active class if current page matches
      if (linkPage === currentPage || 
          (currentPage === '' && linkPage === 'index.html') ||
          (currentPage === 'index.html' && linkPage === 'index.html')) {
        link.classList.add('active');
      }
    }
  });
  
  // Also handle nav_ul3 buttons/links
  const navButtons = document.querySelectorAll('.nav_ul3 .nav-link');
  navButtons.forEach(btn => {
    const href = btn.getAttribute('href');
    if (href) {
      const btnPage = href.split('/').pop();
      btn.classList.remove('active');
      if (btnPage === currentPage) {
        btn.classList.add('active');
      }
    }
  });
}

// ============================================================================
// Onboarding Check
// ============================================================================

/**
 * Check if user needs onboarding (signup)
 * Returns true if user is anonymous and hasn't completed signup
 * Now checks after auth is complete, and respects logout flag
 */
function checkOnboardingNeeded() {
  // Check if user recently logged out - suppress onboarding in this case
  const recentLogout = getLocalState('recentLogout');
  if (recentLogout) {
    console.log("[App] Recent logout detected, suppressing onboarding");
    return false;
  }
  
  // Check localStorage flag
  const onboardingShown = getLocalState('onboardingShown');
  if (onboardingShown) {
    return false;
  }
  
  // Check if user is anonymous (now user object is available after ensureAuth)
  const user = window.dysapp?.user;
  if (user && user.isAnonymous) {
    // Check if user has email (already signed up)
    if (user.email) {
      setLocalState('onboardingShown', true);
      return false;
    }
    // Anonymous user without email - show onboarding
    return true;
  }
  
  // Not anonymous or no user - no onboarding needed
  return false;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ============================================================================
// CSS Injection for Loading & Toast
// ============================================================================

const styles = `
#dysapp-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #E0D5FF;
  border-top-color: #875CFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-message {
  color: #1B1233;
  font-size: 14px;
}

#dysapp-toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dysapp-toast {
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  opacity: 0;
  transform: translateX(100%);
  transition: all 0.3s ease;
  max-width: 300px;
}

.dysapp-toast.show {
  opacity: 1;
  transform: translateX(0);
}

.toast-success { background: #22c55e; }
.toast-error { background: #ef4444; }
.toast-warning { background: #f97316; }
.toast-info { background: #875CFF; }
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// ============================================================================
// Auto-initialize on DOM ready
// ============================================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// Listen for nav loaded event to set active navigation
window.addEventListener("dysapp:navLoaded", () => {
  setActiveNavigation();
});
