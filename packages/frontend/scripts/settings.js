/**
 * Settings Page Script (settings.html)
 * 
 * =========================================
 * 목적: 사용자 환경 설정 및 계정 관리 페이지 로직
 * =========================================
 * 
 * 주요 기능:
 * - 사용자 프로필 정보 표시 및 수정
 * - 기본 설정 관리 (포맷, 테마, 알림, 언어)
 * - 계정 설정 (로그아웃 등)
 * 
 * 데이터 흐름:
 * 1. 페이지 로드 시 localStorage에서 설정 로드 (즉시 렌더링)
 * 2. 백엔드에서 최신 설정 로드 (비동기)
 * 3. 사용자 설정 변경 시 localStorage 및 백엔드에 저장
 * 
 * 관련 파일:
 * - settings.html: 설정 페이지 HTML 구조
 * - services/apiService.js: API 호출 함수들
 */

// ============================================================================
// Settings Page Logic
// ============================================================================

import { getUserProfile } from '../services/apiService.js';
import { getCurrentUser } from '../services/firebaseService.js';
import { toast, logoutAndRedirect } from './app.js';
import { getLocalState, setLocalState, removeLocalState } from '../utils/stateManager.js';
import { onChange, onClick, registerCleanup } from '../utils/eventManager.js';
import { enableMockMode, disableMockMode, isMockModeEnabled } from '../services/mockData.js';

// ============================================================================
// State
// ============================================================================

/**
 * 사용자 설정 상태 객체
 * 
 * 기본값으로 초기화되며, localStorage 및 백엔드에서 로드된 값으로 업데이트됩니다.
 */
let userSettings = {
  defaultFormat: 'all',      // 기본 디자인 포맷 필터
  theme: 'light',            // 테마 설정 (light/dark)
  notifications: true,       // 알림 활성화 여부
  language: 'ko'            // 언어 설정
};

// ============================================================================
// Initialization
// ============================================================================

function init() {
  console.log('[Settings] Initializing settings page...');
  
  // Set active navigation
  setActiveNavigation();
  
  // Initialize page
  initializeSettingsPage();
}

async function initializeSettingsPage() {
  try {
    console.log('[Settings] 환경설정 페이지 초기화 시작');
    
    // Load from localStorage first (immediate render)
    const savedSettings = getLocalState('userSettings');
    if (savedSettings) {
      try {
        userSettings = { ...userSettings, ...savedSettings };
        console.log('[Settings] 로컬스토리지에서 설정 로드:', userSettings);
      } catch (e) {
        console.warn('[Settings] 로컬스토리지 파싱 오류:', e);
      }
    }
    
    // Wait for app initialization to check user auth status
    await waitForAppInitialization();
    
    // Listen for auth state changes to re-render account section
    setupAuthStateListener();
    
    // Render settings sections immediately (before network call)
    renderSettings();
    
    // Load user settings from backend (non-blocking, only if authenticated)
    try {
      await loadUserSettings();
    } catch (err) {
      console.warn('[Settings] 백엔드 설정 로드 실패, 로컬스토리지 값 사용:', err);
      // Re-render with backend data if available, otherwise keep localStorage values
      renderSettings();
    }
    
    // Setup event listeners after rendering
    setTimeout(() => {
      setupEventListeners();
    }, 100);
    
    console.log('[Settings] 환경설정 페이지 초기화 완료');
  } catch (error) {
    console.error('[Settings] 설정 페이지 초기화 오류:', error);
    // Even if there's an error, try to render basic content
    renderSettings();
  }
}

/**
 * Wait for app initialization to complete
 */
function waitForAppInitialization() {
  return new Promise((resolve) => {
    if (window.dysapp?.initialized) {
      resolve();
      return;
    }
    
    const checkInterval = setInterval(() => {
      if (window.dysapp?.initialized) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 5000);
  });
}

/**
 * Setup listener for auth state changes to update account section
 */
function setupAuthStateListener() {
  const cleanupFunctions = [];
  
  // Event listener
  const authChangeHandler = () => {
    console.log('[Settings] Auth state changed, re-rendering account section');
    renderSettings();
    setTimeout(() => {
      setupEventListeners();
    }, 100);
  };
  
  window.addEventListener('dysapp:authChanged', authChangeHandler);
  cleanupFunctions.push(() => {
    window.removeEventListener('dysapp:authChanged', authChangeHandler);
  });
  
  // Polling interval
  let lastUserState = JSON.stringify(window.dysapp?.user);
  const pollInterval = setInterval(() => {
    const currentUserState = JSON.stringify(window.dysapp?.user);
    if (currentUserState !== lastUserState) {
      console.log('[Settings] User state changed (polling), re-rendering account section');
      lastUserState = currentUserState;
      renderSettings();
      setTimeout(() => {
        setupEventListeners();
      }, 100);
    }
  }, 2000);
  
  cleanupFunctions.push(() => {
    clearInterval(pollInterval);
  });
  
  // Cleanup 등록
  registerCleanup(() => {
    cleanupFunctions.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.error('[Settings] Error during auth listener cleanup:', error);
      }
    });
    cleanupFunctions.length = 0;
  });
}

