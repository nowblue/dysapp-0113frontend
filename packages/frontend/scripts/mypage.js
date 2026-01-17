/**
 * My Page Script (mypage.html)
 * User profile, analysis history, and settings
 */

import {
  getUserProfile,
  updateUserProfile,
  getAnalyses,
  deleteAnalysis,
} from "../services/apiService.js";
import {
  adaptUserProfile,
  adaptAnalysesResponse,
  FORMAT_LABELS,
} from "../utils/dataAdapter.js";
import { getCurrentUser } from "../services/firebaseService.js";
import {
  showLoading,
  hideLoading,
  toast,
  navigateToAnalysis,
  navigateToUpload,
  logoutAndRedirect,
} from "./app.js";
import { onClick, onSubmit, registerCleanup } from "../utils/eventManager.js";

// ============================================================================
// State
// ============================================================================

let userProfile = null;
let analysisHistory = [];
let currentPage = 0;
const pageSize = 12;
let hasMore = false;

// ============================================================================
// DOM Elements
// ============================================================================

const profileSection = document.querySelector(".profile-section");
const bentoGrid = document.querySelector(".bento-grid");
const galleryGrid = document.querySelector(".gallery-grid");
const galleryTabs = document.querySelectorAll(".gallery-tab");
const loadMoreBtn = document.querySelector(".load-more-btn");

let currentTab = "all";

// ============================================================================
// Load Data
// ============================================================================

/**
 * 사용자 프로필 로드 함수
 * 
 * 서버에서 사용자 프로필 정보를 가져와서 화면에 표시합니다.
 * 프로필 정보에는 이름, 이메일, 구독 정보 등이 포함됩니다.
 * 
 * 처리 과정:
 * 1. getUserProfile API 호출
 * 2. 응답 데이터를 UI 형식으로 변환 (adaptUserProfile)
 * 3. 프로필 섹션 렌더링 (renderProfile)
 * 
 * @returns {Promise<void>}
 * 
 * @throws {Error} API 호출 실패 시 (에러 핸들러가 처리)
 * 
 * @example
 * // 페이지 로드 시 자동 호출
 * await loadUserProfile();
 */
async function loadUserProfile() {
  try {
    const response = await getUserProfile();
    if (response.success) {
      userProfile = adaptUserProfile(response);
      renderProfile();
    }
  } catch (error) {
    console.error("[MyPage] Failed to load profile:", error);
    toast.error("프로필을 불러오지 못했습니다");
  }
}

/**
 * 분석 히스토리 로드 함수
 * 
 * 사용자가 분석한 디자인 목록을 페이지네이션 방식으로 로드합니다.
 * 
 * @param {boolean} [append=false] - true면 기존 목록에 추가, false면 새로 로드
 * 
 * 처리 과정:
 * 1. 로딩 상태 표시 (append가 false인 경우만)
 * 2. getAnalyses API 호출 (페이지네이션 파라미터 포함)
 * 3. 응답 데이터를 UI 형식으로 변환
 * 4. Bento Grid 및 갤러리에 렌더링
 * 5. "더 보기" 버튼 상태 업데이트
 * 
 * @returns {Promise<void>}
 * 
 * @example
 * // 첫 페이지 로드
 * await loadAnalysisHistory(false);
 * 
 * // 다음 페이지 추가 로드
 * await loadAnalysisHistory(true);
 */
async function loadAnalysisHistory(append = false) {
  try {
    if (!append) {
      showLoading("히스토리 불러오는 중...");
    }

    const response = await getAnalyses({
      limit: pageSize,
      offset: currentPage * pageSize,
    });

    if (!append) {
      hideLoading();
    }

    if (response.success) {
      const adapted = adaptAnalysesResponse(response);

      if (append) {
        analysisHistory = [...analysisHistory, ...adapted.items];
      } else {
        analysisHistory = adapted.items;
      }

      hasMore = adapted.hasMore;
      renderMainPortfolio();
      renderGallery();
      updateLoadMoreButton();
    }
  } catch (error) {
    hideLoading();
    console.error("[MyPage] Failed to load history:", error);
    toast.error("히스토리를 불러오지 못했습니다");
  }
}

/**
 * Load more history
 */
async function loadMore() {
  if (!hasMore) return;

  currentPage++;
  loadMoreBtn?.classList.add("loading");
  await loadAnalysisHistory(true);
  loadMoreBtn?.classList.remove("loading");
}

// ============================================================================
// Render Functions
// ============================================================================

/**
 * Render user profile section (Exact 51.png Design)
 */
