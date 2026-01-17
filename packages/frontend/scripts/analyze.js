/**
 * Analyze Page Script (analyze.html)
 * Displays analysis results and handles AI mentor chat
 */

import {
  getAnalysis,
  chatWithMentor,
  getStoredSessionId,
} from "../services/apiService.js";
import { adaptAnalysisResponse } from "../utils/dataAdapter.js";
import {
  showLoading,
  hideLoading,
  toast,
  getUrlParam,
  navigateToUpload,
} from "./app.js";
import { getLocalState } from "../utils/stateManager.js";
import { setHTML, escapeHTML, sanitizeHTML } from "../utils/domHelper.js";

// ============================================================================
// State
// ============================================================================

let currentAnalysis = null;
let chatSessionId = null;

// ============================================================================
// DOM Elements (Cached)
// ============================================================================
// DOM 요소를 한 번만 쿼리하여 성능 최적화

const mainDescription = document.getElementById("mainDescription");
const mainTags = document.getElementById("mainTags");
const dataBoxContainer = document.getElementById("dataBoxContainer");
const aiSuggestionBox = document.getElementById("aiSuggestionBox");
const aiRecommendation = document.getElementById("aiRecommendation");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatContainer = document.getElementById("chatContainer");
const suggestionBox = document.getElementById("suggestionBox");

// Additional cached elements (lazy loaded when needed)
let cachedModalElements = null;
function getModalElements() {
  if (!cachedModalElements) {
    cachedModalElements = {
      modalBg: document.getElementById("detail_modalBg"),
      modalTitle: document.getElementById("modalTitle"),
      modalDescription: document.getElementById("modalDescription"),
      modalCriteria: document.getElementById("modalCriteria"),
      modalElements: document.getElementById("modalElements"),
      modalDetailAnalysis: document.getElementById("modalDetailAnalysis"),
      modalCloseBtn: document.getElementById("modalCloseBtn"),
      modalBox: document.getElementById("modalBox")
    };
  }
  return cachedModalElements;
}

// ============================================================================
// Load Analysis
// ============================================================================

/**
 * Load analysis data and render
 */
async function loadAnalysis() {
  // Get analysis ID from URL or localStorage using stateManager
  const analysisId = getUrlParam("id") || getLocalState("lastAnalysisId");

  if (!analysisId) {
    toast.error("분석 ID가 없습니다");
    setTimeout(() => navigateToUpload(), 1500);
    return;
  }

  try {
    // showLoading("분석 결과 불러오는 중..."); // Skeleton replaces loading spinner

    const response = await getAnalysis(analysisId);
    if (!response.success || !response.analysis) {
      throw new Error("Analysis not found");
    }

    // Adapt response for UI
    currentAnalysis = adaptAnalysisResponse({
      success: true,
      analysisId: analysisId,
      ...response.analysis,
    });

    // Get stored session ID for continuing chat
    chatSessionId = getStoredSessionId(analysisId);

    // Hide Skeleton & Render results
    hideSkeleton();
    renderAnalysisResults();
  } catch (error) {
    console.error("[Analyze] Failed to load:", error);
    const errorType = getErrorType(error);
    showErrorState(error.message, errorType);
  }
}

// ============================================================================
// UI State Management (Skeleton & Error)
// ============================================================================

/**
 * 스켈레톤 로딩 상태 표시 함수
 * 
 * 분석 결과를 로드하는 동안 스켈레톤 UI를 표시합니다.
 * 실제 콘텐츠가 로드되기 전까지 사용자에게 로딩 상태를 시각적으로 보여줍니다.
 * 
 * 스켈레톤이 표시되는 영역:
 * - 메인 제목 (mainDescription)
 * - 키워드 태그 (mainTags)
 * - 분석 데이터 박스들 (dataBoxContainer 내부)
 * 
 * 접근성:
 * - aria-busy 속성으로 스크린 리더에 로딩 상태 알림
 * - aria-label로 로딩 중인 콘텐츠 설명
 * 
 * @example
 * // 분석 결과 로드 시작 시
 * showSkeleton();
 * const result = await getAnalysis(analysisId);
 * hideSkeleton();
 * renderAnalysisResults(result);
 */
function showSkeleton() {
  if (!dataBoxContainer) return;
  
  // Header skeleton
  if (mainDescription) {
    mainDescription.innerHTML = '<span class="skeleton skeleton-text skeleton-text-header" aria-busy="true" aria-label="로딩 중"></span>';
  }
  if (mainTags) {
    mainTags.setAttribute("aria-busy", "true");
    mainTags.setAttribute("aria-label", "키워드 로딩 중");
    mainTags.innerHTML = `
      <span class="per skeleton skeleton-tag skeleton-tag-per1" aria-hidden="true"></span>
      <span class="per2 skeleton skeleton-tag skeleton-tag-per2" aria-hidden="true"></span>
      <span class="per3 skeleton skeleton-tag skeleton-tag-per3" aria-hidden="true"></span>
      <span class="per4 skeleton skeleton-tag skeleton-tag-per4" aria-hidden="true"></span>
    `;
  }

  // Data boxes skeleton
  // Preserve grid structure but replace content with skeletons
  const boxes = dataBoxContainer.querySelectorAll('.dataBox, .aiSuggestion');
  boxes.forEach(box => {
    const content = box.querySelector('.dataElement, .aiDescribtion');
    const desc = box.querySelector('.describtion');
    
    if (content) {
      content.innerHTML = '<div class="skeleton skeleton-box skeleton-box-md"></div>';
    }
    if (desc) {
      desc.innerHTML = '<span class="skeleton skeleton-text skeleton-text-desc"></span>';
    }
  });
}

/**
 * Hide skeleton (restore structure if needed, but renderAnalysisResults overwrites mostly)
 */
function hideSkeleton() {
  // renderAnalysisResults will replace innerHTML, so explicit hiding isn't strictly necessary
  // but good for cleanup if we added specific classes
}

/**
 * 에러 타입 판별 함수
 * 
 * 에러 객체나 메시지를 분석하여 에러 타입을 판별합니다.
 * 판별된 타입에 따라 적절한 에러 메시지와 UI를 표시할 수 있습니다.
 * 
 * 판별 가능한 에러 타입:
 * - "network": 네트워크 연결 오류
 * - "notfound": 리소스를 찾을 수 없음 (404)
 * - "timeout": 요청 시간 초과
 * - "server": 서버 오류 (500, 503)
 * - "unknown": 알 수 없는 오류
 * 
 * @param {Error|string} error - 에러 객체 또는 에러 메시지 문자열
 * 
 * @returns {string} 에러 타입 문자열
 * 
 * @example
 * try {
 *   await someOperation();
 * } catch (error) {
 *   const errorType = getErrorType(error);
 *   const errorMessage = getErrorMessage(errorType, error.message);
 *   showErrorState(errorMessage.title, errorType);
 * }
 */
