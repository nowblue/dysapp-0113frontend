/**
 * Authentication UI Script
 * 회원가입 및 로그인 모달 관리
 * Reference: settings.html 스타일 적용
 */

import { onClick, onSubmit, registerCleanup } from '../utils/eventManager.js';
import { showLoading, hideLoading, toast } from './app.js';

// ============================================================================
// State
// ============================================================================

let authModal = null;
let currentMode = 'signup'; // 'signup' or 'login'

// ============================================================================
// Modal HTML Templates
// ============================================================================

function getAuthModalHTML(mode = 'signup') {
  const isSignup = mode === 'signup';
  
  return `
    <div class="auth-modal-overlay" id="authModalOverlay">
      <div class="auth-modal-container">
        <div class="auth-modal-header">
          <h2 class="auth-modal-title">${isSignup ? '회원가입' : '로그인'}</h2>
          <button class="auth-modal-close" id="authModalClose" aria-label="닫기">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div class="auth-modal-content">
          <form class="auth-form" id="authForm" novalidate>
            <div class="auth-form-group">
              <label class="auth-form-label" for="authEmail">이메일</label>
              <input 
                type="text" 
                inputmode="email"
                id="authEmail" 
                class="auth-form-input" 
                placeholder="example@email.com"
                autocomplete="email"
                aria-required="true"
              />
              <div class="auth-form-error" id="authEmailError"></div>
            </div>
            
            <div class="auth-form-group">
              <label class="auth-form-label" for="authPassword">비밀번호</label>
              <input 
                type="password" 
                id="authPassword" 
                class="auth-form-input" 
                placeholder="비밀번호를 입력하세요"
                autocomplete="${isSignup ? 'new-password' : 'current-password'}"
                aria-required="true"
              />
              <div class="auth-form-error" id="authPasswordError"></div>
            </div>
            
            ${isSignup ? `
            <div class="auth-form-group">
              <label class="auth-form-label" for="authPasswordConfirm">비밀번호 확인</label>
              <input 
                type="password" 
                id="authPasswordConfirm" 
                class="auth-form-input" 
                placeholder="비밀번호를 다시 입력하세요"
                autocomplete="new-password"
                aria-required="true"
              />
              <div class="auth-form-error" id="authPasswordConfirmError"></div>
            </div>
            
            <div class="auth-form-group">
              <label class="auth-form-label" for="authDisplayName">이름 (선택)</label>
              <input 
                type="text" 
                id="authDisplayName" 
                class="auth-form-input" 
                placeholder="이름을 입력하세요"
                autocomplete="name"
              />
              <div class="auth-form-error" id="authDisplayNameError"></div>
            </div>
            ` : ''}
            
            ${isSignup ? `
            <div class="auth-form-group">
              <div class="auth-privacy-section">
                <label class="auth-privacy-label" id="authPrivacyLabel">
                  <input 
                    type="checkbox" 
                    id="authPrivacyConsent" 
                    class="auth-checkbox" 
                    aria-required="true"
                  />
                  <span class="auth-checkbox-text">
                    <a href="#" id="authPrivacyLink" class="auth-link">개인정보처리방침</a>에 동의합니다 <span class="auth-required-mark">(필수)</span>
                  </span>
                </label>
                <div class="auth-privacy-content" id="authPrivacyContent" style="display: none;">
                  <div class="auth-privacy-scroll">
                    <pre id="authPrivacyText"></pre>
                  </div>
                </div>
                <div class="auth-privacy-error" id="authPrivacyError" style="display: none;">
                  개인정보처리방침에 동의해주세요.
                </div>
              </div>
            </div>
            ` : ''}
            
            <div class="auth-form-actions">
              <button type="submit" class="auth-submit-btn" id="authSubmitBtn">
                ${isSignup ? '회원가입' : '로그인'}
              </button>
            </div>
            
            <div class="auth-form-footer">
              ${!isSignup ? `
                <button type="button" class="auth-signup-btn" id="authSignupBtn">
                  회원가입
                </button>
              ` : ''}
              <button type="button" class="auth-mode-toggle" id="authModeToggle">
                ${isSignup ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// Modal Management
// ============================================================================

/**
 * Show authentication modal
 * @param {string} mode - 'signup' or 'login'
 */
export function showAuthModal(mode = 'signup') {
  if (authModal) {
    closeAuthModal();
  }
  
  currentMode = mode;
  const modalHTML = getAuthModalHTML(mode);
  
  // Create modal element
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = modalHTML;
  authModal = tempDiv.firstElementChild;
  
  document.body.appendChild(authModal);
  
  // Load privacy policy if signup mode
  if (mode === 'signup') {
    loadPrivacyPolicy();
  }
  
  // Setup event listeners
  setupAuthModalListeners();
  
  // Animate in
  requestAnimationFrame(() => {
    authModal.classList.add('show');
  });
  
  // Focus first input
  const firstInput = authModal.querySelector('.auth-form-input');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

/**
 * Close authentication modal
 */
export function closeAuthModal() {
  if (!authModal) return;
  
  authModal.classList.remove('show');
  setTimeout(() => {
    if (authModal && authModal.parentNode) {
      authModal.parentNode.removeChild(authModal);
    }
    authModal = null;
  }, 300);
}

/**
 * Setup event listeners for auth modal
 */
function setupAuthModalListeners() {
  if (!authModal) return;
  
  const cleanupFunctions = [];
  
  // Close button
  const closeBtn = authModal.querySelector('#authModalClose');
  if (closeBtn) {
    const unsub = onClick(closeBtn, closeAuthModal);
    cleanupFunctions.push(unsub);
  }
  
  // Overlay click to close
  const overlay = authModal.querySelector('.auth-modal-overlay');
  if (overlay) {
    const unsub = onClick(overlay, (e) => {
      if (e.target === overlay) {
        closeAuthModal();
      }
    });
    cleanupFunctions.push(unsub);
  }
  
  // Form submit - use onSubmit instead of onClick for proper form handling
  const form = authModal.querySelector('#authForm');
  if (form) {
    // Prevent browser default validation bubble completely
    const onInvalidCapture = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Don't show browser default validation message
      return false;
    };
    
    // Capture invalid events on form and all inputs to prevent browser bubbles
    form.addEventListener('invalid', onInvalidCapture, true);
    
    // Also prevent invalid events on all input fields individually
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('invalid', onInvalidCapture, true);
      // Set custom validity to empty string to prevent browser default messages
      input.setCustomValidity('');
    });
    
    // Use onSubmit for proper form submission handling (works for both button click and Enter key)
    const unsub = onSubmit(form, async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await handleAuthSubmit();
    });
    
    cleanupFunctions.push(() => {
      form.removeEventListener('invalid', onInvalidCapture, true);
      inputs.forEach(input => {
        input.removeEventListener('invalid', onInvalidCapture, true);
      });
    });
    cleanupFunctions.push(unsub);
  }
  
  // Signup button (only shown in login mode)
  const signupBtn = authModal.querySelector('#authSignupBtn');
  if (signupBtn) {
    const unsub = onClick(signupBtn, () => {
      closeAuthModal();
      setTimeout(() => showAuthModal('signup'), 300);
    });
    cleanupFunctions.push(unsub);
  }
  
  // Mode toggle
  const modeToggle = authModal.querySelector('#authModeToggle');
  if (modeToggle) {
    const unsub = onClick(modeToggle, () => {
      const newMode = currentMode === 'signup' ? 'login' : 'signup';
      closeAuthModal();
      setTimeout(() => showAuthModal(newMode), 300);
    });
    cleanupFunctions.push(unsub);
  }
  
  // Privacy policy link
  if (currentMode === 'signup') {
    const privacyLink = authModal.querySelector('#authPrivacyLink');
    if (privacyLink) {
      const unsub = onClick(privacyLink, (e) => {
        e.preventDefault();
        togglePrivacyContent();
      });
      cleanupFunctions.push(unsub);
    }
    
    // Clear error state when checkbox is checked
    const privacyConsent = authModal.querySelector('#authPrivacyConsent');
    const privacyError = authModal.querySelector('#authPrivacyError');
    const privacyLabel = authModal.querySelector('#authPrivacyLabel');
    
    if (privacyConsent) {
      const clearError = () => {
        if (privacyConsent.checked) {
          if (privacyError) {
            privacyError.style.display = 'none';
          }
          if (privacyLabel) {
            privacyLabel.classList.remove('auth-error-state');
          }
        }
      };
      
      privacyConsent.addEventListener('change', clearError);
      cleanupFunctions.push(() => {
        privacyConsent.removeEventListener('change', clearError);
      });
    }
  }
  
  // Real-time validation for password confirmation
  if (currentMode === 'signup') {
    const passwordInput = authModal.querySelector('#authPassword');
    const passwordConfirmInput = authModal.querySelector('#authPasswordConfirm');
    
    if (passwordConfirmInput && passwordInput) {
      const validatePasswordMatch = () => {
        if (passwordConfirmInput.value && passwordInput.value !== passwordConfirmInput.value) {
          showFieldError('authPasswordConfirm', '비밀번호가 일치하지 않습니다');
        } else {
          clearFieldError('authPasswordConfirm');
        }
      };
      
      passwordConfirmInput.addEventListener('input', validatePasswordMatch);
      passwordInput.addEventListener('input', validatePasswordMatch);
      
      cleanupFunctions.push(() => {
        passwordConfirmInput.removeEventListener('input', validatePasswordMatch);
        passwordInput.removeEventListener('input', validatePasswordMatch);
      });
    }
  }
  
  // Real-time validation for email
  const emailInput = authModal.querySelector('#authEmail');
  if (emailInput) {
    const validateEmail = () => {
      const email = emailInput.value.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showFieldError('authEmail', '올바른 이메일 주소를 입력해주세요');
      } else {
        clearFieldError('authEmail');
      }
    };
    
    emailInput.addEventListener('blur', validateEmail);
    cleanupFunctions.push(() => {
      emailInput.removeEventListener('blur', validateEmail);
    });
  }
  
  // Real-time validation for password
  const passwordInput = authModal.querySelector('#authPassword');
  if (passwordInput) {
    const validatePassword = () => {
      const password = passwordInput.value;
      if (password && password.length < 6) {
        showFieldError('authPassword', '비밀번호는 6자 이상이어야 합니다');
      } else {
        clearFieldError('authPassword');
      }
    };
    
    passwordInput.addEventListener('blur', validatePassword);
    cleanupFunctions.push(() => {
      passwordInput.removeEventListener('blur', validatePassword);
    });
  }
  
  // Register cleanup
  registerCleanup(() => {
    cleanupFunctions.forEach(fn => fn());
  });
}

/**
 * Toggle privacy policy content visibility
 */
function togglePrivacyContent() {
  const content = authModal.querySelector('#authPrivacyContent');
  if (content) {
    const isVisible = content.style.display !== 'none';
    content.style.display = isVisible ? 'none' : 'block';
  }
}

/**
 * Load privacy policy text
 */
async function loadPrivacyPolicy() {
  try {
    const response = await fetch('./개인정보처리방침.txt');
    if (response.ok) {
      const text = await response.text();
      const privacyText = authModal.querySelector('#authPrivacyText');
      if (privacyText) {
        privacyText.textContent = text;
      }
    }
  } catch (error) {
    console.error('[Auth] Failed to load privacy policy:', error);
  }
}

/**
 * Show error message for input field
 */
function showFieldError(fieldId, message) {
  const errorElement = authModal.querySelector(`#${fieldId}Error`);
  const inputElement = authModal.querySelector(`#${fieldId}`);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
  if (inputElement) {
    inputElement.classList.add('auth-input-error');
  }
}