function renderProfile() {
  if (!profileSection) {
    createProfileSection();
    return;
  }

  const profile = userProfile;
  if (!profile) return;

  // Check if user is anonymous/guest
  const currentUser = getCurrentUser();
  const isAnonymous = currentUser && currentUser.isAnonymous;
  const isGuest = !profile.email || isAnonymous;

  // Format contact info - show "미등록" instead of fake placeholder
  const emailDisplay = profile.email || (isGuest ? "미등록" : "");
  const phoneDisplay = profile.phoneNumber || (isGuest ? "미등록" : "");
  
  // Show guest badge if anonymous
  const guestBadge = isGuest ? `
    <div class="profile-guest-badge" style="margin-top: 0.5vw; padding: 0.5vw 1vw; background: var(--purpleA); border-radius: 0.5vw; font-size: var(--text-extra-small); color: var(--purpleMain);">
      <span>게스트 사용자</span>
      <button class="profile-signup-cta" style="margin-left: 0.5vw; background: var(--purpleMain); color: white; border: none; padding: 0.3vw 0.8vw; border-radius: 0.3vw; cursor: pointer; font-size: var(--text-extra-small);" onclick="(async () => { const { showAuthModal } = await import('./scripts/auth.js'); showAuthModal('signup'); })()">
        회원가입하면 기록 유지
      </button>
    </div>
  ` : '';

  profileSection.innerHTML = `
    <h3 class="profile-section-title">나의 정보</h3>
    <div class="profile-card">
      <div class="profile-content">
        <div class="profile-avatar-container">
          <div class="profile-avatar">
            ${
              profile.photoURL
                ? `<img src="${profile.photoURL}" alt="Profile" class="profile-image">`
                : `<div class="profile-initials" style="font-size: 3vw;">${getInitials(profile.displayName)}</div>`
            }
          </div>
          <button class="profile-edit-overlay" title="프로필 편집">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="profile-info">
          <h2 class="profile-name">${profile.displayName || "익명 사용자"}</h2>
          <div class="profile-contact-row">
            ${emailDisplay ? `<p class="profile-contact-item">${emailDisplay}</p>` : ''}
            ${phoneDisplay ? `<p class="profile-contact-item">${phoneDisplay}</p>` : ''}
          </div>
          <div class="profile-badge">${profile.jobTitle || "STUDENT"}</div>
          ${guestBadge}
          ${profile.privacyConsent && profile.privacyConsent.consented ? `
          <div class="profile-privacy-badge" title="개인정보처리방침 동의 완료 (버전: ${profile.privacyConsent.version})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>개인정보 동의 완료</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Add event listeners - Trigger modal on overlay click
  profileSection.querySelector(".profile-edit-overlay")?.addEventListener("click", openProfileEditor);
}

/**
 * Create profile section if not exists
 */
function createProfileSection() {
  const leftColumn = document.querySelector(".left-column");
  if (!leftColumn) return;

  const section = document.createElement("section");
  section.className = "profile-section";
  leftColumn.prepend(section);

  // Re-render
  renderProfile();
}

/**
 * Render main portfolio (Bento Grid) - Top items with overlapping effect
 */
function renderMainPortfolio() {
  if (!bentoGrid) return;

  const topItems = analysisHistory.slice(0, 3); // Show top 3, rest in "more"
  const remainingCount = Math.max(0, analysisHistory.length - 3);

  if (topItems.length === 0) {
    bentoGrid.innerHTML = `
      <div class="empty-portfolio">
        <p>주요 포스터가 없습니다</p>
      </div>
    `;
    return;
  }

  // Bento Grid with overlapping effect - Main large + 2 subs stacked
  bentoGrid.innerHTML = `
    ${topItems.length > 0 ? `
      <div class="bento-item bento-main" data-id="${topItems[0].id}">
        <img src="${topItems[0].imageUrl}" alt="${topItems[0].fileName}" loading="lazy">
        <div class="bento-overlay">
          <h4 class="bento-title">${truncateFileName(topItems[0].fileName, 25)}</h4>
          <div class="bento-meta">
            <span class="bento-badge">${topItems[0].format.label}</span>
          </div>
        </div>
      </div>
    ` : ""}
    ${topItems.length > 1 ? `
      <div class="bento-item bento-sub" data-id="${topItems[1].id}">
        <img src="${topItems[1].imageUrl}" alt="${topItems[1].fileName}" loading="lazy">
        <div class="bento-overlay">
          <span class="bento-badge">${topItems[1].format.label}</span>
        </div>
      </div>
    ` : ""}
    ${topItems.length > 2 ? `
      <div class="bento-item bento-sub" data-id="${topItems[2].id}">
        <img src="${topItems[2].imageUrl}" alt="${topItems[2].fileName}" loading="lazy">
        <div class="bento-overlay">
          <span class="bento-badge">${topItems[2].format.label}</span>
        </div>
      </div>
    ` : ""}
    ${remainingCount > 0 ? `
      <div class="bento-item bento-more" onclick="document.querySelector('.gallery-grid')?.scrollIntoView({ behavior: 'smooth' })">
        <div class="bento-more-content">
          <span class="bento-more-count">+${remainingCount}</span>
        </div>
      </div>
    ` : ""}
  `;

  // Add click event listeners
  bentoGrid.querySelectorAll(".bento-item[data-id]").forEach((item) => {
    const itemId = item.dataset.id;
    item.addEventListener("click", () => {
      navigateToAnalysis(itemId);
    });
  });
}

/**
 * Render style gallery with tabs
 */
function renderGallery() {
  if (!galleryGrid) return;

  // Filter by current tab
  let filteredItems = analysisHistory;
  if (currentTab !== "all") {
    filteredItems = analysisHistory.filter((item) => {
      const formatValue = item.format?.value?.toLowerCase() || "";
      if (currentTab === "typo") {
        return formatValue.includes("editorial") || formatValue.includes("typography");
      } else if (currentTab === "composition") {
        return formatValue.includes("poster") || formatValue.includes("layout");
      } else if (currentTab === "effect") {
        return formatValue.includes("effect") || formatValue.includes("visual");
      }
      return true;
    });
  }

  if (filteredItems.length === 0) {
    galleryGrid.innerHTML = `
      <div class="empty-gallery">
        <p>${currentTab === "all" ? "분석 내역이 없습니다" : "해당 카테고리의 분석이 없습니다"}</p>
        ${currentTab === "all" ? `<button class="btn-start-analysis">첫 분석 시작하기</button>` : ""}
      </div>
    `;

    galleryGrid.querySelector(".btn-start-analysis")?.addEventListener("click", navigateToUpload);
    return;
  }

  galleryGrid.innerHTML = filteredItems
    .map((item) => createGalleryCard(item))
    .join("");

  // Add event listeners
  galleryGrid.querySelectorAll(".gallery-card").forEach((card, index) => {
    const item = filteredItems[index];

    card.addEventListener("click", (e) => {
      if (!e.target.closest(".card-delete")) {
        navigateToAnalysis(item.id);
      }
    });

    card.querySelector(".card-delete")?.addEventListener("click", (e) => {
      e.stopPropagation();
      confirmDelete(item.id, item.fileName);
    });
  });
}