function getErrorType(error) {
  const errorMessage = error?.message || String(error || "").toLowerCase();
  
  if (errorMessage.includes("network") || errorMessage.includes("fetch") || 
      errorMessage.includes("failed to fetch") || errorMessage.includes("econnrefused")) {
    return "network";
  }
  if (errorMessage.includes("not found") || errorMessage.includes("404") || 
      errorMessage.includes("analysis not found")) {
    return "notfound";
  }
  if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
    return "timeout";
  }
  if (errorMessage.includes("server") || errorMessage.includes("500") || 
      errorMessage.includes("503")) {
    return "server";
  }
  return "unknown";
}

/**
 * Get user-friendly error message based on error type
 */
function getErrorMessage(errorType, originalMessage) {
  const messages = {
    network: {
      title: "네트워크 연결 오류",
      desc: "인터넷 연결을 확인하고 다시 시도해 주세요.",
      icon: "network"
    },
    notfound: {
      title: "분석 결과를 찾을 수 없습니다",
      desc: "요청하신 분석 결과가 존재하지 않거나 삭제되었습니다.",
      icon: "notfound"
    },
    timeout: {
      title: "요청 시간 초과",
      desc: "서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
      icon: "timeout"
    },
    server: {
      title: "서버 오류",
      desc: "일시적인 서버 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      icon: "server"
    },
    unknown: {
      title: "오류가 발생했습니다",
      desc: "예기치 않은 문제가 발생했습니다. 다시 시도해 주세요.",
      icon: "error"
    }
  };
  
  return messages[errorType] || messages.unknown;
}

/**
 * Retry analysis with stored analysis ID
 */
async function retryAnalysis() {
  const analysisId = getUrlParam("id") || getLocalState("lastAnalysisId");
  
  if (!analysisId) {
    toast.error("분석 ID가 없습니다. 업로드 페이지로 이동합니다.");
    setTimeout(() => navigateToUpload(), 1500);
    return;
  }
  
  // Show skeleton while retrying
  showSkeleton();
  
  // Hide error state
  if (dataBoxContainer) {
    dataBoxContainer.innerHTML = ""; // Clear error state
  }
  
  // Show chat input again
  const chatInputBox = document.getElementById("chatInputBox");
  if (chatInputBox) chatInputBox.style.display = "";
  
  try {
    const response = await getAnalysis(analysisId);
    if (!response.success || !response.analysis) {
      throw new Error("Analysis not found");
    }

    currentAnalysis = adaptAnalysisResponse({
      success: true,
      analysisId: analysisId,
      ...response.analysis,
    });

    chatSessionId = getStoredSessionId(analysisId);
    hideSkeleton();
    renderAnalysisResults();
    toast.success("분석 결과를 다시 불러왔습니다.");
  } catch (error) {
    console.error("[Analyze] Retry failed:", error);
    const errorType = getErrorType(error);
    showErrorState(error.message, errorType);
    toast.error("다시 시도 중 오류가 발생했습니다.");
  }
}

/**
 * Show error state with improved UI
 */
function showErrorState(message, errorType = null) {
  // Determine error type if not provided
  if (!errorType) {
    errorType = getErrorType(message);
  }
  
  const errorInfo = getErrorMessage(errorType, message);
  
  if (mainDescription) mainDescription.textContent = "분석 정보를 불러올 수 없습니다.";
  if (mainTags) mainTags.innerHTML = "";
  
  if (dataBoxContainer) {
    dataBoxContainer.innerHTML = `
      <div class="empty-state empty-state-${errorType}" role="alert" aria-live="assertive">
        <div class="empty-state-icon empty-state-icon-${errorInfo.icon}" aria-hidden="true"></div>
        <h3 class="empty-state-title">${errorInfo.title}</h3>
        <p class="empty-state-desc">
          ${errorInfo.desc}<br>
          <span class="empty-state-detail">(${message})</span>
        </p>
        <button class="btn-retry" onclick="window.dysapp?.retryAnalysis?.()" aria-label="분석 다시 시도">다시 시도</button>
      </div>
    `;
    
    // Store retry function globally for onclick handler
    if (!window.dysapp) window.dysapp = {};
    window.dysapp.retryAnalysis = retryAnalysis;
  }
  
  // Hide chat input on error
  const chatInputBox = document.getElementById("chatInputBox");
  if (chatInputBox) chatInputBox.style.display = "none";
  
  // Log error for debugging
  console.error("[Analyze] Error state shown:", {
    type: errorType,
    message: message,
    timestamp: new Date().toISOString()
  });
}

// ============================================================================
// Render Analysis Results
// ============================================================================

/**
 * Render all analysis results
 */
function renderAnalysisResults() {
  if (!currentAnalysis) return;

  // Main title/summary
  renderHeader();

  // Keywords/tags
  renderKeywords();

  // Overall Analysis
  renderOverallAnalysis();

  // Data boxes
  renderDataBoxes();

  // AI Suggestion
  renderAISuggestion();

  // Chat suggestions
  renderChatSuggestions();

  console.log("[Analyze] Results rendered");
}

/**
 * Render header section
 */
function renderHeader() {
  if (mainDescription) {
    // Generate summary based on analysis
    const summary = generateSummary(currentAnalysis);
    mainDescription.textContent = summary;
  }
}

/**
 * Generate summary text based on analysis (한 문장 슬로건 형태)
 */
function generateSummary(analysis) {
  // 서버에서 제공한 진단 요약을 우선 사용
  const diagnosis = analysis.layer1?.diagnosis;
  if (diagnosis && diagnosis.trim()) {
    // 긴 텍스트를 한 문장 슬로건으로 요약
    return summarizeToSlogan(diagnosis, analysis);
  }

  // 진단이 없을 경우에만 폴백
  const { format, score, layer3, fixScope } = analysis;
  const tone = layer3?.tone?.label || "심플한";
  const scopeLabel = fixScope?.label || "";

  if (fixScope?.isRebuild) {
    return `${format.label} 디자인입니다. ${scopeLabel}가 필요합니다.`;
  } else if (score.value >= 80) {
    return `${tone} 무드의 완성도 높은 ${format.label} 작업물입니다.`;
  } else if (score.value >= 60) {
    return `${tone} 분위기의 ${format.label} 디자인입니다. ${scopeLabel}을 통해 완성도를 높일 수 있습니다.`;
  } else {
    return `${format.label} 디자인입니다. 구조적 개선이 필요합니다.`;
  }
}