/**
 * Clear error message for input field
 */
function clearFieldError(fieldId) {
  const errorElement = authModal.querySelector(`#${fieldId}Error`);
  const inputElement = authModal.querySelector(`#${fieldId}`);
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }
  if (inputElement) {
    inputElement.classList.remove('auth-input-error');
  }
}

/**
 * Clear all field errors
 */
function clearAllFieldErrors() {
  const errorElements = authModal.querySelectorAll('.auth-form-error');
  const inputElements = authModal.querySelectorAll('.auth-form-input');
  errorElements.forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
  inputElements.forEach(el => {
    el.classList.remove('auth-input-error');
  });
}

/**
 * Validate form fields
 */
function validateForm() {
  let isValid = true;
  clearAllFieldErrors();
  
  // Email validation
  const emailInput = authModal.querySelector('#authEmail');
  const email = emailInput?.value.trim();
  if (!email) {
    showFieldError('authEmail', '이메일을 입력해주세요');
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('authEmail', '올바른 이메일 주소를 입력해주세요');
    isValid = false;
  }
  
  // Password validation
  const passwordInput = authModal.querySelector('#authPassword');
  const password = passwordInput?.value;
  if (!password) {
    showFieldError('authPassword', '비밀번호를 입력해주세요');
    isValid = false;
  } else if (password.length < 6) {
    showFieldError('authPassword', '비밀번호는 6자 이상이어야 합니다');
    isValid = false;
  }
  
  // Password confirmation validation (signup only)
  if (currentMode === 'signup') {
    const passwordConfirmInput = authModal.querySelector('#authPasswordConfirm');
    const passwordConfirm = passwordConfirmInput?.value;
    if (!passwordConfirm) {
      showFieldError('authPasswordConfirm', '비밀번호 확인을 입력해주세요');
      isValid = false;
    } else if (password && password !== passwordConfirm) {
      showFieldError('authPasswordConfirm', '비밀번호가 일치하지 않습니다');
      isValid = false;
    }
  }
  
  return isValid;
}