/**
 * Create gallery card HTML
 */
function createGalleryCard(item) {
  return `
    <div class="gallery-card" data-id="${item.id}">
      <div class="gallery-card-image">
        <img src="${item.imageUrl}" alt="${item.fileName}" loading="lazy">
        <div class="gallery-card-overlay">
          <button class="card-delete" title="삭제">
            <img src="./img/delete_white.svg" alt="Delete">
          </button>
        </div>
      </div>
      <div class="gallery-card-info">
        <h4 class="gallery-card-title">${truncateFileName(item.fileName, 20)}</h4>
        <div class="gallery-card-meta">
          <span class="gallery-card-badge">${item.format.label}</span>
          <span class="gallery-card-date">${item.createdAt?.split(' ')[0] || ""}</span>
        </div>
      </div>
    </div>
  `;
}


/**
 * Update load more button visibility
 */
function updateLoadMoreButton() {
  if (loadMoreBtn) {
    loadMoreBtn.style.display = hasMore ? "block" : "none";
  }
}

/**
 * Handle gallery tab click
 */
function handleTabClick(tab) {
  currentTab = tab;
  
  // Update tab active state
  galleryTabs.forEach((t) => {
    if (t.dataset.tab === tab) {
      t.classList.add("active");
    } else {
      t.classList.remove("active");
    }
  });

  // Re-render gallery
  renderGallery();
}

// ============================================================================
// Profile Editor
// ============================================================================

/**
 * Open profile editor modal - Updated to match 53.png design
 */