/**
 * 긴 진단 텍스트를 한 문장 슬로건으로 요약
 */
function summarizeToSlogan(diagnosis, analysis) {
  if (!diagnosis || diagnosis.length < 50) {
    return diagnosis; // 짧은 텍스트는 그대로 반환
  }

  const { fixScope, score } = analysis;
  
  // 핵심 키워드 추출
  const hasStructure = diagnosis.includes("구조") || diagnosis.includes("구조화") || diagnosis.includes("위계");
  const hasDetail = diagnosis.includes("디테일") || diagnosis.includes("튜닝") || diagnosis.includes("개선");
  const isGood = diagnosis.includes("명확") || diagnosis.includes("잘") || diagnosis.includes("탄탄") || diagnosis.includes("우수");
  const needsImprovement = diagnosis.includes("개선") || diagnosis.includes("필요") || diagnosis.includes("느리");

  // 점수 기반 판단
  const isHighScore = score?.value >= 80;
  const isMediumScore = score?.value >= 60 && score?.value < 80;

  // 슬로건 생성
  if (isGood && hasDetail && needsImprovement) {
    // 구조는 좋지만 디테일 튜닝 필요
    return "구조는 탄탄하나 디테일 튜닝으로 완성도를 높일 수 있습니다.";
  } else if (isGood && !needsImprovement) {
    // 완성도 높음
    return "전반적으로 구조가 우수한 디자인입니다.";
  } else if (hasStructure && needsImprovement && fixScope?.isRebuild) {
    // 구조적 문제
    return "구조적 개선이 필요한 디자인입니다.";
  } else if (hasDetail && needsImprovement) {
    // 디테일 튜닝 필요
    return "디테일 튜닝을 통해 완성도를 높일 수 있습니다.";
  } else if (isHighScore) {
    return "완성도 높은 디자인입니다.";
  } else if (isMediumScore) {
    return "디테일 튜닝으로 완성도를 높일 수 있습니다.";
  } else {
    // 기본 요약: 첫 문장만 추출하거나 핵심만 추출
    const sentences = diagnosis.split(/[.。]/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      const firstSentence = sentences[0].trim();
      // 첫 문장이 너무 길면 더 요약
      if (firstSentence.length > 60) {
        return "구조는 우수하나 디테일 개선이 필요한 단계입니다.";
      }
      return firstSentence + ".";
    }
    return "디자인 분석이 완료되었습니다.";
  }
}

/**
 * Render keywords section
 */
function renderKeywords() {
  if (!mainTags) return;

  const keywords = currentAnalysis.keywords.slice(0, 4);

  // Clear existing tags and create new ones (use DocumentFragment)
  const fragment = document.createDocumentFragment();
  keywords.forEach((keyword, index) => {
    const span = document.createElement("span");
    span.className = `per${index > 0 ? index + 1 : ""}`;
    span.textContent = keyword;
    fragment.appendChild(span);
  });
  mainTags.innerHTML = "";
  mainTags.appendChild(fragment);
}

/**
 * Render overall analysis section
 */
function renderOverallAnalysis() {
  const section = document.getElementById("overallAnalysisSection");
  const textEl = document.getElementById("overallAnalysisText");

  if (!section || !textEl) return;

  const overallAnalysis = currentAnalysis.overallAnalysis || "";
  
  if (overallAnalysis && overallAnalysis.trim()) {
    textEl.textContent = overallAnalysis;
    section.style.display = "block";
  } else {
    section.style.display = "none";
  }
}

/**
 * Render data boxes
 */
function renderDataBoxes() {
  // Color palette box
  renderColorPalette();

  // Detected objects
  renderDetectedObjects();

  // Usage suggestions
  renderUsageSuggestions();

  // Layout/metrics box
  renderLayoutMetrics();

  // Typography box
  renderTypographyMetrics();

  // Layer 3 브랜딩 인상 리포트
  renderLayer3Report();

  // Language/text data
  renderLanguageData();

  // Setup modal event listeners after rendering
  setupModalListeners();
}

/**
 * Render color palette
 */
function renderColorPalette() {
  const colorContent = document.getElementById("colorPaletteContent");
  const colorDesc = document.getElementById("colorPaletteDesc");

  if (!colorContent || !currentAnalysis.colors?.length) return;

  const colors = currentAnalysis.colors;

  // Build color palette HTML
  const primaryColor = colors[0];
  const secondaryColors = colors.slice(1, 4);

  colorContent.innerHTML = `
    <span class="color1" style="background-color: ${primaryColor.hex}; color: ${getContrastColor(primaryColor.hex)}">
      ${primaryColor.hex}
    </span>
    <div class="colorlayout">
      ${secondaryColors
        .map(
          (color, i) =>
            `<span class="color${i + 2}" style="background-color: ${color.hex}; color: ${getContrastColor(color.hex)}">${color.hex}</span>`
        )
        .join("")}
    </div>
  `;

  // Description
  if (colorDesc) {
    colorDesc.textContent = generateColorDescription(colors);
  }
}

/**
 * Generate color description
 */
function generateColorDescription(colors) {
  if (colors.length === 0) return "색상 정보가 없습니다.";

  const primaryColor = colors[0];
  const harmony = currentAnalysis.layer2?.color?.value || 70;

  if (harmony >= 80) {
    return `${primaryColor.name}을(를) 주 색상으로 사용한 조화로운 색상 팔레트입니다. 색채 이론에 부합하는 안정적인 구성입니다.`;
  } else if (harmony >= 60) {
    return `${primaryColor.name}을(를) 기반으로 한 색상 구성입니다. 색상 간 조화를 약간 개선하면 더 나은 결과를 얻을 수 있습니다.`;
  } else {
    return `색상 조합에 개선이 필요합니다. 보색 또는 유사색 원칙을 적용해 보세요.`;
  }
}

/**
 * Render layout metrics
 */