/**
 * Handle form submission
 */
async function handleAuthSubmit() {
  if (!authModal) return;
  
  // Clear previous errors
  clearAllFieldErrors();
  
  // Validate form
  if (!validateForm()) {
    return;
  }
  
  const email = authModal.querySelector('#authEmail').value.trim();
  const password = authModal.querySelector('#authPassword').value;
  const displayName = currentMode === 'signup' 
    ? authModal.querySelector('#authDisplayName')?.value.trim() || undefined
    : undefined;
  
  // Validate privacy consent for signup (enhanced validation)
  if (currentMode === 'signup') {
    const privacyConsent = authModal.querySelector('#authPrivacyConsent');
    const privacyError = authModal.querySelector('#authPrivacyError');
    const privacyLabel = authModal.querySelector('#authPrivacyLabel');
    
    if (!privacyConsent || !privacyConsent.checked) {
      // Show visual error feedback
      if (privacyError) {
        privacyError.style.display = 'block';
      }
      if (privacyLabel) {
        privacyLabel.classList.add('auth-error-state');
      }
      // Scroll to error
      privacyConsent?.focus();
      privacyConsent?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      toast.error('개인정보처리방침에 동의해주세요');
      return;
    } else {
      // Clear error state if consent is checked
      if (privacyError) {
        privacyError.style.display = 'none';
      }
      if (privacyLabel) {
        privacyLabel.classList.remove('auth-error-state');
      }
    }
  }
  
  showLoading(currentMode === 'signup' ? '회원가입 중...' : '로그인 중...');
  
  try {
    if (currentMode === 'signup') {
      await handleSignup({ email, password, displayName });
    } else {
      await handleLogin({ email, password });
    }
  } catch (error) {
    console.error('[Auth] Auth error:', error);
    toast.error(error.message || '오류가 발생했습니다');
  } finally {
    hideLoading();
  }
}