/**
 * Set active navigation state for current page
 */
function setActiveNavigation() {
  // Use app.js utility function
  if (window.setActiveNavigation) {
    window.setActiveNavigation();
  } else {
    // Fallback: wait for nav.html to be loaded by includHTML.js
    const trySetActive = () => {
      const navLinks = document.querySelectorAll('.nav_tab a, .nav_ul3 a');
      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href.includes('settings.html') || href.endsWith('settings.html'))) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    };
    
    // Try immediately
    trySetActive();
    
    // Also listen for nav loaded event
    const navLoadedHandler = trySetActive;
    window.addEventListener('dysapp:navLoaded', navLoadedHandler, { once: true });
    
    // Register cleanup for nav loaded listener
    registerCleanup(() => {
      window.removeEventListener('dysapp:navLoaded', navLoadedHandler);
    });
    
    // Fallback timeout
    setTimeout(trySetActive, 500);
  }
}

// Wait for app initialization and nav loaded
function initWhenReady() {
  if (window.dysapp?.initialized) {
    init();
  } else {
    window.addEventListener('dysapp:ready', init, { once: true });
  }
}

// Also listen for nav loaded event
const navLoadedGlobalHandler = () => {
  setActiveNavigation();
};
window.addEventListener('dysapp:navLoaded', navLoadedGlobalHandler, { once: true });

// Register cleanup for global nav loaded listener
registerCleanup(() => {
  window.removeEventListener('dysapp:navLoaded', navLoadedGlobalHandler);
});

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWhenReady);
} else {
  initWhenReady();
}

// Fallback: if dysapp:ready never fires, initialize after DOM is ready
setTimeout(() => {
  if (!window.dysapp?.initialized) {
    console.warn('[Settings] dysapp:ready 이벤트를 기다리지 않고 초기화합니다');
    init();
  }
}, 500);

// ============================================================================
// Load User Settings
// ============================================================================

async function loadUserSettings() {
  try {
    const profile = await getUserProfile();
    if (profile?.preferences) {
      userSettings = {
        ...userSettings,
        ...profile.preferences
      };
    }
    
    // Load from localStorage as fallback using stateManager
    const savedSettings = getLocalState('userSettings');
    if (savedSettings) {
      userSettings = { ...userSettings, ...savedSettings };
    }
  } catch (error) {
    console.error('설정 로드 오류:', error);
  }
}

// ============================================================================
// Render Settings
// ============================================================================

/**
 * Get account actions HTML based on user authentication status
 */
function getAccountActionsHTML() {
  // Check user from window.dysapp.user (set by app.js) or getCurrentUser()
  const user = window.dysapp?.user || getCurrentUser();
  const isAnonymous = user && user.isAnonymous;
  const isAuthenticated = user && !user.isAnonymous;
  
  if (isAuthenticated) {
    // Logged in user: Show profile management and logout
    return `
      <a href="./mypage.html" class="settings-action-link">프로필 관리</a>
      <button class="settings-action-btn" id="logoutBtn">로그아웃</button>
    `;
  } else {
    // Anonymous or not authenticated: Show signup/login options
    return `
      <button class="settings-action-link" id="signupBtn">회원가입</button>
      <button class="settings-action-link" id="loginBtn">로그인</button>
    `;
  }
}