function openProfileEditor() {
  // Check if user is anonymous/guest
  const currentUser = getCurrentUser();
  const isAnonymous = currentUser && currentUser.isAnonymous;
  const isGuest = !userProfile?.email || isAnonymous;

  // Create modal
  const modal = document.createElement("div");
  modal.className = "profile-modal";
  modal.innerHTML = `
    <div class="profile-modal-content">
      <div class="profile-modal-header">
        <h2 class="profile-modal-title">나의 정보 수정</h2>
        <button class="profile-modal-close" aria-label="닫기">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      
      <form class="profile-modal-form">
        <div class="profile-modal-body">
          <!-- Left: Image Section -->
          <div class="profile-modal-image-section">
            <label class="profile-modal-label">이미지</label>
            <div class="profile-modal-avatar-container">
              <div class="profile-modal-avatar">
                ${
                  userProfile?.photoURL
                    ? `<img src="${userProfile.photoURL}" alt="Profile" class="profile-modal-avatar-img">`
                    : `<div class="profile-modal-avatar-initials">${getInitials(userProfile?.displayName || "?")}</div>`
                }
              </div>
            </div>
          </div>
          
          <!-- Right: Form Fields Section -->
          <div class="profile-modal-fields-section">
            <!-- Nickname Field -->
            <div class="profile-modal-field-group">
              <label for="profileDisplayName" class="profile-modal-label">닉네임</label>
              <input 
                type="text" 
                id="profileDisplayName" 
                class="profile-modal-input" 
                value="${userProfile?.displayName || ""}" 
                placeholder="닉네임을 입력하세요"
              >
            </div>
            
            <!-- Subscription Status -->
            <div class="profile-modal-subscription">
              <span class="profile-modal-subscription-label">구독 버전</span>
              <span class="profile-modal-subscription-value">무료 버전 사용중</span>
            </div>
            
            <!-- Action Buttons -->
            <div class="profile-modal-actions">
              ${isGuest ? `
              <button type="button" class="profile-modal-action-btn" id="createAccountBtn">
                계정 만들기 (기록 유지)
              </button>
              ` : `
              <button type="button" class="profile-modal-action-btn" id="changePasswordBtn">
                비밀번호 변경
              </button>
              <button type="button" class="profile-modal-action-btn" id="addAccountBtn">
                계정 추가
              </button>
              `}
              <button type="button" class="profile-modal-action-btn" id="logoutBtn">
                로그아웃
              </button>
            </div>
          </div>
        </div>
        
        <!-- Bottom Save Button -->
        <div class="profile-modal-footer">
          <button type="submit" class="profile-modal-save-btn">저장</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('show');
  });

  // Event handlers with cleanup tracking
  const modalUnsubscribeFunctions = [];

  // Close button
  const closeBtn = modal.querySelector(".profile-modal-close");
  if (closeBtn) {
    const unsub = onClick(closeBtn, () => {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.remove();
        }
      }, 300);
    });
    modalUnsubscribeFunctions.push(unsub);
  }

  // Handle create account button (for guest users)
  const createAccountBtn = modal.querySelector("#createAccountBtn");
  if (createAccountBtn) {
    const unsub = onClick(createAccountBtn, async () => {
      modal.classList.remove('show');
      setTimeout(async () => {
        if (modal.parentNode) {
          modal.remove();
        }
        try {
          const { showAuthModal } = await import('./auth.js');
          showAuthModal('signup');
        } catch (error) {
          console.error('[MyPage] Failed to load auth modal:', error);
          toast.error('인증 모달을 불러올 수 없습니다.');
        }
      }, 300);
    });
    modalUnsubscribeFunctions.push(unsub);
  }

  // Handle change password button (for registered users)
  const changePasswordBtn = modal.querySelector("#changePasswordBtn");
  if (changePasswordBtn) {
    const unsub = onClick(changePasswordBtn, () => {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.remove();
        }
        window.location.href = './settings.html#account';
      }, 300);
    });
    modalUnsubscribeFunctions.push(unsub);
  }

  // Handle add account button (for registered users)
  const addAccountBtn = modal.querySelector("#addAccountBtn");
  if (addAccountBtn) {
    const unsub = onClick(addAccountBtn, () => {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.remove();
        }
        window.location.href = './settings.html#account';
      }, 300);
    });
    modalUnsubscribeFunctions.push(unsub);
  }

  // Logout button
  const logoutBtn = modal.querySelector("#logoutBtn");
  if (logoutBtn) {
    const unsub = onClick(logoutBtn, async () => {
      if (confirm("로그아웃 하시겠습니까?")) {
        try {
          modal.classList.remove('show');
          setTimeout(() => {
            if (modal.parentNode) {
              modal.remove();
            }
          }, 300);
          // Use standardized logout function
          await logoutAndRedirect();
        } catch (error) {
          toast.error("로그아웃에 실패했습니다");
        }
      }
    });
    modalUnsubscribeFunctions.push(unsub);
  }

  // Form submit
  const form = modal.querySelector(".profile-modal-form");
  if (form) {
    const unsub = onSubmit(form, async (e) => {
      e.preventDefault();
      const displayName = modal.querySelector("#profileDisplayName")?.value?.trim();

      try {
        await updateUserProfile({ displayName });
        toast.success("프로필이 수정되었습니다");
        modal.classList.remove('show');
        setTimeout(() => {
          if (modal.parentNode) {
            modal.remove();
          }
        }, 300);
        loadUserProfile();
      } catch (error) {
        toast.error("프로필 수정에 실패했습니다");
      }
    });
    modalUnsubscribeFunctions.push(unsub);
  }

  // Modal backdrop click
  const unsubBackdrop = onClick(modal, (e) => {
    if (e.target === modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.remove();
        }
      }, 300);
    }
  });
  modalUnsubscribeFunctions.push(unsubBackdrop);

  // Cleanup 등록
  registerCleanup(() => {
    modalUnsubscribeFunctions.forEach((unsub) => {
      try {
        unsub();
      } catch (error) {
        console.error('[MyPage] Error during modal cleanup:', error);
      }
    });
    modalUnsubscribeFunctions.length = 0;
    if (modal.parentNode) {
      modal.remove();
    }
  });
}

// ============================================================================
// Delete Handling
// ============================================================================

/**
 * Confirm and delete analysis
 */
function confirmDelete(analysisId, fileName) {
  if (!confirm(`"${fileName}" 분석을 삭제하시겠습니까?`)) {
    return;
  }

  handleDelete(analysisId);
}

/**
 * Handle delete
 */
async function handleDelete(analysisId) {
  try {
    showLoading("삭제 중...");
    await deleteAnalysis(analysisId);
    hideLoading();

    // Remove from local state
    analysisHistory = analysisHistory.filter((item) => item.id !== analysisId);
    renderMainPortfolio();
    renderGallery();

    // Update profile count
    if (userProfile) {
      userProfile.analysisCount = Math.max(0, userProfile.analysisCount - 1);
      renderProfile();
    }

    toast.success("삭제되었습니다");
  } catch (error) {
    hideLoading();
    console.error("[MyPage] Delete failed:", error);
    toast.error("삭제에 실패했습니다");
  }
}

// ============================================================================
// Sign Out
// ============================================================================

/**
 * Handle sign out
 * @deprecated Use logoutAndRedirect from app.js instead
 */
async function handleSignOut() {
  if (!confirm("로그아웃 하시겠습니까?")) {
    return;
  }

  try {
    await logoutAndRedirect();
  } catch (error) {
    toast.error("로그아웃에 실패했습니다");
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get initials from name
 */
function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate file name
 */
function truncateFileName(name, maxLength = 18) {
  if (!name || name.length <= maxLength) return name || "";
  return name.slice(0, maxLength - 3) + "...";
}

/**
 * Get color based on score
 */
function getScoreColor(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

// ============================================================================
// Styles
// ============================================================================

const mypageStyles = `
/* ============================================================================
   Layout - Exact Match to 51.svg (1920x1080 기준)
   ============================================================================ */

.mypage_main {
  width: 100%; /* .wrap이 이미 margin-left를 가지고 있으므로 100% 사용 */
  min-height: 100vh;
  padding: 5.84vw 6.84vw 0 3.84vw; /* SVG: y=150.5 -> 150.5/1920 = 7.84vw  -> 수정*/
  background: var(--background);
  margin-left: 0; /* .wrap의 margin-left 사용 */
  box-sizing: border-box;
  font-family: 'SUITE', 'Rubik', sans-serif;
  position: relative; /* z-index를 위한 position */
  z-index: var(--z-content);
}

/* 헤더 삭제 */
.mypage-header {
  display: none;
}

/* 2단 레이아웃 - SVG 정확한 비율 */
.mypage-layout {
  display: flex;
  gap: 2.19vw; /* SVG: 좌측 Bento Grid 끝 150.5+739=889.5px, 우측 Gallery Grid 첫 카드 시작 970px, 차이 80.5px -> 80.5/1920 = 4.19vw */
  align-items: flex-start;
  margin-top: 0;
}

.left-column {
  flex: 0 0 45.49%; /* SVG: 프로필 카드 460 + 포스터 739 = 1199px, 하지만 좌측은 약 610px -> 31.77vw, 여유있게 38.49% */
  display: flex;
  flex-direction: column;
  gap: 2.51vw; /* SVG: 529.5-455.5 = 74px -> 3.85vw, 간격은 약 3.51vw */
  max-width: 45.49vw; /* 최대 너비 제한 */
}

.right-column {
  flex: 1;
  min-width: 0;
}

/* ============================================================================
   Profile Section - Exact Match to 51.svg
   ============================================================================ */

.profile-section {
  width: 100%;
}

/* "나의 정보" 제목 - SVG: x=166.76, y=118.024 */
.profile-section-title {
  font-size: var(--text-small);
  font-weight: 700;
  color: #875CFF; /* SVG: fill="#875CFF" */
  margin: 0 0 1vw 0; /* SVG: y=118.024, 카드 y=150.5, 차이 32.476px -> 1.69vw */
  letter-spacing: -0.02em;
  line-height: var(--line-height-tight);
}

/* 프로필 카드 - SVG: x=150.5, y=150.5, width=460, height=305, rx=10.5 */
.profile-card {
  position: relative;
  width: 20.96vw; /* 460/1920  23.96 ->20.96*/
  min-height: 12.89vw; /* 305/1920 (비율 유지) */
  padding: 1.54vw; /* SVG: 아바타 offset 29.5px -> 1.54vw */
  background: white;
  border-radius: 0.547vw; /* 10.5/1920 */
  border: 1px solid #EBEBF8; /* SVG: stroke="#EBEBF8" */
  box-shadow: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.profile-content {
  display: flex;
  gap: 1.25vw; /* SVG: 텍스트 시작 x=370, 아바타 끝 x=351, 차이 약 24px -> 1.25vw */
  align-items: flex-start;
  height: 100%;
}

/* 프로필 아바타 - SVG: x=180, y=180, width=171, height=246, rx=11 */
/* 비율: 171:246 = 1:1.44 */
.profile-avatar-container {
  flex-shrink: 0;
  position: relative;
}

.profile-avatar {
  width: 8.91vw; /* 171/1920 */
  height: 12.81vw; /* 246/1920 (비율 유지: 171*1.44 = 246) */
  aspect-ratio: 171 / 246; /* 정확한 비율 유지 */
  border-radius: 0.573vw; /* 11/1920 */
  overflow: hidden;
  background: #FDF6D0; /* 노란색 배경 */
  border: none;
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 0vw 0.8vw #875cff6e;
}

.profile-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-initials {
  font-size: 2.5vw;
  font-weight: 700;
  color: var(--navy);
}

/* 편집 아이콘 - SVG: x=249, y=286, width=34, height=34, rx=6.8, fill="#EBEBF8" */
/* 아바타 내부에서의 위치: x=69px (249-180), y=106px (286-180) */
.profile-edit-overlay {
  position: absolute;
  top: 43.09%; /* SVG: 106/246 = 43.09% (아바타 높이 기준) */
  left: 40.35%; /* SVG: 69/171 = 40.35% (아바타 너비 기준) */
  transform: translate(-50%, -50%); /* 중앙 정렬 */
  width: 1.77vw; /* 34/1920 */
  height: 1.77vw; /* 정사각형 유지 */
  background: #EBEBF8; /* SVG: fill="#EBEBF8" */
  border-radius: 0.354vw; /* 6.8/1920 */
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
  z-index: 10;
  box-shadow: 0 0.1vw 0.3vw rgba(0,0,0,0.1);
}

.profile-edit-overlay:hover {
  background: #D0D0FF;
  transform: scale(1.1);
}

.profile-edit-overlay svg {
  width: 0.9vw;
  height: 0.9vw;
  color: #875CFF;
}

/* 프로필 정보 */
.profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  // gap: 0.5vw;
  justify-content: center;
  padding-top: 0;
}

.profile-name {
  font-size: var(--text-small);
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 0vw 0;
  letter-spacing: -0.02em;
  line-height: var(--line-height-tight);
}

.profile-contact-row {
  display: flex;
  flex-direction: column;
  gap: 0.2vw;
  margin: 0.3vw 0;
}

.profile-contact-item {
  font-size: var(--text-tiny);
  color: #666;
  margin: 0;
  line-height: var(--line-height-base);
  font-weight: 400;
}

/* STUDENT 배지 - SVG: x=370, y=280, width=82, height=30, rx=4, fill="#875CFF" */
.profile-badge {
  background: #875CFF; /* SVG: fill="#875CFF" */
  color: white;
  font-size: var(--text-extra-small);
  font-weight: 600;
  padding: 0.38vw 0.34vw; /* SVG: height=30 -> 1.56vw, width=82 -> 4.27vw, 패딩은 약간 조정 */
  border-radius: 0.208vw; /* 4/1920 */
  text-transform: uppercase;
  letter-spacing: 0.05em;
  width: fit-content;
  margin-top: 0.5vw;
  text-align: center;
  line-height: 1.2;
}

.profile-privacy-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5vw;
  background: var(--purpleGy);
  color: var(--purpleMain);
  font-size: var(--text-extra-small);
  font-weight: 500;
  padding: 0.5vw 1vw;
  border-radius: 0.5vw;
  margin-top: 0.5vw;
  // margin-left: 0.5vw;
}