/**
 * Handle signup
 */
async function handleSignup({ email, password, displayName }) {
  // Import here to avoid circular dependency
  const { registerUser } = await import('../services/apiService.js');
  const { getCurrentUser } = await import('../services/firebaseService.js');
  const { verifyUserStorageComprehensive } = await import('../services/userStorageService.js');
  
  // Privacy policy version matches functions/src/constants.ts PRIVACY_POLICY_VERSION
  const PRIVACY_POLICY_VERSION = '2026.01.13';
  
  try {
    const result = await registerUser({
      email,
      password,
      displayName,
      privacyConsent: {
        consented: true,
        version: PRIVACY_POLICY_VERSION,
      },
    });
    
    if (result.success) {
      // Verify user storage was created
      const user = getCurrentUser();
      if (user && user.uid) {
        try {
          console.log('[Auth] Verifying user storage after signup...');
          const verification = await verifyUserStorageComprehensive(user.uid);
          
          if (!verification.verified) {
            console.warn('[Auth] User storage verification failed, but signup succeeded');
            // Don't block the user, but log the warning
          } else {
            console.log('[Auth] User storage verified successfully');
          }
        } catch (error) {
          console.error('[Auth] Error verifying user storage:', error);
          // Don't block the user flow, but log the error
        }
      }
      
      toast.success('회원가입이 완료되었습니다!');
      // 성공 메시지를 볼 수 있도록 딜레이 후 모달 닫기
      setTimeout(() => {
        closeAuthModal();
        // Dispatch auth changed event instead of reloading
        // The event will be fired by app.js's onAuthChange callback automatically
        // But we can also trigger it here to ensure immediate update
        window.dispatchEvent(new CustomEvent("dysapp:authChanged"));
      }, 800);
    } else {
      // 회원가입 실패 시 에러 메시지 표시 및 모달 유지
      const errorMessage = result.message || result.error || '회원가입에 실패했습니다';
      toast.error(errorMessage);
      // 모달은 열어둠 - 사용자가 다시 시도할 수 있도록
      throw new Error(errorMessage);
    }
  } catch (error) {
    // 에러 발생 시 모달 유지 및 에러 메시지 표시
    console.error('[Auth] Signup error:', error);
    const errorMessage = error.message || '회원가입 중 오류가 발생했습니다';
    toast.error(errorMessage);
    // 모달은 열어둠 - 사용자가 다시 시도할 수 있도록
    throw error; // 상위 catch 블록에서 처리되도록
  }
}