function renderSettings() {
  // Scope selector to main.settings_main to avoid conflicts with nav.html
  const settingsMain = document.querySelector('main.settings_main');
  if (!settingsMain) {
    console.error('[Settings] main.settings_main 요소를 찾을 수 없습니다');
    setTimeout(() => renderSettings(), 200);
    return;
  }
  
  const settingsContent = settingsMain.querySelector('.settings-content');
  if (!settingsContent) {
    console.error('[Settings] settings-content 요소를 찾을 수 없습니다. DOM 상태:', {
      body: document.body ? '존재' : '없음',
      settingsMain: settingsMain ? '존재' : '없음',
      settingsHeader: settingsMain.querySelector('.settings-header') ? '존재' : '없음'
    });
    
    // Retry after a short delay
    setTimeout(() => {
      const retryMain = document.querySelector('main.settings_main');
      const retryContent = retryMain?.querySelector('.settings-content');
      if (retryContent) {
        console.log('[Settings] 재시도: 설정 섹션 렌더링');
        renderSettings();
      } else {
        console.error('[Settings] 재시도 실패: settings-content 요소를 찾을 수 없습니다');
      }
    }, 200);
    return;
  }

  console.log('[Settings] 설정 섹션 렌더링 시작');
  settingsContent.innerHTML = `
    <!-- Analysis Settings -->
    <section class="settings-section">
      <h2 class="settings-section-title">분석 설정</h2>
      <div class="settings-group">
        <label class="settings-label">기본 분석 포맷</label>
        <select id="defaultFormat" class="settings-select">
          <option value="all" ${userSettings.defaultFormat === 'all' ? 'selected' : ''}>모든 포맷</option>
          <option value="UX_UI" ${userSettings.defaultFormat === 'UX_UI' ? 'selected' : ''}>UX/UI</option>
          <option value="Editorial" ${userSettings.defaultFormat === 'Editorial' ? 'selected' : ''}>Editorial</option>
          <option value="Poster" ${userSettings.defaultFormat === 'Poster' ? 'selected' : ''}>Poster</option>
        </select>
      </div>
    </section>

    <!-- Appearance Settings -->
    <section class="settings-section">
      <h2 class="settings-section-title">표시 설정</h2>
      <div class="settings-group">
        <label class="settings-label">테마</label>
        <select id="themeSetting" class="settings-select">
          <option value="light" ${userSettings.theme === 'light' ? 'selected' : ''}>라이트 모드</option>
          <option value="dark" ${userSettings.theme === 'dark' ? 'selected' : ''}>다크 모드</option>
        </select>
      </div>
      <div class="settings-group">
        <label class="settings-label">언어</label>
        <select id="languageSetting" class="settings-select">
          <option value="ko" ${userSettings.language === 'ko' ? 'selected' : ''}>한국어</option>
          <option value="en" ${userSettings.language === 'en' ? 'selected' : ''}>English</option>
        </select>
      </div>
    </section>

    <!-- Notification Settings -->
    <section class="settings-section">
      <h2 class="settings-section-title">알림 설정</h2>
      <div class="settings-group">
        <label class="settings-toggle-label">
          <input type="checkbox" id="notificationsSetting" class="settings-toggle" ${userSettings.notifications ? 'checked' : ''}>
          <span class="settings-toggle-text">알림 받기</span>
        </label>
      </div>
    </section>

    <!-- Account Actions -->
    <section class="settings-section">
      <h2 class="settings-section-title">계정</h2>
      <div class="settings-actions" id="accountActions">
        ${getAccountActionsHTML()}
      </div>
    </section>

    <!-- Developer Mode -->
    <section class="settings-section">
      <h2 class="settings-section-title">개발자 모드</h2>
      <div class="settings-group">
        <label class="settings-toggle-label">
          <input type="checkbox" id="mockModeSetting" class="settings-toggle" ${isMockModeEnabled() ? 'checked' : ''}>
          <span class="settings-toggle-text">목업 모드 활성화</span>
        </label>
        <p class="settings-description" style="margin-top: 1vw; font-size: 0.9vw; color: #666;">
          목업 모드를 활성화하면 백엔드 없이 가짜 데이터로 개발할 수 있습니다.
        </p>
      </div>
    </section>
  `;
  
  console.log('[Settings] 설정 섹션 렌더링 완료, innerHTML 길이:', settingsContent.innerHTML.length);
}

// ============================================================================
// Event Handlers
// ============================================================================