.profile-privacy-badge svg {
  flex-shrink: 0;
  width: 1vw;
  height: 1vw;
}

/* ============================================================================
   Portfolio Section - Exact Match to 51.svg
   ============================================================================ */

.portfolio-section {
  width: 100%;
}

.portfolio-titwrap{
  margin-bottom: 1.2vw;
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 1vw;
}

.portfolio-title {
  font-size: var(--text-small);
  font-weight: 700;
  color: var(--navy);
  letter-spacing: -0.02em;
  line-height: var(--line-height-tight);
}

.portfolio-edit {
  margin-left: 28vw;
  border: none;
  background: none;
}

.portfolio-fixpin{
  height: 0.9vw;
}

.portfolio-editimg{
  width:0.9vw;
}

/* 주 그래픽 포스터 카드 - SVG: x=150.5, y=529.5, width=739, height=514, rx=11.5, stroke="#C291FF" */
.bento-grid {
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  grid-template-rows: auto auto;
  gap: 0.8vw;
  grid-template-areas:
    "main sub1"
    "main sub2";
  background: white;
  border-radius: 0.599vw; /* 11.5/1920 */
  // padding: 1.2vw;
  border: 1px solid #C291FF; /* SVG: stroke="#C291FF" */
  box-shadow: none;
  width: 100%; /* 부모 컨테이너에 맞춤 */
  min-height: 24.77vw; /* 514/1920 (비율 유지) */
}

