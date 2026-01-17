/**
 * Search Page Script (searchTab.html)
 * Handles image-based and filter-based search
 */

import {
  searchSimilar,
  searchText,
  customSearch,
  saveItem,
  getBookmarks,
  deleteBookmark,
  analyzeDesign,
  getAnalysis,
  readFileAsBase64,
  validateImageFile,
  getLastAnalysisId,
} from "../services/apiService.js";
import { adaptSearchResponse, adaptTextSearchResponse, FORMAT_LABELS, FIX_SCOPE_LABELS } from "../utils/dataAdapter.js";
import {
  showLoading,
  hideLoading,
  toast,
  navigateToAnalysis,
} from "./app.js";
import { setSessionState, getSessionState, removeSessionState } from "../utils/stateManager.js";
import { onClick, onChange, onKeyDown, addEventListener, registerCleanup } from "../utils/eventManager.js";
import { debounce, throttle } from "../utils/performance.js";

// ============================================================================
// State
// ============================================================================

let searchResults = [];
let customSearchResults = [];
let bookmarkResults = [];
let currentFilters = {
  format: null,
  fixScope: null,
  minScore: null,
};
let currentCategory = "my-style"; // Track current category tab

// Custom Search state
let currentSearchQuery = null;
let currentSearchStart = 1;
let isLoadingMore = false;
let hasMoreResults = true;
let lastAnalysisData = null;

// ============================================================================
// DOM Elements
// ============================================================================

const searchInput = document.querySelector(".search");
const searchBtn = document.querySelector(".searchIcon");
const uploadBtn = document.querySelector(".uploadIcon");
const filterBtn = document.querySelector(".filter");
const resultsGrid = document.querySelector(".searchImgBox");
const categoryTabs = document.querySelectorAll(".filenameBox");

// Create hidden file input for upload
const uploadInput = document.createElement("input");
uploadInput.type = "file";
uploadInput.accept = "image/png, image/jpeg";
uploadInput.style.display = "none";
document.body.appendChild(uploadInput);

// ============================================================================
// Query Generation Functions
// ============================================================================

/**
 * 분석 데이터에서 검색 쿼리 생성 함수
 * 
 * 분석 결과 데이터를 기반으로 검색에 사용할 쿼리 문자열을 생성합니다.
 * 우선순위에 따라 가장 적합한 검색어를 선택합니다.
 * 
 * 우선순위:
 * 1. ragSearchQueries: AI가 생성한 검색 쿼리 (최우선)
 * 2. detectedKeywords: 감지된 키워드 배열
 * 3. formatPrediction: 디자인 포맷 예측값
 * 
 * @param {Object} analysis - 분석 결과 데이터 객체
 * @param {string[]} [analysis.ragSearchQueries] - AI 생성 검색 쿼리 배열
 * @param {string[]} [analysis.detectedKeywords] - 감지된 키워드 배열
 * @param {string} [analysis.formatPrediction] - 디자인 포맷 예측값
 * 
 * @returns {string|null} 검색 쿼리 문자열 또는 null
 * 
 * @example
 * const analysis = {
 *   ragSearchQueries: ["모던한 포스터 디자인"],
 *   detectedKeywords: ["타이포그래피", "미니멀"],
 *   formatPrediction: "Poster"
 * };
 * const query = generateSearchQuery(analysis);
 * // 반환: "모던한 포스터 디자인"
 */
function generateSearchQuery(analysis) {
  if (!analysis) return null;

  // Priority 1: ragSearchQueries
  if (analysis.ragSearchQueries && Array.isArray(analysis.ragSearchQueries) && analysis.ragSearchQueries.length > 0) {
    return analysis.ragSearchQueries[0];
  }

  // Priority 2: detectedKeywords
  if (analysis.detectedKeywords && Array.isArray(analysis.detectedKeywords) && analysis.detectedKeywords.length > 0) {
    return analysis.detectedKeywords.join(" ");
  }

  // Priority 3: formatPrediction
  if (analysis.formatPrediction && analysis.formatPrediction !== "Unknown") {
    return `${analysis.formatPrediction} 디자인`;
  }

  return null;
}

/**
 * Get last analysis data from localStorage and API
 */
async function getLastAnalysisData() {
  const lastAnalysisId = getLastAnalysisId();
  if (!lastAnalysisId) {
    return null;
  }

  try {
    const response = await getAnalysis(lastAnalysisId);
    if (response.success && response.analysis) {
      return response.analysis;
    }
  } catch (error) {
    console.error("[Search] Failed to get last analysis:", error);
    // 리다이렉트하지 않고 null 반환
    return null;
  }

  return null;
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * 이미지 업로드 기반 검색 함수
 * 
 * 사용자가 업로드한 이미지를 분석한 후, 분석 결과를 기반으로 유사한 디자인을 검색합니다.
 * 
 * 처리 과정:
 * 1. 파일 유효성 검사
 * 2. 파일을 base64로 변환
 * 3. 이미지 분석 API 호출
 * 4. 분석 결과를 기반으로 유사 디자인 검색
 * 5. 검색 결과 렌더링
 * 
 * @param {File} file - 검색에 사용할 이미지 파일 객체
 * 
 * @returns {Promise<void>}
 * 
 * @throws {Error} 파일 유효성 검사 실패 시
 * @throws {Error} 분석 API 호출 실패 시
 * @throws {Error} 검색 API 호출 실패 시
 * 
 * @example
 * // 파일 입력 이벤트에서 호출
 * uploadInput.addEventListener('change', async (e) => {
 *   const file = e.target.files[0];
 *   if (file) {
 *     await searchByImage(file);
 *   }
 * });
 */
async function searchByImage(file) {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    toast.error(validation.error);
    return;
  }

  try {
    showLoading("이미지 분석 중...");

    // Read file as base64
    const fileData = await readFileAsBase64(file);

    // First analyze the uploaded image
    const analysisResult = await analyzeDesign({
      imageData: fileData.data,
      mimeType: fileData.mimeType,
      fileName: fileData.fileName,
    });

    if (!analysisResult.success) {
      throw new Error("Analysis failed");
    }

    showLoading("유사한 디자인 검색 중...");

    // Search for similar designs
    const searchResult = await searchSimilar({
      analysisId: analysisResult.analysisId,
      limit: 20,
      ...currentFilters,
    });

    hideLoading();

    if (searchResult.success) {
      const adapted = adaptSearchResponse(searchResult);
      searchResults = adapted.items;
      renderSearchResults();
      toast.success(`${adapted.count}개의 유사한 디자인을 찾았습니다`);
    }
  } catch (error) {
    hideLoading();
    console.error("[Search] Image search failed:", error);
    toast.error("검색 중 오류가 발생했습니다");
  }
}