function renderLayoutMetrics() {
  const layoutContent = document.getElementById("layoutContent");
  const layoutDesc = document.getElementById("layoutDesc");

  if (!layoutContent) return;

  const layer1 = currentAnalysis.layer1;
  const layer2 = currentAnalysis.layer2;

  const metrics = [
    { label: "계층성", value: layer1?.hierarchy?.value || 0 },
    { label: "스캔성", value: layer1?.scanability?.value || 0 },
    { label: "그리드", value: layer2?.grid?.value || 0 },
    { label: "균형", value: layer2?.balance?.value || 0 },
  ];

  // Build accessibility badges HTML
  const accessibility = layer1?.accessibility;
  const issues = accessibility?.issues || [];
  let accessibilityBadgesHTML = "";
  
  if (issues.length > 0) {
    accessibilityBadgesHTML = `
      <div class="accessibility-badges">
        ${issues.map(issue => {
          const iconMap = {
            lowContrast: "!",
            tinyText: "A",
            cluttered: "≡",
          };
          const icon = iconMap[issue.type] || "!";
          return `
            <span class="a11y-badge a11y-badge-${issue.type}" title="${issue.description}">
              <span class="a11y-icon">${icon}</span>
              <span class="a11y-label">${issue.label}</span>
            </span>
          `;
        }).join("")}
      </div>
    `;
  }

  layoutContent.innerHTML = metrics
    .map(
      (metric) => `
      <div class="oneEle">
        <p class="item">${metric.label}</p>
        <div class="value">${metric.value}%</div>
      </div>
    `
    )
    .join("");

  // Accessibility badges can be appended or handled separately if needed
  // For now, reverting to original structure as requested
  if (issues.length > 0) {
    // Optionally add badges after metrics or in description
    // Keeping it simple as per "revert to original" request
  }

  // Description - 리포트 형태로 개선
  if (layoutDesc) {
    const diagnosis = layer1?.diagnosis || "";
    
    let descText = diagnosis;
    
    // 핵심 위험도 표시
    const avgScore = Math.round(
      ((layer1?.hierarchy?.value || 0) + 
       (layer1?.scanability?.value || 0) + 
       (layer1?.goalClarity?.value || 0)) / 3
    );
    
    if (avgScore < 50) {
      descText += " [심각] 구조 재설계가 시급합니다.";
    } else if (avgScore < 60) {
      descText += " [주의] 구조적 개선이 필요합니다.";
    }
    
    layoutDesc.textContent = descText || "레이아웃 분석 결과입니다.";
  }
}

/**
 * Render typography metrics
 */
function renderTypographyMetrics() {
  const typoContent = document.getElementById("typographyContent");
  const typoDesc = document.getElementById("typographyDesc");

  if (!typoContent) return;

  const typoQuality = currentAnalysis.layer2?.typography?.value || 0;

  typoContent.innerHTML = `
    <div class="textwrap">
      <p class="eng">Aa</p>
      <p class="font">Typography<br />${typoQuality}%</p>
    </div>
    <span class="percent">
      <span class="perInside" style="width: ${typoQuality}%"></span>
    </span>
  `;

  // Description - 리포트 형태로 개선 (규칙 기반)
  if (typoDesc) {
    const layer2 = currentAnalysis.layer2;
    const grid = layer2?.grid?.value || 0;
    const balance = layer2?.balance?.value || 0;
    const color = layer2?.color?.value || 0;
    
    // Layer 2 종합 평가
    const layer2Avg = Math.round((grid + balance + color + typoQuality) / 4);
    
    let descParts = [];
    
    if (typoQuality >= 80) {
      descParts.push("타이포그래피: 가독성과 계층 구조가 명확합니다.");
    } else if (typoQuality >= 60) {
      descParts.push("타이포그래피: 행간/자간 조정으로 개선 가능합니다.");
    } else {
      descParts.push("타이포그래피: 폰트 선택과 크기 대비 개선이 필요합니다.");
    }
    
    // 그리드와 균형도 간단히 언급
    if (grid < 70) {
      descParts.push("그리드 정렬을 개선하면 구조가 더 명확해집니다.");
    }
    if (balance < 70) {
      descParts.push("시각적 균형을 조정하면 안정감이 향상됩니다.");
    }
    
    typoDesc.textContent = descParts.join(" ");
  }
}

/**
 * Render Layer 3 브랜딩 인상 리포트
 */
function renderLayer3Report() {
  const layer3 = currentAnalysis.layer3;
  if (!layer3) return;

  // Layer 3 리포트를 표시할 요소 찾기 (기존 요소 활용 또는 새로 생성)
  // 일단 기존 레이아웃에 통합하는 방식으로 진행
  const layoutDesc = document.getElementById("layoutDesc");
  if (layoutDesc && layer3.trust && layer3.engagement && layer3.tone) {
    // Layer 3 정보를 기존 설명에 추가
    const currentText = layoutDesc.textContent || "";
    const layer3Summary = generateLayer3Summary(layer3);
    
    // 기존 텍스트가 있으면 추가, 없으면 새로 생성
    if (currentText && !currentText.includes("브랜딩")) {
      layoutDesc.textContent = currentText + " " + layer3Summary;
    }
  }
}

/**
 * Generate Layer 3 브랜딩 인상 요약
 */
function generateLayer3Summary(layer3) {
  const trust = layer3.trust?.label || "보통";
  const engagement = layer3.engagement?.label || "보통";
  const tone = layer3.tone?.label || "차분한";
  
  const trustLevel = layer3.trust?.value === "High" ? "높은" : 
                     layer3.trust?.value === "Low" ? "낮은" : "보통의";
  const engagementLevel = layer3.engagement?.value === "High" ? "높은" : 
                          layer3.engagement?.value === "Low" ? "낮은" : "보통의";
  
  return `브랜딩 인상: ${trustLevel} 신뢰도와 ${engagementLevel} 참여 유도력을 가진 ${tone} 톤의 디자인입니다.`;
}

/**
 * Render usage suggestions
 */
function renderUsageSuggestions() {
  const usageContent = document.getElementById("usageSuggestionsContent");
  const usageDesc = document.getElementById("usageSuggestionsDesc");

  if (!usageContent) return;

  const format = currentAnalysis.format?.value || "Unknown";
  const suggestions = getUsageSuggestions(format);

  usageContent.innerHTML = suggestions
    .map((suggestion) => `<li class="utilize">${suggestion}</li>`)
    .join("");

  if (usageDesc) {
    usageDesc.textContent = `${currentAnalysis.format?.label || "디자인"} 형식에 적합한 활용 방안입니다.`;
  }
}

/**
 * Render detected objects
 */
function renderDetectedObjects() {
  const objectsContent = document.getElementById("detectedObjectsContent");
  const objectsDesc = document.getElementById("detectedObjectsDesc");

  if (!objectsContent) return;

  // Use keywords as detected objects for now
  const objects = currentAnalysis.keywords?.slice(0, 3) || [];

  objectsContent.innerHTML = objects
    .map((obj) => `<div class="eleText">${obj}</div>`)
    .join("");

  if (objectsDesc) {
    objectsDesc.textContent = "이미지에서 감지된 주요 객체 요소들입니다.";
  }
}

/**
 * Render language/text data
 */