.bento-item {
  position: relative;
  border-radius: 0.8vw;
  overflow: hidden;
  cursor: pointer;
  background: white;
  border: 1px solid rgba(0,0,0,0.05);
  box-shadow: 0 0.2vw 0.4vw rgba(0,0,0,0.04);
  transition: all var(--ease-smooth) 0.25s;
}

.bento-item:hover {
  transform: translateY(-0.15vw);
  box-shadow: var(--shadow-md);
  border-color: var(--purpleGy);
  z-index: 2;
}

.bento-main {
  grid-area: main;
  min-height: 18vw;
}

.bento-sub:nth-child(2) { 
  grid-area: sub1; 
  min-height: 8vw;
}
.bento-sub:nth-child(3) { 
  grid-area: sub2; 
  min-height: 8vw;
}

/* Image Handling - Fill container */
.bento-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s var(--ease-smooth);
}

.bento-item:hover img {
  transform: scale(1.08);
}

/* Overlay - Subtle on hover */
.bento-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1vw;
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s var(--ease-smooth);
}

.bento-item:hover .bento-overlay {
  opacity: 1;
}

.bento-title {
  color: white;
  font-size: var(--text-small);
  font-weight: 600;
  margin-bottom: 0.3vw;
  text-shadow: 0 1px 3px rgba(0,0,0,0.4);
  line-height: var(--line-height-tight);
}

.bento-meta {
  display: flex;
  gap: 0.4vw;
  align-items: center;
}

.bento-badge {
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(6px);
  color: white;
  padding: 0.15vw 0.5vw;
  border-radius: 0.3vw;
  font-size: var(--text-extra-small);
  font-weight: 500;
  border: 1px solid rgba(255,255,255,0.3);
}

/* More Card - Exact Design */
.bento-more {
  grid-area: sub2;
  background: var(--purpleA);
  border: 1px dashed var(--purpleF);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.bento-more:hover {
  background: var(--purpleB);
  border-color: var(--purpleMain);
  transform: translateY(-0.1vw);
}

.bento-more-content {
  text-align: center;
}

.bento-more-count {
  font-size: 1.5vw;
  font-weight: 700;
  color: var(--purpleMain);
  display: block;
  line-height: 1.2;
}

.bento-more-text {
  display: none; /* Remove text per design */
}

.empty-portfolio {
  grid-column: 1 / -1;
  background: white;
  border-radius: 1vw;
  border: 1px dashed var(--Gray);
  padding: 3vw;
  text-align: center;
  color: var(--purpleC);
  margin:1vw;
}

.empty-portfolio p{
  font-size:var(--text-small);
}

/* ============================================================================
   Style Gallery - Exact Match to 51.svg
   ============================================================================ */

.style-gallery-section {
  width: 100%;
}

.gallery-header {
  // margin-bottom: 1vw;
}

.gallery-title {
  font-size: var(--text-small);
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 1.2vw;
  letter-spacing: -0.02em;
  line-height: var(--line-height-tight);
}

/* Folder Tabs - Exact Design */
.gallery-tabs {
  display: flex;
  gap: 0;
  background: transparent;
  border-bottom: 2px solid white;
  padding: 0;
  margin-bottom: 0;
}

.gallery-tab {
  padding: 0.7vw 1.8vw;
  background: transparent;
  // border: none;
   border: 1px solid transparent;
  border-bottom: 2px solid transparent;
  color: var(--purpleC);
  font-size: var(--text-small);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--ease-smooth) 0.2s;
  position: relative;
  margin-bottom: -2px;
}

.gallery-tab:hover {
  color: var(--purpleMain);
  background: rgba(135, 92, 255, 0.03);
}

.gallery-tab.active {
  color: var(--purpleMain);
  border-bottom-color: var(--background);
  border-top-color: #C291FF;
  border-left-color: #C291FF;
  border-right-color: #C291FF;
  border-top-left-radius:0.573vw;
  border-top-right-radius:0.573vw;
  background: transparent;
}