/**
 * Search from existing analysis
 */
async function searchFromAnalysis(analysisId) {
  if (!analysisId) {
    // 빈 결과 표시
    searchResults = [];
    renderSearchResults();
    return;
  }

  try {
    showLoading("유사한 디자인 검색 중...");

    const searchResult = await searchSimilar({
      analysisId,
      limit: 20,
      ...currentFilters,
    });

    hideLoading();

    if (searchResult.success) {
      const adapted = adaptSearchResponse(searchResult);
      searchResults = adapted.items;
      renderSearchResults();
      toast.success(`${adapted.count}개의 유사한 디자인을 찾았습니다`);
    } else {
      // 검색 실패 시 빈 결과 표시 (리다이렉트 없음)
      searchResults = [];
      renderSearchResults();
      const errorMessage = searchResult.message || searchResult.error || '검색 중 오류가 발생했습니다';
      toast.error(errorMessage);
    }
  } catch (error) {
    hideLoading();
    // 에러 발생 시에도 리다이렉트하지 않고 빈 결과 표시
    searchResults = [];
    renderSearchResults();
    console.error("[Search] Search failed:", error);
    toast.error("검색 중 오류가 발생했습니다. 다시 시도해주세요");
  }
}

/**
 * Quick search from last analysis
 */
async function quickSearchFromLastAnalysis() {
  const lastAnalysisId = getLastAnalysisId();
  if (!lastAnalysisId) {
    toast.info("먼저 이미지를 분석해주세요");
    return;
  }

  await searchFromAnalysis(lastAnalysisId);
}

/**
 * Perform Custom Search using GCP Custom Search API
 */