function renderLanguageData() {
  const langContent = document.getElementById("languageContent");
  const langDesc = document.getElementById("languageDesc");

  if (!langContent) return;

  const recognizedText = currentAnalysis.recognizedText || "";
  
  if (recognizedText) {
    // Display recognized text
    const textPreview = recognizedText.length > 50 
      ? recognizedText.substring(0, 50) + "..." 
      : recognizedText;
    
    langContent.innerHTML = `
      <span class="lang">한국어</span>
      <span class="text">${textPreview}</span>
    `;
    
    if (langDesc) {
      langDesc.textContent = `인식된 텍스트: ${recognizedText.length}자`;
    }
  } else {
    langContent.innerHTML = `
      <span class="lang">-</span>
      <span class="text">인식된 텍스트가 없습니다.</span>
    `;
    
    if (langDesc) {
      langDesc.textContent = "이미지에서 텍스트를 인식하지 못했습니다.";
    }
  }
}

/**
 * Setup modal listeners (called after rendering)
 */
function setupModalListeners() {
  // This is already handled in setupEventListeners, but kept for clarity
}

/**
 * Get usage suggestions based on format
 */
function getUsageSuggestions(format) {
  const suggestions = {
    UX_UI: ["앱/웹 인터페이스", "대시보드 디자인", "디지털 프로덕트"],
    Editorial: ["매거진/북 디자인", "브로셔/카탈로그", "보고서 레이아웃"],
    Poster: ["이벤트/공연 홍보", "광고 캠페인", "전시 포스터"],
    Thumbnail: ["유튜브 썸네일", "SNS 콘텐츠", "블로그 커버"],
    Card: ["명함 디자인", "초대장/카드", "패키지 디자인"],
    BI_CI: ["브랜드 아이덴티티", "로고 디자인", "브랜드 가이드"],
    Unknown: ["다양한 용도로 활용 가능", "맞춤 디자인", "특수 목적"],
  };

  return suggestions[format] || suggestions.Unknown;
}

/**
 * Render AI suggestion section (Simplified)
 */
function renderAISuggestion() {
  if (!aiRecommendation) return;

  const actions = currentAnalysis.nextActions;
  
  if (actions && actions.length > 0) {
    // Simple list without titles, numbers, or complex styling
    aiRecommendation.innerHTML = `
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${actions.map((action) => `
          <li style="margin-bottom: 8px; padding-left: 12px; position: relative;">
            <span style="position: absolute; left: 0; top: 6px; width: 4px; height: 4px; background: #875CFF; border-radius: 50%;"></span>
            <p style="margin: 0; line-height: 1.5; color: #555; font-size: 0.95em;">${action}</p>
          </li>
        `).join("")}
      </ul>
    `;
  } else {
    aiRecommendation.innerHTML = `
      <p style="color: #666; font-size: 0.9em;">분석 결과를 바탕으로 AI가 개선 방안을 제안합니다.</p>
    `;
  }
}

/**
 * Render chat suggestions
 */
function renderChatSuggestions() {
  if (!suggestionBox) return;

  const suggestions = [
    "이 디자인의 색상 조합에 대해 더 자세히 알려줘.",
    "레이아웃을 어떻게 개선할 수 있을까?",
    "타이포그래피 계층 구조를 개선하는 방법은?",
  ];

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  suggestions.forEach(text => {
    const div = document.createElement("div");
    div.className = "sug_li";
    div.setAttribute("role", "button");
    div.setAttribute("tabindex", "0");
    div.innerHTML = `
      <img src="./img/s_icon.svg" alt="" class="sug_icon" aria-hidden="true">
      <p class="sug_li_p">${text}</p>
    `;
    fragment.appendChild(div);
  });
  suggestionBox.innerHTML = "";
  suggestionBox.appendChild(fragment);

  // Add click handlers
  suggestionBox.querySelectorAll(".sug_li").forEach((item) => {
    const handleClick = () => {
      const text = item.querySelector(".sug_li_p")?.textContent;
      if (text && chatInput) {
        chatInput.value = text;
        chatInput.focus();
      }
    };
    
    item.addEventListener("click", handleClick);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    });
  });
}

// ============================================================================
// Chat Functionality
// ============================================================================

/**
 * Send chat message
 */
async function sendChatMessage() {
  const message = chatInput?.value?.trim();
  if (!message || !currentAnalysis) return;

  // Clear input
  chatInput.value = "";
  chatInput.style.height = 'auto'; // Reset height after send
  chatSendBtn?.classList.remove("active"); // Deactivate button

  // Add user message to chat
  addChatMessage("user", message);

  try {
    // Show typing indicator
    const typingIndicator = addTypingIndicator();

    const response = await chatWithMentor({
      analysisId: currentAnalysis.id,
      message,
      sessionId: chatSessionId,
    });

    // Remove typing indicator
    typingIndicator?.remove();

    if (response.success) {
      chatSessionId = response.sessionId;
      addChatMessage("assistant", response.response);
    } else {
      toast.error("답변을 받지 못했습니다");
    }
  } catch (error) {
    console.error("[Analyze] Chat failed:", error);
    toast.error("채팅 중 오류가 발생했습니다");
  }
}

/**
 * Add chat message to container
 */
function addChatMessage(role, content) {
  if (!chatContainer) return;

  // 디버깅: 콘솔에 전체 내용 출력
  console.log(`[Chat] Adding ${role} message, length: ${content?.length || 0}`);
  if (content && content.length > 1000) {
    console.log(`[Chat] Long message detected: ${content.substring(0, 100)}...`);
  }

  const messageClass = role === "user" ? "bubble_user" : "bubble_ai";
  const bubbleClass = role === "user" ? "bubbleBox1" : "bubbleBox2";
  const textClass = role === "user" ? "promptB_user" : "promptB_ai";

  // Check for same sender grouping
  const lastMessage = chatContainer.lastElementChild;
  const isSameSender = lastMessage && lastMessage.classList.contains(messageClass);

  const messageDiv = document.createElement("div");
  messageDiv.className = messageClass;
  messageDiv.setAttribute("role", role === "user" ? "log" : "log");
  messageDiv.setAttribute("aria-label", role === "user" ? "사용자 메시지" : "AI 응답");
  
  if (isSameSender) {
    messageDiv.classList.add("same-sender");
  }

  // Use setHTML with sanitization for user input
  const formattedContent = formatChatContent(content);
  const messageHtml = `
    <div class="${bubbleClass}">
      <p class="${textClass}">${formattedContent}</p>
    </div>
  `;
  setHTML(messageDiv, messageHtml, { sanitize: true });

  // Add to chat container
  chatContainer.appendChild(messageDiv);

  // 디버깅: 렌더링 후 실제 높이 확인
  requestAnimationFrame(() => {
    const renderedText = messageDiv.querySelector(`.${textClass}`);
    if (renderedText) {
      console.log(`[Chat] Rendered height: ${renderedText.offsetHeight}px, scrollHeight: ${renderedText.scrollHeight}px`);
      // 높이가 제한되어 있는지 확인
      if (renderedText.scrollHeight > renderedText.offsetHeight) {
        console.warn(`[Chat] Text may be truncated! scrollHeight (${renderedText.scrollHeight}px) > offsetHeight (${renderedText.offsetHeight}px)`);
      }
    }
    messageDiv.scrollIntoView({ behavior: "smooth", block: "end" });
  });
}