/* 스타일 갤러리 컨테이너 - SVG: x=940, y=110, width=938, height=991 */
.gallery-grid {
  background: white;
  // border-radius: 0.573vw; /* 11/1920 */
  padding: 1.5vw;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.2vw;
  box-shadow: none;
  border: 1px solid #C291FF; /* SVG: Bento Grid와 동일한 색상 및 굵기 */
  // box-shadow: 0 0vw 0.2vw var(--purpleMain);
  border-bottom-left-radius:0.573vw;
  border-bottom-right-radius:0.573vw;
  border-top-right-radius:0.573vw;
  margin-top: -1.5px;
  min-height: 51.61vw; /* 991/1920 (비율 유지) */
  width: 100%; /* 부모 컨테이너에 맞춤 */
}

.gallery-card {
  background: white;
  border-radius: 0.8vw;
  overflow: hidden;
  border: 1px solid var(--purpleGy);
  transition: all var(--ease-smooth) 0.25s;
  cursor: pointer;
}

.gallery-card:hover {
  transform: translateY(-0.2vw);
  box-shadow: var(--shadow-md);
  border-color: var(--purpleF);
}

.gallery-card-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  position: relative;
  overflow: hidden;
  background: var(--purpleA);
}

.gallery-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s var(--ease-smooth);
  display: block;
}

.gallery-card:hover .gallery-card-image img {
  transform: scale(1.1);
}

.gallery-card-overlay {
  position: absolute;
  top: 0.6vw;
  right: 0.6vw;
  opacity: 0;
  transition: opacity 0.2s var(--ease-smooth);
}

.gallery-card:hover .gallery-card-overlay {
  opacity: 1;
}

.card-delete {
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(6px);
  width: 2vw;
  height: 2vw;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.card-delete:hover {
  background: #EF4444;
  border-color: #EF4444;
  transform: scale(1.1);
}

.card-delete img {
  width: 0.9vw;
  height: 0.9vw;
  filter: brightness(0) invert(1);
}

.gallery-card-info {
  padding: 0.9vw;
  background: white;
}

.gallery-card-title {
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--navy);
  margin: 0 0 0.4vw 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: var(--line-height-tight);
}

.gallery-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5vw;
}

.gallery-card-badge {
  font-size: var(--text-extra-small);
  background: var(--purpleA);
  color: var(--purpleMain);
  padding: 0.15vw 0.5vw;
  border-radius: 0.3vw;
  font-weight: 500;
}

.gallery-card-date {
  font-size: var(--text-extra-small);
  color: var(--purpleGy2);
  font-weight: 400;
}

.empty-gallery {
  grid-column: 1 / -1;
  text-align: center;
  padding: 5vw;
  color: #BBB;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.btn-start-analysis {
  margin-top: 1.5vw;
  background: #875CFF;
  color: white;
  padding: 0.8vw 2vw;
  border-radius: 2vw;
  border: none;
  font-weight: 600;
  font-size: 0.9vw;
  cursor: pointer;
  box-shadow: 0 0.5vw 1vw rgba(135, 92, 255, 0.2);
  transition: transform 0.2s;
}

.btn-start-analysis:hover {
  transform: translateY(-0.2vw);
  background: #7B4FE0;
}

/* ============================================================================
   Load More Button
   ============================================================================ */

.load-more-btn {
  margin: 2vw auto 0;
  padding: 0.8vw 2.5vw;
  background: white;
  border: 1px solid #E0E0E0;
  border-radius: 2vw;
  color: #555;
  font-weight: 600;
  font-size: 0.9vw;
  cursor: pointer;
  transition: all 0.2s ease;
}

.load-more-btn:hover {
  border-color: #875CFF;
  color: #875CFF;
  background: #F8F7FF;
}

/* ============================================================================
   Profile Modal - Exact Match to 53.png Design
   ============================================================================ */
.profile-modal {
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
  backdrop-filter: blur(0.2vw);
}

.profile-modal.show {
  opacity: 1;
}

.profile-modal-content {
  background: white;
  border-radius: 1vw;
  width: 90%;
  max-width: 55vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
  transform: scale(0.95);
  transition: transform 0.3s var(--ease-smooth);
}

.profile-modal.show .profile-modal-content {
  transform: scale(1);
}

/* Modal Header */
.profile-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2.5vw;
  border-bottom: 1px solid var(--purpleGy);
  background: white;
  position: relative;
}

.profile-modal-title {
  font-size: var(--text-large);
  font-weight: 700;
  color: var(--navy);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: var(--line-height-tight);
}

.profile-modal-close {
  position: absolute;
  right: 2.5vw;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5vw;
  color: var(--navy);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s var(--ease-smooth);
}

.profile-modal-close:hover {
  color: var(--purpleMain);
}

/* Modal Body - Two Column Layout Updated for 53.png */
.profile-modal-body {
  display: flex;
  gap: 3vw;
  padding: 2.5vw;
  overflow-y: auto;
  flex: 1;
}

.profile-modal-image-section {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5vw;
}

.profile-modal-label {
  font-size: 0.9vw;
  font-weight: 500;
  color: #888;
  margin-bottom: 0.5vw;
}

.profile-modal-avatar {
  width: 14vw;
  height: 18vw;
  border-radius: 1vw;
  background: #FDF6D0; /* Yellow bg */
  border: none;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Fields Section */
.profile-modal-fields-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5vw;
  padding-top: 1.8vw; /* Align with image top */
}

.profile-modal-input {
  width: 100%;
  padding: 1vw 1.2vw;
  border-radius: 0.5vw;
  background: white;
  border: 1px solid var(--purpleGy);
  font-size: var(--text-small);
  color: var(--navy);
  font-family: 'SUITE', 'Rubik', sans-serif;
  transition: all var(--ease-smooth) 0.2s;
  margin-top: 0.5vw;
}

.profile-modal-input:hover {
  border-color: var(--purpleF);
}