async function performCustomSearch(query, start = 1) {
  if (!query || query.trim().length < 2) {
    toast.error("검색어를 2자 이상 입력해주세요");
    return;
  }

  try {
    if (start === 1) {
      showLoading("관련 이미지 검색 중...");
    }

    const searchResult = await customSearch({
      query: query.trim(),
      start,
      num: 10,
    });

    if (start === 1) {
      hideLoading();
    }

    // Improved response validation: check for success field and items array
    if (searchResult && searchResult.items && Array.isArray(searchResult.items)) {
      // Success case: items array exists (success field may or may not be present)
      if (start === 1) {
        // Replace results for first page
        customSearchResults = searchResult.items;
        currentSearchQuery = query.trim();
        currentSearchStart = 1;
        hasMoreResults = searchResult.items.length >= 10;
      } else {
        // Append results for subsequent pages
        customSearchResults = [...customSearchResults, ...searchResult.items];
        hasMoreResults = searchResult.items.length >= 10;
      }

      renderCustomSearchResults();
      
      if (start === 1 && customSearchResults.length > 0) {
        toast.success(`${customSearchResults.length}개의 관련 이미지를 찾았습니다`);
      } else if (start === 1 && customSearchResults.length === 0) {
        toast.info("검색 결과가 없습니다");
      }
    } else {
      // Invalid response structure
      console.warn("[Search] Invalid search result structure:", searchResult);
      if (start === 1) {
        toast.error("검색 결과를 처리할 수 없습니다");
      }
    }
  } catch (error) {
    if (start === 1) {
      hideLoading();
    }
    console.error("[Search] Custom search failed:", error);
    
    // Improved error handling with specific error messages
    const errorCode = error?.code || "";
    const errorMessage = error?.message || "";
    
    if (errorCode === "functions/unauthenticated" || errorMessage.includes("unauthenticated")) {
      toast.error("로그인이 필요합니다. 잠시 후 다시 시도해주세요.");
    } else if (errorCode === "functions/resource-exhausted" || errorMessage.includes("rate limit")) {
      toast.warning("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
    } else if (errorMessage.includes("네트워크") || errorMessage.includes("network")) {
      toast.error("네트워크 연결을 확인해주세요.");
    } else {
      toast.error("검색 중 오류가 발생했습니다");
    }
  } finally {
    isLoadingMore = false;
  }
}

/**
 * Load more search results (infinite scroll)
 */
// Throttle loadMore to prevent rapid calls
const throttledLoadMore = throttle(async () => {
  if (isLoadingMore || !hasMoreResults || !currentSearchQuery) {
    return;
  }

  isLoadingMore = true;
  currentSearchStart += 10;
  
  await performCustomSearch(currentSearchQuery, currentSearchStart);
}, 1000); // Throttle to max once per second

async function loadMoreSearchResults() {
  await throttledLoadMore();
}

/**
 * Auto search on page load based on current category tab
 * Matches the initial tab state with actual data loading
 */
async function autoSearchOnPageLoad() {
  // Show initial loading state
  if (resultsGrid) {
    resultsGrid.innerHTML = `
      <div class="no-results" style="grid-column: 1 / -1;">
        <p>검색 중...</p>
        <p class="no-results-hint">관련 이미지를 찾고 있습니다</p>
      </div>
    `;
  }

  // Load data based on current category
  try {
    switch (currentCategory) {
      case "my-style":
        // Load similar designs from user's analyses
        const lastAnalysisId = getLastAnalysisId();
        if (lastAnalysisId) {
          await searchFromAnalysis(lastAnalysisId);
        } else {
          if (resultsGrid) {
            resultsGrid.innerHTML = `
              <div class="no-results" style="grid-column: 1 / -1;">
                <p>검색 결과가 없습니다</p>
                <p class="no-results-hint">이미지를 업로드하거나 검색어를 입력해주세요</p>
              </div>
            `;
          }
        }
        break;
      case "my-reference":
        // Load bookmarks
        await loadBookmarks();
        break;
      case "insights":
        // Load custom search results
        const analysisData = await getLastAnalysisData();
        if (analysisData) {
          lastAnalysisData = analysisData;
          const query = generateSearchQuery(analysisData);
          if (query) {
            setTimeout(() => {
              performCustomSearch(query, 1);
            }, 300);
          } else {
            if (resultsGrid) {
              resultsGrid.innerHTML = `
                <div class="no-results" style="grid-column: 1 / -1;">
                  <p>검색할 키워드를 찾지 못했습니다</p>
                  <p class="no-results-hint">이미지를 업로드하거나 검색어를 입력해주세요</p>
                </div>
              `;
            }
          }
        } else {
          if (resultsGrid) {
            resultsGrid.innerHTML = `
              <div class="no-results" style="grid-column: 1 / -1;">
                <p>검색 결과가 없습니다</p>
                <p class="no-results-hint">이미지를 업로드하거나 검색어를 입력해주세요</p>
              </div>
            `;
          }
        }
        break;
      default:
        // Default to empty state
        if (resultsGrid) {
          resultsGrid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1;">
              <p>검색 결과가 없습니다</p>
              <p class="no-results-hint">이미지를 업로드하거나 검색어를 입력해주세요</p>
            </div>
          `;
        }
    }
  } catch (error) {
    // 에러 발생 시에도 리다이렉트하지 않고 빈 결과 표시
    console.error("[Search] Auto search failed:", error);
    if (resultsGrid) {
      resultsGrid.innerHTML = `
        <div class="no-results" style="grid-column: 1 / -1;">
          <p>검색 중 오류가 발생했습니다</p>
          <p class="no-results-hint">다시 시도해주세요</p>
        </div>
      `;
    }
  }
}

/**
 * Perform text-based search
 */
async function performTextSearch(query) {
  if (!query || query.trim().length < 2) {
    toast.error("검색어를 2자 이상 입력해주세요");
    return;
  }

  try {
    showLoading("텍스트 검색 중...");

    const searchResult = await searchText({
      query: query.trim(),
      limit: 20,
      ...currentFilters,
    });

    hideLoading();

    if (searchResult.success) {
      // Adapt text search results to match searchSimilar format
      const adapted = adaptTextSearchResponse(searchResult);
      searchResults = adapted.items;
      renderSearchResults();
      if (adapted.count > 0) {
        toast.success(`${adapted.count}개의 검색 결과를 찾았습니다`);
      } else {
        toast.info("검색 결과가 없습니다. 다른 검색어를 시도해보세요");
      }
    } else {
      toast.error("검색 중 오류가 발생했습니다");
    }
  } catch (error) {
    hideLoading();
    console.error("[Search] Text search failed:", error);
    toast.error("검색 중 오류가 발생했습니다");
  }
}

// ============================================================================
// Render Functions
// ============================================================================

/**
 * Render Custom Search results
 */
function renderCustomSearchResults() {
  if (!resultsGrid) {
    console.warn("[Search] Results grid not found");
    return;
  }

  // Keep the page-dim element
  const pageDim = resultsGrid.querySelector(".page-dim");

  if (customSearchResults.length === 0) {
    resultsGrid.innerHTML = `
      <div class="no-results">
        <p>관련 이미지를 찾지 못했습니다</p>
        <p class="no-results-hint">다른 키워드로 검색해보세요</p>
      </div>
    `;
    if (pageDim) resultsGrid.appendChild(pageDim);
    // Setup observer even for empty state (in case results load later)
    setupInfiniteScrollObserver();
    return;
  }

  // Clear existing images but keep structure
  resultsGrid.innerHTML = customSearchResults
    .map((result, index) => createCustomSearchImage(result, index))
    .join("");

  // Add loading indicator at the bottom if more results available
  if (hasMoreResults) {
    const loadingIndicator = document.createElement("div");
    loadingIndicator.className = "custom-search-loading";
    loadingIndicator.id = "customSearchLoadingIndicator";
    loadingIndicator.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #7C7895;">
        <p>더 많은 이미지 불러오는 중...</p>
      </div>
    `;
    resultsGrid.appendChild(loadingIndicator);
  }

  if (pageDim) resultsGrid.appendChild(pageDim);

  // Setup infinite scroll observer (always call, even if no more results)
  setupInfiniteScrollObserver();
}

/**
 * Clean image URL to remove problematic parameters
 * Removes format and auto parameters that can cause 406 errors
 */
function cleanImageUrl(url) {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    // Remove problematic parameters for known CDNs or globally
    if (urlObj.hostname.includes('gcdn') || urlObj.hostname.includes('democratandchronicle')) {
       urlObj.searchParams.delete('format'); // e.g. pjpg
       urlObj.searchParams.delete('auto');   // e.g. webp
    }
    return urlObj.toString();
  } catch (e) {
    // If URL parsing fails, return original URL
    return url;
  }
}

/**
 * Create Custom Search result image HTML
 */
function createCustomSearchImage(result, index) {
  const imageUrl = cleanImageUrl(result.imageUrl || result.thumbnailUrl || '');
  return `
    <div class="searchImgCard" data-id="${result.id}" data-index="${index}" data-source="custom" data-search-query="${currentSearchQuery || ''}">
      <img src="${imageUrl}" alt="${result.title || '이미지'}" class="searchImg" loading="lazy" title="${result.title || ''}" referrerpolicy="no-referrer">
      <div class="imgOverlay">
        <button class="img-btn shareBtn" data-action="share" aria-label="공유">
          <img src="./img/share.svg" alt="" class="shareIcon">
        </button>
        <button class="img-btn downBtn" data-action="download" aria-label="다운로드">
          <img src="./img/download.svg" alt="" class="downIcon">
        </button>
      </div>
    </div>
  `;
}

/**
 * Render search results grid (for Firestore results)
 */
function renderSearchResults(results = null) {
  if (!resultsGrid) {
    console.warn("[Search] Results grid not found");
    return;
  }

  // If we're on the my-reference tab, render bookmarks instead
  if (currentCategory === "my-reference") {
    renderBookmarks(bookmarkResults);
    return;
  }

  // Use provided results or default to searchResults
  const resultsToRender = results !== null ? results : searchResults;

  // Keep the page-dim element
  const pageDim = resultsGrid.querySelector(".page-dim");

  if (resultsToRender.length === 0) {
    resultsGrid.innerHTML = `
      <div class="no-results">
        <p>검색 결과가 없습니다</p>
        <p class="no-results-hint">이미지를 업로드하거나 필터를 조정해 보세요</p>
      </div>
    `;
    if (pageDim) resultsGrid.appendChild(pageDim);
    return;
  }

  // Clear existing images but keep structure
  resultsGrid.innerHTML = resultsToRender
    .map((result, index) => createResultImage(result, index))
    .join("");

  if (pageDim) resultsGrid.appendChild(pageDim);

  // Note: Click handlers are now handled via event delegation in setupEventListeners
}

/**
 * Create result image HTML (for searchImgBox grid)
 */
function createResultImage(result, index) {
  const similarityText = result.similarityLabel || `${result.score || 0}점`;
  return `
    <div class="searchImgCard" data-id="${result.id}" data-index="${index}">
      <img src="${result.imageUrl}" alt="${result.fileName}" class="searchImg" loading="lazy" title="${similarityText}">
      <div class="imgOverlay">
        <button class="img-btn shareBtn" data-action="share" aria-label="공유">
          <img src="./img/share.svg" alt="" class="shareIcon">
        </button>
        <button class="img-btn downBtn" data-action="download" aria-label="다운로드">
          <img src="./img/download.svg" alt="" class="downIcon">
        </button>
      </div>
    </div>
  `;
}

/**
 * Create result card HTML (for detailed view)
 */
function createResultCard(result) {
  return `
    <div class="result-card" data-id="${result.id}">
      <div class="result-image">
        <img src="${result.imageUrl}" alt="${result.fileName}" loading="lazy">
        <div class="result-similarity">${result.similarityLabel}</div>
      </div>
      <div class="result-info">
        <p class="result-filename">${truncateFileName(result.fileName)}</p>
        <div class="result-meta">
          <span class="result-format">${result.format.label}</span>
          <span class="result-score">${result.score}점</span>
        </div>
        <div class="result-fixscope ${result.fixScope.value.toLowerCase()}">
          ${result.fixScope.label}
        </div>
      </div>
    </div>
  `;
}

/**
 * Truncate long file names
 */
function truncateFileName(name, maxLength = 20) {
  if (name.length <= maxLength) return name;
  const ext = name.split(".").pop();
  const baseName = name.slice(0, -(ext.length + 1));
  return baseName.slice(0, maxLength - ext.length - 4) + "..." + ext;
}

// ============================================================================
// Filter Functions
// ============================================================================

/**
 * Open filter page/modal
 */
function openFilterPage() {
  // Store current search state using stateManager
  setSessionState("searchFilters", currentFilters);
  window.location.href = "filter.html";
}

/**
 * Apply filters from filter page
 */
function applyFiltersFromStorage() {
  const storedFilters = getSessionState("appliedFilters");
  if (storedFilters) {
    try {
      const filters = storedFilters;
      removeSessionState("appliedFilters");

      // Convert filter format to match currentFilters structure
      // Note: currentFilters uses format/fixScope/minScore, but filter page uses colors/keywords
      // For now, we'll store the raw filter data and use it when available
      currentFilters = {
        ...currentFilters,
        rawFilters: filters, // Store raw filter data
      };

      // If there's a search query, re-run search
      const searchInput = document.querySelector(".search");
      const query = searchInput?.value?.trim();
      
      if (query && query.length >= 2) {
        performTextSearch(query);
      } else {
        // Otherwise, try image-based search
        const lastAnalysisId = getLastAnalysisId();
        if (lastAnalysisId) {
          searchFromAnalysis(lastAnalysisId);
        } else {
          toast.info("필터가 적용되었습니다. 검색을 실행해주세요");
        }
      }
    } catch (e) {
      console.error("[Search] Failed to parse stored filters:", e);
    }
  }
}

// ============================================================================
// Category Tabs
// ============================================================================

/**
 * Setup category filter tabs
 */
function setupCategoryTabs() {
  if (!categoryTabs || categoryTabs.length === 0) return;

  // Categories mapped to filenameBox buttons (나의 스타일, 나의 레퍼런스, 추가 인사이트)
  const categories = ["my-style", "my-reference", "insights"];

  // Initialize first tab as active
  const firstNothing = categoryTabs[0]?.querySelector(".nothing");
  if (firstNothing) firstNothing.style.opacity = "1";
  if (categoryTabs[0]) categoryTabs[0].classList.add("active");

  categoryTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      // Remove active from all tabs and hide nothing elements
      categoryTabs.forEach((t) => {
        const n = t.querySelector(".nothing");
        if (n) n.style.opacity = "0";
        t.classList.remove("active");
      });

      // Add active to clicked tab
      const targetNothing = tab.querySelector(".nothing");
      if (targetNothing) targetNothing.style.opacity = "1";
      tab.classList.add("active");

      // Update filter based on tab position
      const category = categories[index] || "all";
      handleCategoryChange(category).catch(err => {
        console.error("[Search] Category change error:", err);
      });
    });
  });
}