/**
 * Strip emojis from text
 */
function stripEmojis(text) {
  if (!text) return "";
  // Remove emoji Unicode ranges
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "") // Emoticons & Symbols
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // Emoticons
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // Transport & Map
    .replace(/[\u{2600}-\u{26FF}]/gu, "") // Miscellaneous Symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, "") // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "") // Variation Selectors
    .replace(/[\u{200D}]/gu, "") // Zero Width Joiner
    .replace(/[\u{20E3}]/gu, "") // Combining Enclosing Keycap
    .trim();
}

/**
 * Format chat content (convert markdown-like to HTML and strip emojis)
 * Safely handles HTML escaping to prevent broken rendering
 */
function formatChatContent(content) {
  if (!content) return "";
  
  // 1. Strip emojis
  let cleaned = stripEmojis(content);

  // 2. Escape HTML characters to prevent broken layout from unclosed tags or < characters
  cleaned = cleaned
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // 3. Convert basic markdown to HTML
  // Bold
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  
  // Headers (###)
  cleaned = cleaned.replace(/###\s*(.*?)(?:$|\n)/g, "<strong>$1</strong><br/>");
  
  // Lists (- item) -> simple bullet handling with line breaks
  cleaned = cleaned.replace(/^\s*-\s+(.*)$/gm, "• $1");

  // Line breaks - 더 강력한 처리
  cleaned = cleaned.replace(/\n\n/g, "<br/><br/>"); // 이중 줄바꿈
  cleaned = cleaned.replace(/\n/g, "<br/>"); // 단일 줄바꿈

  return cleaned;
}

/**
 * Add typing indicator
 */
function addTypingIndicator() {
  if (!chatContainer) return null;

  const indicator = document.createElement("div");
  indicator.className = "bubble_ai typing-indicator";
  indicator.setAttribute("role", "status");
  indicator.setAttribute("aria-live", "polite");
  indicator.setAttribute("aria-label", "AI가 입력 중입니다");
  indicator.innerHTML = `
    <div class="bubbleBox2">
      <p class="promptB_ai" aria-hidden="true">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </p>
    </div>
  `;

  chatContainer.appendChild(indicator);
  
  // Scroll to bottom (use requestAnimationFrame for better performance)
  requestAnimationFrame(() => {
    indicator.scrollIntoView({ behavior: "smooth", block: "end" });
  });

  return indicator;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get contrast color for text on colored background
 */
function getContrastColor(hexColor) {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#ffffff";
}

// ============================================================================
// Modal Functions
// ============================================================================

/**
 * Category to modal data mapping
 */
const MODAL_CONFIG = {
  colorPalette: {
    title: "색상 팔레트",
    description: "색상 팔레트의 심미적 조화, 대비(Accessibility), 및 브랜드 아이덴티티 전달력을 분석합니다.",
    criteria: "색채 이론(Complementary Colors)",
    getElements: (analysis) => analysis.colors?.slice(0, 4).map(c => c.name || c.hex) || [],
    getDetailAnalysis: (analysis) => {
      const colorHarmony = analysis.layer2?.color?.value || 0;
      const primaryColor = analysis.colors?.[0];
      if (!primaryColor) return "색상 정보가 없습니다.";
      
      if (colorHarmony >= 80) {
        return `${primaryColor.name}을(를) 주 색상으로 사용한 조화로운 색상 팔레트입니다. 색채 이론에 부합하는 안정적인 구성입니다.`;
      } else if (colorHarmony >= 60) {
        return `${primaryColor.name}을(를) 기반으로 한 색상 구성입니다. 색상 간 조화를 약간 개선하면 더 나은 결과를 얻을 수 있습니다.`;
      } else {
        return `색상 조합에 개선이 필요합니다. 보색 또는 유사색 원칙을 적용해 보세요.`;
      }
    },
  },
  detectedObjects: {
    title: "감지된 객체",
    description: "이미지에서 식별된 주요 객체 요소들을 기반으로 컨텍스트와 의미를 분석합니다.",
    criteria: "객체 인식 (Object Detection)",
    getElements: (analysis) => analysis.keywords?.slice(0, 4) || [],
    getDetailAnalysis: (analysis) => {
      const keywords = analysis.keywords?.slice(0, 3) || [];
      if (keywords.length === 0) return "감지된 객체가 없습니다.";
      return `주요 키워드: ${keywords.join(", ")}. 이 요소들이 디자인의 핵심 컨텍스트를 형성합니다.`;
    },
  },
  usageSuggestions: {
    title: "활용 제안",
    description: "이미지의 분위기, 형태, 구성 요소를 바탕으로 적합한 활용 시나리오를 제안합니다.",
    criteria: "디자인 형식 분석",
    getElements: (analysis) => {
      const format = analysis.format?.value || "Unknown";
      const suggestions = {
        UX_UI: ["앱/웹 인터페이스", "대시보드 디자인", "디지털 프로덕트"],
        Editorial: ["매거진/북 디자인", "브로셔/카탈로그", "보고서 레이아웃"],
        Poster: ["이벤트/공연 홍보", "광고 캠페인", "전시 포스터"],
        Thumbnail: ["유튜브 썸네일", "SNS 콘텐츠", "블로그 커버"],
        Card: ["명함 디자인", "초대장/카드", "패키지 디자인"],
        BI_CI: ["브랜드 아이덴티티", "로고 디자인", "브랜드 가이드"],
        Unknown: ["다양한 용도로 활용 가능", "맞춤 디자인", "특수 목적"],
      };
      return suggestions[format] || suggestions.Unknown;
    },
    getDetailAnalysis: (analysis) => {
      const formatLabel = analysis.format?.label || "디자인";
      return `${formatLabel} 형식에 적합한 활용 방안입니다.`;
    },
  },
  layout: {
    title: "레이아웃",
    description: "그리드 시스템, 여백(Whitespace), 시각적 균형 및 정보 계층 구조의 효율성을 측정합니다.",
    criteria: "그리드 시스템 & 정보 계층 (Grid Systems & Information Hierarchy)",
    getElements: (analysis) => {
      const layer1 = analysis.layer1;
      const layer2 = analysis.layer2;
      if (!layer1 || !layer2) return [];
      return [
        `계층성: ${layer1.hierarchy?.value || 0}%`,
        `스캔성: ${layer1.scanability?.value || 0}%`,
        `그리드: ${layer2.grid?.value || 0}%`,
        `균형: ${layer2.balance?.value || 0}%`,
      ];
    },
    getDetailAnalysis: (analysis) => {
      const layer1 = analysis.layer1;
      const layer2 = analysis.layer2;
      if (!layer1 || !layer2) return "레이아웃 정보가 없습니다.";
      
      const diagnosis = layer1.diagnosis || "";
      const accessibility = layer1.accessibility;
      const issues = accessibility?.issues || [];
      
      let detail = diagnosis;
      
      if (issues.length > 0) {
        const issueLabels = issues.map(issue => issue.label).join(", ");
        detail += ` 접근성 이슈: ${issueLabels}.`;
      }
      
      const avgScore = Math.round(
        ((layer1.hierarchy?.value || 0) + 
         (layer1.scanability?.value || 0) + 
         (layer1.goalClarity?.value || 0)) / 3
      );
      
      if (avgScore < 50) {
        detail += " [심각] 구조 재설계가 시급합니다.";
      } else if (avgScore < 60) {
        detail += " [주의] 구조적 개선이 필요합니다.";
      }
      
      return detail || "레이아웃 분석 결과입니다.";
    },
  },
  typography: {
    title: "타이포그래피",
    description: "서체(Font)의 가독성, 크기 대비(Hierarchy), 행간/자간 및 폰트 페어링의 조화를 평가합니다.",
    criteria: "타이포그래피 원칙 (Typography Principles)",
    getElements: (analysis) => {
      const typoQuality = analysis.layer2?.typography?.value || 0;
      return [`타이포그래피 품질: ${typoQuality}%`];
    },
    getDetailAnalysis: (analysis) => {
      const layer2 = analysis.layer2;
      if (!layer2) return "타이포그래피 정보가 없습니다.";
      
      const typoQuality = layer2.typography?.value || 0;
      const grid = layer2.grid?.value || 0;
      const balance = layer2.balance?.value || 0;
      
      let detailParts = [];
      
      if (typoQuality >= 80) {
        detailParts.push("타이포그래피: 가독성과 계층 구조가 명확합니다.");
      } else if (typoQuality >= 60) {
        detailParts.push("타이포그래피: 행간/자간 조정으로 개선 가능합니다.");
      } else {
        detailParts.push("타이포그래피: 폰트 선택과 크기 대비 개선이 필요합니다.");
      }
      
      if (grid < 70) {
        detailParts.push("그리드 정렬을 개선하면 구조가 더 명확해집니다.");
      }
      if (balance < 70) {
        detailParts.push("시각적 균형을 조정하면 안정감이 향상됩니다.");
      }
      
      return detailParts.join(" ") || "타이포그래피 분석 결과입니다.";
    },
  },
  language: {
    title: "인식된 텍스트",
    description: "이미지 안의 실제 텍스트 내용과 의미를 기반으로 깊이 있는 분석을 제공합니다.",
    criteria: "OCR 텍스트 인식 (OCR Text Recognition)",
    getElements: (analysis) => {
      const recognizedText = analysis.recognizedText || "";
      if (!recognizedText) return ["텍스트 없음"];
      // Split by lines or sentences, take first few
      const lines = recognizedText.split(/\n|\./).filter(l => l.trim()).slice(0, 3);
      return lines.length > 0 ? lines : ["텍스트 인식됨"];
    },
    getDetailAnalysis: (analysis) => {
      const recognizedText = analysis.recognizedText || "";
      if (!recognizedText) {
        return "이미지에서 인식된 텍스트가 없습니다.";
      }
      return `인식된 텍스트: ${recognizedText.substring(0, 200)}${recognizedText.length > 200 ? "..." : ""}`;
    },
  },
};

/**
 * Open detail modal with dynamic content
 */
function openDetailModal(category) {
  if (!currentAnalysis) return;

  const config = MODAL_CONFIG[category];
  if (!config) {
    console.warn(`[Analyze] Unknown category: ${category}`);
    return;
  }

  // Use cached modal elements
  const modal = getModalElements();
  const { modalBg, modalTitle, modalDescription, modalCriteria, modalElements, modalDetailAnalysis, modalBox } = modal;

  if (!modalBg || !modalTitle || !modalDescription || !modalCriteria || !modalElements || !modalDetailAnalysis) {
    console.warn("[Analyze] Modal elements not found");
    return;
  }

  // Update modal content
  modalTitle.textContent = config.title;
  modalDescription.textContent = config.description;
  modalCriteria.textContent = config.criteria;

  // Update elements (use DocumentFragment for better performance)
  const elements = config.getElements(currentAnalysis);
  const fragment = document.createDocumentFragment();
  elements.forEach(elem => {
    const p = document.createElement("p");
    p.className = "modal_p2";
    p.textContent = elem;
    fragment.appendChild(p);
  });
  modalElements.innerHTML = "";
  modalElements.appendChild(fragment);

  // Update detail analysis
  modalDetailAnalysis.textContent = config.getDetailAnalysis(currentAnalysis);

  // Show modal
  const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
  modalBg.style.display = "flex";
  document.body.style.overflow = "hidden";
  document.body.style.paddingRight = `${scrollBarWidth}px`;
  document.documentElement.style.paddingRight = `${scrollBarWidth}px`;
  
  // Focus management: Focus first focusable element in modal
  requestAnimationFrame(() => {
    const firstFocusable = modalBox?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();
  });
}

/**
 * Close detail modal
 */
function closeDetailModal() {
  const modal = getModalElements();
  const modalBg = modal.modalBg;
  if (!modalBg) return;

  modalBg.style.display = "none";
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
  document.documentElement.style.paddingRight = "";
}

// ============================================================================
// Event Listeners Management
// ============================================================================

// Track registered listeners to prevent duplicates
const eventListeners = {
  chat: new WeakSet(),
  modal: new WeakSet(),
  dataBoxes: new WeakSet(),
  global: new WeakSet(),
  initialized: false
};

/**
 * Setup event listeners with duplicate prevention
 */
function setupEventListeners() {
  // Prevent duplicate initialization
  if (eventListeners.initialized) {
    console.warn("[Analyze] Event listeners already initialized, skipping...");
    return;
  }
  
  // Chat send button
  if (chatSendBtn && !eventListeners.chat.has(chatSendBtn)) {
    chatSendBtn.addEventListener("click", sendChatMessage);
    eventListeners.chat.add(chatSendBtn);
  }

  // Chat input handlers
  if (chatInput) {
    // Enter key handler
    if (!eventListeners.chat.has(chatInput)) {
      const enterHandler = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendChatMessage();
        }
      };
      chatInput.addEventListener("keydown", enterHandler);
      eventListeners.chat.add(chatInput);
      
      // Store handler for cleanup
      chatInput._enterHandler = enterHandler;
    }

    // Auto-grow & button state handler
    const inputHandler = function() {
      this.style.height = 'auto'; // Reset height
      const newHeight = Math.min(this.scrollHeight, window.innerHeight * 0.2); 
      this.style.height = newHeight + 'px';
      
      // Toggle button state & accessibility
      const hasContent = this.value.trim().length > 0;
      if (hasContent) {
        chatSendBtn?.classList.add("active");
        chatSendBtn?.removeAttribute("disabled");
        chatSendBtn?.setAttribute("aria-disabled", "false");
      } else {
        chatSendBtn?.classList.remove("active");
        chatSendBtn?.setAttribute("disabled", "true");
        chatSendBtn?.setAttribute("aria-disabled", "true");
      }
    };
    
    if (!chatInput._inputHandler) {
      chatInput.addEventListener("input", inputHandler);
      chatInput._inputHandler = inputHandler;
    }
  }

  // Modal handlers (use cached elements)
  const modal = getModalElements();
  const modalCloseBtn = modal.modalCloseBtn;
  if (modalCloseBtn && !eventListeners.modal.has(modalCloseBtn)) {
    modalCloseBtn.addEventListener("click", closeDetailModal);
    eventListeners.modal.add(modalCloseBtn);
  }

  const modalBg = modal.modalBg;
  if (modalBg && !eventListeners.modal.has(modalBg)) {
    const modalBgHandler = (e) => {
      if (e.target === modalBg) {
        closeDetailModal();
      }
    };
    modalBg.addEventListener("click", modalBgHandler);
    eventListeners.modal.add(modalBg);
    modalBg._clickHandler = modalBgHandler;
  }

  // Data box clicks - use event delegation for dynamic elements
  if (dataBoxContainer && !eventListeners.dataBoxes.has(dataBoxContainer)) {
    const dataBoxHandler = (e) => {
      const box = e.target.closest(".dataBox");
      if (box) {
        const category = box.getAttribute("data-category");
        if (category) {
          openDetailModal(category);
        }
      }
    };
    
    // Click handler
    dataBoxContainer.addEventListener("click", dataBoxHandler);
    
    // Keyboard handler (Enter/Space)
    const dataBoxKeyHandler = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const box = e.target.closest(".dataBox");
        if (box) {
          const category = box.getAttribute("data-category");
          if (category) {
            openDetailModal(category);
          }
        }
      }
    };
    dataBoxContainer.addEventListener("keydown", dataBoxKeyHandler);
    
    eventListeners.dataBoxes.add(dataBoxContainer);
    dataBoxContainer._clickHandler = dataBoxHandler;
    dataBoxContainer._keyHandler = dataBoxKeyHandler;
  }

  // Global ESC key handler & Focus Trap
  if (!eventListeners.global.has(document)) {
    const escHandler = (e) => {
      if (e.key === "Escape") {
        const modal = getModalElements();
        const modalBg = modal.modalBg;
        if (modalBg && modalBg.style.display === "flex") {
          closeDetailModal();
        }
      }
    };
    
    // Focus trap for modal
    const focusTrapHandler = (e) => {
      const modal = getModalElements();
      const modalBg = modal.modalBg;
      if (modalBg && modalBg.style.display === "flex") {
        const modalBox = modal.modalBox;
        const focusableElements = modalBox?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements?.[0];
        const lastElement = focusableElements?.[focusableElements.length - 1];
        
        if (e.key === "Tab") {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };
    
    document.addEventListener("keydown", escHandler);
    document.addEventListener("keydown", focusTrapHandler);
    eventListeners.global.add(document);
    document._escHandler = escHandler;
    document._focusTrapHandler = focusTrapHandler;
  }
  
  eventListeners.initialized = true;
  
  // Development mode: log listener count
  if (window.dysapp?.debug) {
    console.log("[Analyze] Event listeners initialized:", {
      chat: eventListeners.chat.size || "WeakSet",
      modal: eventListeners.modal.size || "WeakSet",
      dataBoxes: eventListeners.dataBoxes.size || "WeakSet"
    });
  }
}

/**
 * Cleanup event listeners (for page navigation or cleanup)
 */
function cleanupEventListeners() {
  // Chat input handlers
  if (chatInput) {
    if (chatInput._enterHandler) {
      chatInput.removeEventListener("keydown", chatInput._enterHandler);
      delete chatInput._enterHandler;
    }
    if (chatInput._inputHandler) {
      chatInput.removeEventListener("input", chatInput._inputHandler);
      delete chatInput._inputHandler;
    }
  }
  
  // Modal handlers
  const modalBg = document.getElementById("detail_modalBg");
  if (modalBg && modalBg._clickHandler) {
    modalBg.removeEventListener("click", modalBg._clickHandler);
    delete modalBg._clickHandler;
  }
  
  // Data box handlers
  if (dataBoxContainer && dataBoxContainer._clickHandler) {
    dataBoxContainer.removeEventListener("click", dataBoxContainer._clickHandler);
    delete dataBoxContainer._clickHandler;
  }
  
  // Global handlers
  if (document._escHandler) {
    document.removeEventListener("keydown", document._escHandler);
    delete document._escHandler;
  }
  if (document._focusTrapHandler) {
    document.removeEventListener("keydown", document._focusTrapHandler);
    delete document._focusTrapHandler;
  }
  
  eventListeners.initialized = false;
  console.log("[Analyze] Event listeners cleaned up");
}

// ============================================================================
// Typing Indicator Styles
// ============================================================================

const typingStyles = `
.typing-indicator .promptB_ai {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-indicator .dot {
  width: 8px;
  height: 8px;
  background: #875CFF;
  border-radius: 50%;
  animation: typing-bounce 1.4s ease-in-out infinite;
}

.typing-indicator .dot:nth-child(1) { animation-delay: 0s; }
.typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = typingStyles;
document.head.appendChild(styleSheet);

// ============================================================================
// Initialize
// ============================================================================

function init() {
  console.log("[Analyze] Initializing analyze page...");
  setupEventListeners();
  
  // Start with skeleton instead of full screen loader
  showSkeleton();
  loadAnalysis();
}

// Cleanup on page unload
window.addEventListener("beforeunload", cleanupEventListeners);

// Wait for app initialization
window.addEventListener("dysapp:ready", init);

// Also try immediate init if already ready
if (window.dysapp?.initialized) {
  init();
}