.profile-modal-input:focus {
  outline: none;
  border-color: var(--purpleMain);
  box-shadow: 0 0 0 0.2vw rgba(135, 92, 255, 0.1);
}

.profile-modal-actions {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 1vw;
  border-top: 1px solid #EEE;
  border-bottom: 1px solid #EEE;
}

.profile-modal-action-btn {
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
  transition: all var(--ease-smooth) 0.2s;
  font-family: 'SUITE', 'Rubik', sans-serif;
}

.profile-modal-action-btn:last-child {
  border-bottom: none;
}

.profile-modal-action-btn:hover {
  background: #F9F9F9;
  padding-left: 0.5vw;
}

/* Footer Center Button */
.profile-modal-footer {
  padding: 2.5vw;
  background: white;
  display: flex;
  justify-content: center;
  border-top: 1px solid var(--purpleGy);
}

.profile-modal-save-btn {
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

.profile-modal-save-btn:hover {
  background: var(--purpleD);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.profile-modal-save-btn:active {
  transform: translateY(0);
}

/* ============================================================================
   Responsive Design - Maintain SVG Proportions
   ============================================================================ */
@media (max-width: 1024px) {
  .mypage-layout {
    flex-direction: column;
    gap: 4vw;
  }
  
  .left-column {
    flex: 1 1 auto;
    width: 100%;
    max-width: 100%;
  }
  
  .right-column {
    width: 100%;
  }
  
  .profile-card {
    width: 100%;
    min-height: auto;
  }
  
  .profile-avatar {
    width: 12vw;
    height: auto;
  }
  
  .bento-grid {
    width: 100%;
    min-height: auto;
    grid-template-columns: 1fr 1fr;
  }
  
  .bento-main {
    min-height: 30vw;
  }
  
  .bento-sub {
    min-height: 15vw;
  }
  
  .gallery-grid {
    width: 100%;
    min-height: auto;
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .mypage_main {
    width: 100%;
    margin-left: 0;
    padding: 5vw;
  }
  
  .profile-section-title {
    font-size: 4vw;
  }
  
  .profile-card {
    padding: 4vw;
    border-radius: 2vw;
  }
  
  .profile-content {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 3vw;
  }
  
  .profile-avatar {
    width: 20vw;
    height: auto;
  }
  
  .profile-edit-overlay {
    width: 4vw;
    height: 4vw;
    top: 50%;
    left: 50%;
  }
  
  .profile-name {
    font-size: 5vw;
  }
  
  .profile-badge {
    font-size: 2.5vw;
    padding: 1vw 2vw;
    margin: 1vw auto 0;
  }
  
  .profile-privacy-badge {
    font-size: 2vw;
    padding: 1vw 2vw;
    margin-top: 1vw;
    gap: 1vw;
  }
  
  .profile-privacy-badge svg {
    width: 3vw;
    height: 3vw;
  }
  
  .profile-contact-item {
    font-size: 3vw;
  }
  
  .bento-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "main"
      "sub1"
      "sub2";
    padding: 3vw;
  }
  
  .bento-main {
    min-height: 50vw;
  }
  
  .bento-sub {
    min-height: 25vw;
  }
  
  .gallery-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
  }
  
  .gallery-tab {
    flex: 0 0 auto;
    font-size: 3.5vw;
    padding: 2vw 4vw;
    white-space: nowrap;
  }
  
  .gallery-grid {
    grid-template-columns: 1fr;
    padding: 4vw;
  }
  
  .gallery-card-title {
    font-size: 3.5vw;
  }
  
  .gallery-card-badge {
    font-size: 3vw;
  }
}
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = mypageStyles;
document.head.appendChild(styleSheet);

// ============================================================================
// Initialize
// ============================================================================

function init() {
  console.log("[MyPage] Initializing my page...");

  // Validate DOM elements
  if (!profileSection || !bentoGrid || !galleryGrid) {
    console.error("[MyPage] Required DOM elements not found");
    return;
  }

  const mypageUnsubscribeFunctions = [];

  // Setup gallery tabs using eventManager
  galleryTabs.forEach((tab) => {
    if (tab) {
      const unsub = onClick(tab, () => {
        handleTabClick(tab.dataset.tab);
      });
      mypageUnsubscribeFunctions.push(unsub);
    }
  });

  // Set active navigation
  setActiveNavigation();

  // Load data
  loadUserProfile();
  loadAnalysisHistory();

  // Setup load more button
  if (loadMoreBtn) {
    const unsub = onClick(loadMoreBtn, loadMore);
    mypageUnsubscribeFunctions.push(unsub);
  }

  // Register cleanup callback
  registerCleanup(() => {
    mypageUnsubscribeFunctions.forEach((unsub) => unsub());
    mypageUnsubscribeFunctions.length = 0;
  });
}

/**
 * Set active navigation state for current page
 */
function setActiveNavigation() {
  // Wait for nav.html to be loaded by includHTML.js
  setTimeout(() => {
    const navLinks = document.querySelectorAll('.nav_tab a');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && (href.includes('mypage.html') || href === './mypage.html')) {
        link.classList.add('active');
        // Also mark parent li as active
        const parentLi = link.closest('li');
        if (parentLi) {
          parentLi.classList.add('active');
        }
      } else {
        link.classList.remove('active');
        const parentLi = link.closest('li');
        if (parentLi) {
          parentLi.classList.remove('active');
        }
      }
    });
  }, 200); // Give includHTML.js time to load nav.html
}

// Wait for app initialization
window.addEventListener("dysapp:ready", init);

// Also try immediate init if already ready
if (window.dysapp?.initialized) {
  init();
}