/**
 * Handle category tab change
 */
async function handleCategoryChange(category) {
  currentCategory = category;
  
  switch (category) {
    case "my-style":
      // Filter to show similar to user's preferred style
      toast.info("나의 스타일 필터 적용");
      // Clear bookmark results
      bookmarkResults = [];
      renderSearchResults(searchResults);
      break;
    case "my-reference":
      // Show user's saved references
      await loadBookmarks();
      break;
    case "insights":
      // Show custom search results (web recommendations)
      bookmarkResults = [];
      // Use custom search based on last analysis
      const analysisData = await getLastAnalysisData();
      if (analysisData) {
        lastAnalysisData = analysisData;
        const query = generateSearchQuery(analysisData);
        if (query) {
          await performCustomSearch(query, 1);
        } else {
          toast.info("먼저 이미지를 분석해주세요");
          renderSearchResults([]);
        }
      } else {
        toast.info("먼저 이미지를 분석해주세요");
        renderSearchResults([]);
      }
      break;
    default:
      currentFilters = { format: null, fixScope: null, minScore: null };
      bookmarkResults = [];
      renderSearchResults(searchResults);
  }
}

/**
 * Load user's bookmarks
 */
async function loadBookmarks() {
  try {
    showLoading("북마크 로딩 중...");
    const result = await getBookmarks({ limit: 50 });
    hideLoading();
    
    if (result.success && result.bookmarks) {
      bookmarkResults = result.bookmarks;
      renderBookmarks(bookmarkResults);
      toast.success(`${bookmarkResults.length}개의 북마크를 불러왔습니다`);
    } else {
      bookmarkResults = [];
      renderBookmarks([]);
      toast.info("저장된 북마크가 없습니다");
    }
  } catch (error) {
    hideLoading();
    console.error("[Search] Failed to load bookmarks:", error);
    toast.error("북마크를 불러오는 중 오류가 발생했습니다");
    bookmarkResults = [];
    renderBookmarks([]);
  }
}