/**
 * Handle login
 */
async function handleLogin({ email, password }) {
  // Import here to avoid circular dependency
  const { signInWithEmailPassword } = await import('../services/firebaseService.js');
  
  try {
    await signInWithEmailPassword(email, password);
    
    toast.success('로그인되었습니다!');
    closeAuthModal();
    // Dispatch auth changed event instead of reloading
    // The event will be fired by app.js's onAuthChange callback automatically
    // But we can also trigger it here to ensure immediate update
    window.dispatchEvent(new CustomEvent("dysapp:authChanged"));
  } catch (error) {
    // 에러 발생 시 모달 유지 및 에러 메시지 표시
    console.error('[Auth] Login error:', error);
    const errorMessage = error.message || '로그인 중 오류가 발생했습니다';
    toast.error(errorMessage);
    // 모달은 열어둠 - 사용자가 다시 시도할 수 있도록
    throw error; // 상위 catch 블록에서 처리되도록
  }
}

// ============================================================================
// Styles
// ============================================================================

const authStyles = `
/* Auth Modal Styles - Based on settings.html design system */
.auth-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(27, 18, 51, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  opacity: 0;
  transition: opacity 0.3s var(--ease-smooth);
  overflow-y: auto;
  padding: 2vw;
  box-sizing: border-box;
}

.auth-modal-overlay.show {
  opacity: 1;
}

.auth-modal-container {
  background: white;
  border-radius: 1vw;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
  transform: scale(0.95);
  transition: transform 0.3s var(--ease-smooth);
  margin: auto;
  box-sizing: border-box;
}

.auth-modal-overlay.show .auth-modal-container {
  transform: scale(1);
}

.auth-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2.5vw;
  border-bottom: 1px solid var(--purpleGy);
  flex-shrink: 0;
  box-sizing: border-box;
}

.auth-modal-title {
  font-size: var(--text-large);
  font-weight: 700;
  color: var(--navy);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: var(--line-height-tight);
}

.auth-modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5vw;
  color: var(--navy);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s var(--ease-smooth);
  flex-shrink: 0;
}

.auth-modal-close:hover {
  color: var(--purpleMain);
}

.auth-modal-content {
  padding: 2.5vw;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  scrollbar-gutter: stable;
}

/* 스크롤바 스타일링 */
.auth-modal-content::-webkit-scrollbar {
  width: 8px;
}

.auth-modal-content::-webkit-scrollbar-track {
  background: transparent;
}

.auth-modal-content::-webkit-scrollbar-thumb {
  background: var(--purpleGy);
  border-radius: 4px;
}

.auth-modal-content::-webkit-scrollbar-thumb:hover {
  background: var(--purpleF);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 2vw;
  width: 100%;
  box-sizing: border-box;
}

.auth-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.8vw;
  width: 100%;
  box-sizing: border-box;
}

.auth-form-label {
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--navy);
}

.auth-form-input {
  width: 100%;
  padding: 1vw 1.2vw;
  border-radius: 0.5vw;
  background: white;
  border: 1px solid var(--purpleGy);
  font-size: var(--text-small);
  color: var(--navy);
  font-family: 'SUITE', 'Rubik', sans-serif;
  transition: all var(--ease-smooth) 0.2s;
  box-sizing: border-box;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.auth-form-input::placeholder {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--purpleGy);
}

.auth-form-input:hover {
  border-color: var(--purpleF);
}

.auth-form-input:focus {
  outline: none;
  border-color: var(--purpleMain);
  box-shadow: 0 0 0 0.2vw rgba(135, 92, 255, 0.1);
}

.auth-form-input.auth-input-error {
  border-color: #ef4444;
}

.auth-form-error {
  display: none;
  margin-top: 0.5vw;
  font-size: var(--text-extra-small);
  color: #ef4444;
  line-height: var(--line-height-base);
}

.auth-privacy-section {
  display: flex;
  flex-direction: column;
  gap: 1vw;
}

.auth-privacy-label {
  display: flex;
  align-items: flex-start;
  gap: 0.8vw;
  cursor: pointer;
}

.auth-checkbox {
  width: 1.2vw;
  height: 1.2vw;
  margin-top: 0.2vw;
  cursor: pointer;
  accent-color: var(--purpleMain);
}

.auth-checkbox-text {
  font-size: var(--text-small);
  color: var(--navy);
  line-height: var(--line-height-base);
}

.auth-required-mark {
  color: #ef4444;
  font-weight: 600;
}

.auth-privacy-error {
  margin-top: 0.5vw;
  font-size: var(--text-extra-small);
  color: #ef4444;
  padding-left: 2vw;
}

.auth-privacy-label.auth-error-state {
  color: #ef4444;
}

.auth-privacy-label.auth-error-state .auth-checkbox-text {
  color: #ef4444;
}

.auth-privacy-label.auth-error-state .auth-checkbox {
  accent-color: #ef4444;
  border-color: #ef4444;
}

.auth-link {
  color: var(--purpleMain);
  text-decoration: underline;
  transition: color 0.2s var(--ease-smooth);
}

.auth-link:hover {
  color: var(--purpleD);
}

.auth-privacy-content {
  margin-top: 1vw;
  padding: 1.5vw;
  background: var(--purpleA);
  border-radius: 0.5vw;
  border: 1px solid var(--purpleGy);
  max-height: 300px;
  overflow-y: auto;
}

.auth-privacy-scroll {
  font-size: var(--text-extra-small);
  color: var(--navy);
  line-height: var(--line-height-base);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.auth-form-actions {
  margin-top: 1vw;
}

.auth-submit-btn {
  width: 100%;
  padding: 1.2vw 0;
  background: var(--purpleMain);
  color: white;
  border: none;
  border-radius: 0.5vw;
  font-size: var(--text-small);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--ease-smooth) 0.2s;
  font-family: 'SUITE', 'Rubik', sans-serif;
}

.auth-submit-btn:hover {
  background: var(--purpleD);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.auth-submit-btn:active {
  transform: translateY(0);
}

.auth-submit-btn:disabled {
  background: var(--purpleGy);
  cursor: not-allowed;
  transform: none;
}

.auth-form-footer {
  margin-top: 2vw;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1vw;
}

.auth-signup-btn {
  width: 100%;
  padding: 1vw 0;
  background: white;
  color: var(--purpleMain);
  border: 1px solid var(--purpleMain);
  border-radius: 0.5vw;
  font-size: var(--text-small);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--ease-smooth) 0.2s;
  font-family: 'SUITE', 'Rubik', sans-serif;
}

.auth-signup-btn:hover {
  background: var(--purpleG);
  border-color: var(--purpleD);
  color: var(--purpleD);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.auth-signup-btn:active {
  transform: translateY(0);
}

.auth-mode-toggle {
  background: none;
  border: none;
  color: var(--purpleMain);
  font-size: var(--text-small);
  cursor: pointer;
  text-decoration: underline;
  transition: color 0.2s var(--ease-smooth);
  font-family: 'SUITE', 'Rubik', sans-serif;
}

.auth-mode-toggle:hover {
  color: var(--purpleD);
}

/* Responsive */
@media (max-width: 768px) {
  .auth-modal-overlay {
    padding: 4vw;
  }
  
  .auth-modal-container {
    width: 95%;
    max-height: 95vh;
  }
  
  .auth-modal-header {
    padding: 5vw;
  }
  
  .auth-modal-content {
    padding: 5vw;
    scrollbar-gutter: stable;
  }
  
  .auth-modal-title {
    font-size: 5vw;
  }
  
  .auth-form-label {
    font-size: 3.5vw;
  }
  
  .auth-form-input {
    padding: 3vw 4vw;
    font-size: 3.5vw;
    max-width: 100%;
    box-sizing: border-box;
  }
  
  .auth-form-input::placeholder {
    font-size: 3.5vw;
  }
  
  .auth-submit-btn {
    padding: 4vw 0;
    font-size: 3.5vw;
  }
  
  .auth-checkbox {
    width: 4vw;
    height: 4vw;
  }
  
  .auth-privacy-content {
    max-height: 200px;
  }
}
`;

// Inject styles
(function() {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = authStyles;
  document.head.appendChild(styleSheet);
})();