function setupEventListeners() {
  // Scope selectors to main.settings_main to avoid conflicts
  const settingsMain = document.querySelector('main.settings_main');
  if (!settingsMain) {
    console.warn('[Settings] main.settings_main을 찾을 수 없어 이벤트 리스너를 설정할 수 없습니다');
    return;
  }
  
  const settingsUnsubscribeFunctions = [];

  // Default format change
  const defaultFormatSelect = settingsMain.querySelector('#defaultFormat');
  if (defaultFormatSelect) {
    const unsub = onChange(defaultFormatSelect, (e) => {
      userSettings.defaultFormat = e.target.value;
      saveSettings();
    });
    settingsUnsubscribeFunctions.push(unsub);
  }

  // Theme change
  const themeSelect = settingsMain.querySelector('#themeSetting');
  if (themeSelect) {
    const unsub = onChange(themeSelect, (e) => {
      userSettings.theme = e.target.value;
      applyTheme(e.target.value);
      saveSettings();
    });
    settingsUnsubscribeFunctions.push(unsub);
  }

  // Language change
  const languageSelect = settingsMain.querySelector('#languageSetting');
  if (languageSelect) {
    const unsub = onChange(languageSelect, (e) => {
      userSettings.language = e.target.value;
      saveSettings();
    });
    settingsUnsubscribeFunctions.push(unsub);
  }

  // Notifications toggle
  const notificationsToggle = settingsMain.querySelector('#notificationsSetting');
  if (notificationsToggle) {
    const unsub = onChange(notificationsToggle, (e) => {
      userSettings.notifications = e.target.checked;
      saveSettings();
    });
    settingsUnsubscribeFunctions.push(unsub);
  }

  // Logout
  const logoutBtn = settingsMain.querySelector('#logoutBtn');
  if (logoutBtn) {
    const unsub = onClick(logoutBtn, handleLogout);
    settingsUnsubscribeFunctions.push(unsub);
  }

  // Signup button
  const signupBtn = settingsMain.querySelector('#signupBtn');
  if (signupBtn) {
    const unsub = onClick(signupBtn, async () => {
      try {
        const { showAuthModal } = await import('./auth.js');
        showAuthModal('signup');
      } catch (error) {
        console.error('[Settings] Failed to load auth modal:', error);
        toast.error('인증 모달을 불러올 수 없습니다.');
      }
    });
    settingsUnsubscribeFunctions.push(unsub);
  }

  // Login button
  const loginBtn = settingsMain.querySelector('#loginBtn');
  if (loginBtn) {
    const unsub = onClick(loginBtn, async () => {
      try {
        const { showAuthModal } = await import('./auth.js');
        showAuthModal('login');
      } catch (error) {
        console.error('[Settings] Failed to load auth modal:', error);
        toast.error('인증 모달을 불러올 수 없습니다.');
      }
    });
    settingsUnsubscribeFunctions.push(unsub);
  }

  // Mock mode toggle
  const mockModeToggle = settingsMain.querySelector('#mockModeSetting');
  if (mockModeToggle) {
    const unsub = onChange(mockModeToggle, (e) => {
      if (e.target.checked) {
        enableMockMode();
        toast.success('목업 모드가 활성화되었습니다. 페이지를 새로고침하세요.');
      } else {
        disableMockMode();
        toast.success('목업 모드가 비활성화되었습니다. 페이지를 새로고침하세요.');
      }
    });
    settingsUnsubscribeFunctions.push(unsub);
  }

  // Register cleanup callback
  registerCleanup(() => {
    settingsUnsubscribeFunctions.forEach((unsub) => unsub());
    settingsUnsubscribeFunctions.length = 0;
  });
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

async function saveSettings() {
  try {
    // Save to localStorage using stateManager
    setLocalState('userSettings', userSettings);
    
    // TODO: Save to backend via API
    // await apiService.updateUserPreferences(userSettings);
    
    console.log('설정 저장됨:', userSettings);
  } catch (error) {
    console.error('설정 저장 오류:', error);
  }
}

async function handleLogout() {
  if (!confirm('로그아웃하시겠습니까?')) {
    return;
  }
  
  try {
    // Use standardized logout function
    await logoutAndRedirect();
  } catch (error) {
    console.error('로그아웃 오류:', error);
    toast.error('로그아웃 중 오류가 발생했습니다.');
  }
}

// ============================================================================
// Styles
// ============================================================================

const settingsStyles = `
/* ============================================================================
   Settings Page Layout - Exact Match to 71.svg, 72.svg (1920x1080 기준)
   ============================================================================ */

.settings_main {
  width: 100%; /* .wrap이 이미 margin-left를 가지고 있으므로 100% 사용 */
  min-height: 100vh;
  padding: 7.84vw 7.84vw 0 7.84vw;
  background: var(--background);
  margin-left: 0; /* .wrap의 margin-left 사용 */
  box-sizing: border-box;
  font-family: 'SUITE', 'Rubik', sans-serif;
  position: relative; /* z-index를 위한 position */
  z-index: var(--z-content);
}

.settings-header {
  margin-bottom: 3vw;
}

.settings-title {
  font-size: var(--text-large);
  font-weight: 700;
  color: var(--navy);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: var(--line-height-tight);
}

.settings-content {
  max-width: 60vw;
  display: flex;
  flex-direction: column;
  gap: 3vw;
}

/* Settings Section */
.settings-section {
  background: white;
  border-radius: 1vw;
  padding: 2.5vw;
  border: 1px solid var(--purpleGy);
}

.settings-section-title {
  font-size: var(--text-medium);
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 2vw 0;
  letter-spacing: -0.02em;
  line-height: var(--line-height-tight);
}

.settings-group {
  margin-bottom: 2vw;
}

.settings-group:last-child {
  margin-bottom: 0;
}

.settings-label {
  display: block;
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--navy);
  margin-bottom: 0.8vw;
}

.settings-select {
  width: 100%;
  padding: 1vw 1.2vw;
  border-radius: 0.5vw;
  background: white;
  border: 1px solid var(--purpleGy);
  font-size: var(--text-small);
  color: var(--navy);
  cursor: pointer;
  transition: all var(--ease-smooth) 0.2s;
  font-family: 'SUITE', 'Rubik', sans-serif;
}

.settings-select:hover {
  border-color: var(--purpleF);
}

.settings-select:focus {
  outline: none;
  border-color: var(--purpleMain);
  box-shadow: 0 0 0 0.2vw rgba(135, 92, 255, 0.1);
}

/* Toggle Switch */
.settings-toggle-label {
  display: flex;
  align-items: center;
  gap: 1vw;
  cursor: pointer;
}

.settings-toggle {
  width: 3.5vw;
  height: 1.8vw;
  appearance: none;
  background: var(--purpleGy);
  border-radius: 1vw;
  position: relative;
  cursor: pointer;
  transition: all var(--ease-smooth) 0.2s;
}

.settings-toggle::before {
  content: '';
  position: absolute;
  width: 1.4vw;
  height: 1.4vw;
  border-radius: 50%;
  background: white;
  top: 0.2vw;
  left: 0.2vw;
  transition: all var(--ease-smooth) 0.2s;
  box-shadow: 0 0.1vw 0.3vw rgba(0,0,0,0.2);
}

.settings-toggle:checked {
  background: var(--purpleMain);
}

.settings-toggle:checked::before {
  left: 1.9vw;
}

.settings-toggle-text {
  font-size: var(--text-small);
  color: var(--navy);
  font-weight: 500;
}

/* Settings Actions */
.settings-actions {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.settings-action-link,
.settings-action-btn {
  width: 100%;
  padding: 1.2vw 0;
  background: white;
  border: none;
  border-bottom: 1px solid #EEE;
  font-size: var(--text-small);
  font-weight: 500;
  color: var(--purpleMain);
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  transition: all var(--ease-smooth) 0.2s;
  font-family: 'SUITE', 'Rubik', sans-serif;
}

.settings-action-link:last-child,
.settings-action-btn:last-child {
  border-bottom: none;
}

.settings-action-link:hover,
.settings-action-btn:hover {
  background: #F9F9F9;
  padding-left: 0.5vw;
}

.settings-action-btn {
  color: #EF4444;
}

.settings-action-btn:hover {
  background: #FEE2E2;
}

/* ============================================================================
   Responsive Design
   ============================================================================ */
@media (max-width: 1024px) {
  .settings-content {
    max-width: 80vw;
  }
}

@media (max-width: 768px) {
  .settings_main {
    width: 100%;
    margin-left: 0;
    padding: 5vw;
  }
  
  .settings-title {
    font-size: 5vw;
  }
  
  .settings-content {
    max-width: 100%;
    gap: 5vw;
  }
  
  .settings-section {
    padding: 5vw;
  }
  
  .settings-section-title {
    font-size: 4vw;
    margin-bottom: 4vw;
  }
  
  .settings-label {
    font-size: 3.5vw;
    margin-bottom: 2vw;
  }
  
  .settings-select {
    padding: 3vw 4vw;
    font-size: 3.5vw;
  }
  
  .settings-toggle {
    width: 12vw;
    height: 6vw;
  }
  
  .settings-toggle::before {
    width: 4.5vw;
    height: 4.5vw;
    top: 0.75vw;
    left: 0.75vw;
  }
  
  .settings-toggle:checked::before {
    left: 7vw;
  }
  
  .settings-toggle-text {
    font-size: 3.5vw;
  }
  
  .settings-action-link,
  .settings-action-btn {
    padding: 4vw 0;
    font-size: 3.5vw;
  }
}
`;

// Inject styles immediately
(function() {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = settingsStyles;
  document.head.appendChild(styleSheet);
})();