/**
 * Render bookmarks in the search results grid
 */
function renderBookmarks(bookmarks) {
  if (!resultsGrid) return;
  
  if (bookmarks.length === 0) {
    resultsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⭐</div>
        <p class="empty-state-title">저장된 레퍼런스가 없습니다</p>
        <p class="empty-state-desc">검색 결과에서 저장 버튼을 눌러 레퍼런스를 저장하세요</p>
      </div>
    `;
    return;
  }
  
  resultsGrid.innerHTML = bookmarks.map((bookmark) => {
    const analysis = bookmark.analysis || {};
    const imageUrl = analysis.imageUrl || "";
    const formatLabel = analysis.formatPrediction || "Unknown";
    const score = analysis.overallScore || 0;
    
    return `
      <div class="searchImgCard" data-bookmark-id="${bookmark.bookmarkId}" data-analysis-id="${bookmark.analysisId}">
        <img src="${imageUrl}" alt="북마크" class="searchImg" loading="lazy">
        <div class="imgOverlay">
          <button class="img-btn shareBtn" data-action="bookmarkShare" data-analysis-id="${bookmark.analysisId}">
            <img src="./img/share.svg" alt="공유">
          </button>
          <button class="img-btn downBtn" data-action="bookmarkDelete" data-bookmark-id="${bookmark.bookmarkId}">
            <img src="./img/delete_white.svg" alt="삭제">
          </button>
        </div>
        <div class="bookmark-info" style="position: absolute; bottom: 0.5vw; left: 0.5vw; right: 0.5vw; background: rgba(0,0,0,0.6); color: white; padding: 0.5vw; border-radius: 0.5vw; font-size: 0.8vw;">
          <div>${formatLabel}</div>
          <div>점수: ${score}%</div>
        </div>
      </div>
    `;
  }).join("");
  
  // Setup click handlers for bookmark cards
  setupBookmarkCardListeners();
}

/**
 * Setup click handlers for bookmark cards
 */
function setupBookmarkCardListeners() {
  const bookmarkCards = resultsGrid?.querySelectorAll(".searchImgCard[data-bookmark-id]");
  if (!bookmarkCards) return;
  
  bookmarkCards.forEach((card) => {
    // Click card to view analysis
    card.addEventListener("click", (e) => {
      // Don't trigger if clicking buttons
      if (e.target.closest(".img-btn")) return;
      
      const analysisId = card.dataset.analysisId;
      if (analysisId) {
        navigateToAnalysis(analysisId);
      }
    });
    
    // Share button
    const shareBtn = card.querySelector('[data-action="bookmarkShare"]');
    if (shareBtn) {
      shareBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const analysisId = card.dataset.analysisId;
        if (analysisId) {
          await handleShare(analysisId);
        }
      });
    }
    
    // Delete button
    const deleteBtn = card.querySelector('[data-action="bookmarkDelete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const bookmarkId = card.dataset.bookmarkId;
        if (bookmarkId) {
          await handleDeleteBookmark(bookmarkId);
        }
      });
    }
  });
}

/**
 * Handle bookmark deletion
 */
async function handleDeleteBookmark(bookmarkId) {
  if (!confirm("이 북마크를 삭제하시겠습니까?")) {
    return;
  }
  
  try {
    showLoading("삭제 중...");
    const result = await deleteBookmark({ bookmarkId });
    hideLoading();
    
    if (result.success) {
      toast.success(result.message || "북마크가 삭제되었습니다");
      // Reload bookmarks if we're on the my-reference tab
      if (currentCategory === "my-reference") {
        await loadBookmarks();
      }
    } else {
      toast.error("북마크 삭제에 실패했습니다");
    }
  } catch (error) {
    hideLoading();
    console.error("[Search] Delete bookmark failed:", error);
    toast.error("북마크 삭제 중 오류가 발생했습니다");
  }
}

// ============================================================================
// Event Listeners
// ============================================================================

const searchUnsubscribeFunctions = [];

function setupEventListeners() {
  // Search button (searchIcon)
  if (searchBtn) {
    const unsub = onClick(searchBtn, (e) => {
      e.preventDefault();
      const query = searchInput?.value.trim();
      if (query && query.length >= 2) {
        performTextSearch(query);
      } else {
        // Fallback to image-based search if no text
        quickSearchFromLastAnalysis();
      }
    });
    searchUnsubscribeFunctions.push(unsub);
  }

  // Image upload button (uploadIcon)
  if (uploadBtn) {
    const unsub = onClick(uploadBtn, (e) => {
      e.preventDefault();
      uploadInput?.click();
    });
    searchUnsubscribeFunctions.push(unsub);
  }

  // File input change
  if (uploadInput) {
    const unsub = onChange(uploadInput, (e) => {
      const file = e.target.files?.[0];
      if (file) {
        searchByImage(file);
        // Reset input to allow same file selection
        uploadInput.value = "";
      }
    });
    searchUnsubscribeFunctions.push(unsub);
  }

  // Filter button
  if (filterBtn) {
    const unsub = onClick(filterBtn, (e) => {
      e.preventDefault();
      openFilterPage();
    });
    searchUnsubscribeFunctions.push(unsub);
  }

  // Text search input (Enter key or Ctrl+Enter) with debounce for typing
  if (searchInput) {
    // Debounced search for typing (optional - can be enabled for auto-search)
    const debouncedSearch = debounce((query) => {
      if (query && query.length >= 2) {
        performTextSearch(query);
      }
    }, 500);

    // Enter key handler
    const unsub = onKeyDown(searchInput, (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query.length >= 2) {
          performTextSearch(query);
        } else {
          toast.info("검색어를 2자 이상 입력해주세요");
        }
      }
    });
    searchUnsubscribeFunctions.push(unsub);

    // Optional: Auto-search on typing (debounced)
    // Uncomment to enable:
    // const unsubInput = onInput(searchInput, (e) => {
    //   const query = e.target.value.trim();
    //   if (query.length >= 2) {
    //     debouncedSearch(query);
    //   }
    // });
    // searchUnsubscribeFunctions.push(unsubInput);
  }

  // Event delegation for dynamically created search result cards
  if (resultsGrid) {
    const unsub1 = addEventListener(resultsGrid, "click", (e) => {
      const card = e.target.closest(".searchImgCard");
      if (!card) return;

      const action = e.target.closest("[data-action]")?.dataset.action;
      const cardId = card.dataset.id;
      const cardIndex = parseInt(card.dataset.index, 10);
      const source = card.dataset.source;

      if (action === "share") {
        e.stopPropagation();
        handleShare(cardId);
      } else if (action === "download") {
        e.stopPropagation();
        handleDownload(cardId);
      } else {
        // Card click - open modal
        if (source === "custom") {
          // Custom Search result
          if (cardIndex >= 0 && cardIndex < customSearchResults.length) {
            const result = customSearchResults[cardIndex];
            if (result) {
              openResultModal(result);
            }
          }
        } else {
          // Firestore result
          if (cardIndex >= 0 && cardIndex < searchResults.length) {
            const result = searchResults[cardIndex];
            if (result) {
              openResultModal(result);
            }
          }
        }
      }
    });
    searchUnsubscribeFunctions.push(unsub1);

    // Hover effects via CSS (handled by .searchImgCard:hover)
    // Icon hover effects
    const unsub2 = addEventListener(resultsGrid, "mouseenter", (e) => {
      const btn = e.target.closest(".img-btn");
      if (btn) {
        const icon = btn.querySelector("img");
        if (icon && btn.classList.contains("shareBtn")) {
          icon.src = "./img/shareHover.svg";
        } else if (icon && btn.classList.contains("downBtn")) {
          icon.src = "./img/downHover.svg";
        }
      }
    }, true);
    searchUnsubscribeFunctions.push(unsub2);

    const unsub3 = addEventListener(resultsGrid, "mouseleave", (e) => {
      const btn = e.target.closest(".img-btn");
      if (btn) {
        const icon = btn.querySelector("img");
        if (icon && btn.classList.contains("shareBtn")) {
          icon.src = "./img/share.svg";
        } else if (icon && btn.classList.contains("downBtn")) {
          icon.src = "./img/download.svg";
        }
      }
    }, true);
    searchUnsubscribeFunctions.push(unsub3);
  }

  // Setup category tabs
  setupCategoryTabs();

  // Modal action buttons (event delegation)
  const modalBox = document.getElementById("searchResultModalBox");
  if (modalBox) {
    const unsub = addEventListener(modalBox, "click", (e) => {
      const action = e.target.closest("[id^='searchModal']")?.id;
      const resultId = modalBox.dataset.resultId;
      const resultSource = modalBox.dataset.resultSource;
      const resultIndex = parseInt(modalBox.dataset.resultIndex, 10);
      
      // Get result based on source
      let result = null;
      if (resultSource === "custom") {
        result = customSearchResults[resultIndex];
      } else if (resultSource === "bookmark") {
        result = bookmarkResults[resultIndex];
      } else {
        // Default to firestore searchResults
        result = searchResults[resultIndex];
      }

      if (!result) return;

      if (action === "searchModalSaveBtn") {
        e.stopPropagation();
        // Custom search results cannot be saved (external links)
        if (resultSource === "custom") {
          toast.info("외부 이미지는 저장할 수 없습니다. 원본 링크를 확인해주세요.");
          return;
        }
        handleSave(resultId);
      } else if (action === "searchModalShareBtn") {
        e.stopPropagation();
        handleShare(resultId, resultSource);
      } else if (action === "searchModalDownloadBtn") {
        e.stopPropagation();
        handleDownload(resultId);
      }
    });
    searchUnsubscribeFunctions.push(unsub);
  }

  // Register cleanup callback
  registerCleanup(() => {
    searchUnsubscribeFunctions.forEach((unsub) => unsub());
    searchUnsubscribeFunctions.length = 0;
  });
}

/**
 * Handle save action
 */
async function handleSave(resultId) {
  try {
    showLoading("저장 중...");
    const result = await saveItem({ analysisId: resultId });
    hideLoading();
    
    if (result.success) {
      toast.success(result.message || "저장되었습니다");
    } else {
      toast.error("저장에 실패했습니다");
    }
  } catch (error) {
    hideLoading();
    console.error("[Search] Save failed:", error);
    toast.error("저장 중 오류가 발생했습니다");
  }
}

/**
 * Handle share action - copy link to clipboard
 * @param {string} resultId - Result ID
 * @param {string} [resultSource] - Result source: "custom", "bookmark", or "firestore"
 */
async function handleShare(resultId, resultSource = "firestore") {
  try {
    let shareUrl = null;
    
    if (resultSource === "custom") {
      // For custom search results, share the original link
      const modalBox = document.getElementById("searchResultModalBox");
      const resultIndex = parseInt(modalBox?.dataset.resultIndex, 10);
      const result = customSearchResults[resultIndex];
      if (result && result.link) {
        shareUrl = result.link;
      } else {
        toast.info("공유할 링크가 없습니다");
        return;
      }
    } else {
      // For Firestore/bookmark results, share analysis page
      shareUrl = `${window.location.origin}/analyze.html?id=${resultId}`;
    }
    
    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("링크가 클립보드에 복사되었습니다");
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("링크가 클립보드에 복사되었습니다");
      } catch (err) {
        toast.error("링크 복사에 실패했습니다");
      }
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error("[Search] Share failed:", error);
    toast.error("공유 중 오류가 발생했습니다");
  }
}

/**
 * Handle download action
 */
async function handleDownload(resultId) {
  try {
    // Check if it's a custom search result
    const modalBox = document.getElementById("searchResultModalBox");
    const source = modalBox?.dataset.resultSource;
    
    let result;
    let imageUrl;
    let fileName;
    
    if (source === "custom") {
      result = customSearchResults.find((r) => r.id === resultId);
      const rawImageUrl = result?.imageUrl || result?.thumbnailUrl;
      imageUrl = cleanImageUrl(rawImageUrl);
      fileName = result?.title || `image_${resultId}.jpg`;
    } else {
      result = searchResults.find((r) => r.id === resultId);
      const rawImageUrl = result?.imageUrl;
      imageUrl = cleanImageUrl(rawImageUrl);
      fileName = result?.fileName || `design_${resultId}.png`;
    }
    
    if (!result || !imageUrl) {
      toast.error("이미지 URL을 찾을 수 없습니다");
      return;
    }

    showLoading("다운로드 준비 중...");

    // Fetch image with no-referrer policy
    const response = await fetch(imageUrl, {
      referrerPolicy: 'no-referrer'
    });
    if (!response.ok) {
      throw new Error("Failed to fetch image");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    hideLoading();
    toast.success("다운로드가 시작되었습니다");
  } catch (error) {
    hideLoading();
    console.error("[Search] Download failed:", error);
    toast.error("다운로드 중 오류가 발생했습니다");
  }
}

/**
 * Generate recommendation reason for Custom Search result
 */
function generateRecommendationReason(searchResult, query, analysis) {
  if (!query || !analysis) {
    return "이미지는 검색 결과입니다.";
  }

  const reasons = [];
  
  // Search query reason
  reasons.push(`이 이미지는 '${query}' 검색어로 찾았습니다.`);

  // Keyword matching
  if (analysis.detectedKeywords && Array.isArray(analysis.detectedKeywords)) {
    const matchedKeywords = analysis.detectedKeywords.filter(keyword => 
      query.toLowerCase().includes(keyword.toLowerCase()) || 
      keyword.toLowerCase().includes(query.toLowerCase())
    );
    
    if (matchedKeywords.length > 0) {
      reasons.push(`분석 결과의 키워드 '${matchedKeywords.join(", ")}'와 관련이 있습니다.`);
    }
  }

  // Format prediction
  if (analysis.formatPrediction && analysis.formatPrediction !== "Unknown") {
    reasons.push(`분석된 디자인의 ${analysis.formatPrediction} 형식과 유사한 스타일입니다.`);
  }

  return reasons.join(" ");
}

// Store observer instance to avoid duplicates
let infiniteScrollObserver = null;

/**
 * Setup infinite scroll observer
 */
function setupInfiniteScrollObserver() {
  // Disconnect existing observer if any
  if (infiniteScrollObserver) {
    infiniteScrollObserver.disconnect();
    infiniteScrollObserver = null;
  }

  // Find loading indicator or use last card as trigger
  const loadingIndicator = document.getElementById("customSearchLoadingIndicator");
  const lastCard = resultsGrid?.querySelector(".searchImgCard:last-child");
  
  // Use loading indicator if available, otherwise use last card
  const targetElement = loadingIndicator || lastCard;
  
  if (!targetElement || !resultsGrid) {
    // If no target element, try again after a short delay (for initial render)
    setTimeout(() => {
      setupInfiniteScrollObserver();
    }, 100);
    return;
  }

  // Create new observer
  infiniteScrollObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && hasMoreResults && !isLoadingMore && currentSearchQuery) {
        loadMoreSearchResults();
      }
    });
  }, {
    rootMargin: "200px", // Start loading 200px before reaching the element
    threshold: 0.1,
  });

  infiniteScrollObserver.observe(targetElement);
}

/**
 * Open result modal
 */
function openResultModal(result) {
  const modalBg = document.getElementById("searchResultModalBg");
  const modalBox = document.getElementById("searchResultModalBox");
  const closeBtn = document.getElementById("searchModalCloseBtn");
  
  if (!modalBg || !modalBox) {
    console.warn("[Search] Modal elements not found");
    return;
  }

  // Check if this is a Custom Search result
  const isCustomSearch = result.link || result.contextLink || result.displayLink;
  
  if (isCustomSearch) {
    // Custom Search result
    const imageEl = document.getElementById("searchModalImage");
    const titleEl = document.getElementById("searchModalTitle");
    const similarityEl = document.getElementById("searchModalSimilarity");
    const scoreEl = document.getElementById("searchModalScore");
    const ocrTextEl = document.getElementById("searchModalOcrText");
    const ocrSection = document.getElementById("searchModalOcr");

    if (imageEl) {
      const imageUrl = cleanImageUrl(result.imageUrl || result.thumbnailUrl || "");
      imageEl.src = imageUrl;
      imageEl.alt = result.title || "이미지";
      imageEl.setAttribute('referrerpolicy', 'no-referrer');
    }
    if (titleEl) titleEl.textContent = result.title || "이미지";
    
    // Generate recommendation reason
    const reasonText = generateRecommendationReason(result, currentSearchQuery, lastAnalysisData);
    
    if (similarityEl) {
      similarityEl.textContent = "추천 이미지";
      similarityEl.title = reasonText;
    }
    
    if (scoreEl) {
      scoreEl.textContent = result.displayLink || "";
    }
    
    // Show snippet as OCR text
    if (ocrTextEl && result.snippet) {
      ocrTextEl.textContent = result.snippet;
      if (ocrSection) ocrSection.style.display = "block";
    } else if (ocrSection) {
      ocrSection.style.display = "none";
    }

    // Show recommendation reason
    const recommendationSection = document.getElementById("searchModalRecommendation");
    const recommendationTextEl = document.getElementById("searchModalRecommendationText");
    if (recommendationTextEl) {
      recommendationTextEl.textContent = reasonText;
    }
    if (recommendationSection) {
      recommendationSection.style.display = "block";
    }

    // Store recommendation reason
    modalBox.dataset.recommendationReason = reasonText;
    modalBox.dataset.resultId = result.id;
    modalBox.dataset.resultIndex = customSearchResults.indexOf(result).toString();
    modalBox.dataset.resultSource = "custom";
    
    // Disable save button for custom search results (external links cannot be saved)
    const saveBtn = document.getElementById("searchModalSaveBtn");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.style.opacity = "0.5";
      saveBtn.style.cursor = "not-allowed";
      saveBtn.title = "외부 이미지는 저장할 수 없습니다";
    }
  } else {
    // Firestore result (existing logic)
    // Ensure save button is enabled for Firestore results
    const saveBtn = document.getElementById("searchModalSaveBtn");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.style.opacity = "1";
      saveBtn.style.cursor = "pointer";
      saveBtn.title = "";
    }
    const imageEl = document.getElementById("searchModalImage");
    const titleEl = document.getElementById("searchModalTitle");
    const similarityEl = document.getElementById("searchModalSimilarity");
    const scoreEl = document.getElementById("searchModalScore");
    const ocrTextEl = document.getElementById("searchModalOcrText");
    const ocrSection = document.getElementById("searchModalOcr");

    if (imageEl) {
      const imageUrl = cleanImageUrl(result.imageUrl || "");
      imageEl.src = imageUrl;
      imageEl.alt = result.fileName || "";
      imageEl.setAttribute('referrerpolicy', 'no-referrer');
    }
    if (titleEl) titleEl.textContent = result.fileName || "이미지";
    if (similarityEl) similarityEl.textContent = result.similarityLabel || "유사도";
    if (scoreEl) scoreEl.textContent = `${result.score || 0}점`;
    
    // OCR text (if available)
    if (ocrTextEl && result.ocrText) {
      ocrTextEl.textContent = result.ocrText;
      if (ocrSection) ocrSection.style.display = "block";
    } else if (ocrSection) {
      ocrSection.style.display = "none";
    }

    // Hide recommendation section for Firestore results
    const recommendationSection = document.getElementById("searchModalRecommendation");
    if (recommendationSection) {
      recommendationSection.style.display = "none";
    }

    // Store current result for action buttons
    modalBox.dataset.resultId = result.id;
    modalBox.dataset.resultIndex = searchResults.indexOf(result).toString();
    modalBox.dataset.resultSource = "firestore";
  }

  // Show modal
  modalBg.classList.add("show");
  document.body.style.overflow = "hidden";

  // Close handlers
  const closeModal = () => {
    modalBg.classList.remove("show");
    document.body.style.overflow = "";
  };

  if (closeBtn) {
    closeBtn.onclick = closeModal;
  }

  modalBg.onclick = (e) => {
    if (e.target === modalBg) {
      closeModal();
    }
  };

  // ESC key
  const escHandler = (e) => {
    if (e.key === "Escape" && modalBg.classList.contains("show")) {
      closeModal();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);
}

/**
 * Close search result modal
 */
function closeSearchResultModal() {
  const modalBg = document.getElementById("searchResultModalBg");
  if (modalBg) {
    modalBg.classList.remove("show");
    document.body.style.overflow = "";
  }
}

// ============================================================================
// Styles
// ============================================================================

const searchStyles = `
.search_results_grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 16px;
}

.result-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.result-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.result-image {
  position: relative;
  aspect-ratio: 16/9;
  overflow: hidden;
}

.result-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-similarity {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(135, 92, 255, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.result-info {
  padding: 12px;
}

.result-filename {
  font-size: 14px;
  font-weight: 500;
  color: #1B1233;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.result-format {
  font-size: 12px;
  color: #7C7895;
}

.result-score {
  font-size: 12px;
  color: #875CFF;
  font-weight: 500;
}

.result-fixscope {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.result-fixscope.structurerebuild {
  background: #FEE2E2;
  color: #DC2626;
}

.result-fixscope.detailtuning {
  background: #E0D5FF;
  color: #875CFF;
}

.no-results {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #7C7895;
}

.no-results-hint {
  font-size: 14px;
  margin-top: 8px;
  color: #A8A8BF;
}

.category_tab {
  cursor: pointer;
  transition: all 0.2s;
}

.category_tab.active {
  background: #875CFF;
  color: white;
}
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = searchStyles;
document.head.appendChild(styleSheet);

// ============================================================================
// Initialize
// ============================================================================

function init() {
  console.log("[Search] Initializing search page...");
  setupEventListeners();
  applyFiltersFromStorage();
  // Auto search on page load
  autoSearchOnPageLoad();
}

// Wait for app initialization
window.addEventListener("dysapp:ready", init);

// Also try immediate init if already ready
if (window.dysapp?.initialized) {
  init();
}
