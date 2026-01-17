/**
 * Upload Page Script (index.html)
 * Handles image upload and analysis initiation
 */

import {
  analyzeDesign,
  readFileAsBase64,
  validateImageFile,
  getAnalyses,
} from "../services/apiService.js";
import { adaptAnalysesResponse } from "../utils/dataAdapter.js";
import {
  showLoading,
  hideLoading,
  toast,
  navigateToAnalysis,
} from "./app.js";
import { onClick, onChange, onKeyDown, addEventListener, registerCleanup } from "../utils/eventManager.js";

// ============================================================================
// State
// ============================================================================

let selectedFile = null;

// ============================================================================
// DOM Elements
// ============================================================================

const uploadBox = document.querySelector(".uploadBox");
const uploadInput = document.querySelector(".upload_input");
const promptTextarea = document.querySelector(".prompt");
const sendButton = document.querySelector(".send_btn");
const promptModal = document.getElementById("promptModal");
const promptMoreBtn = document.querySelector(".promptMore");
const closeModalBtn = document.getElementById("closeModalBtn");

// ============================================================================
// File Upload Handling
// ============================================================================

/**
 * 파일 선택 처리 함수
 * 
 * 사용자가 파일을 선택했을 때 호출되는 함수입니다.
 * 파일 유효성 검사를 수행하고, 유효한 경우 UI를 업데이트합니다.
 * 
 * 처리 과정:
 * 1. 파일 유효성 검사 (형식, 크기 등)
 * 2. 검사 실패 시 에러 메시지 표시 및 입력 초기화
 * 3. 검사 성공 시 파일 저장 및 UI 업데이트
 * 
 * @param {File} file - 선택된 파일 객체
 * 
 * @example
 * // 파일 입력 이벤트에서 호출
 * uploadInput.addEventListener('change', (e) => {
 *   const file = e.target.files[0];
 *   if (file) {
 *     handleFileSelect(file);
 *   }
 * });
 */
function handleFileSelect(file) {
  // 파일 유효성 검사: 형식, 크기 등 확인
  const validation = validateImageFile(file);
  if (!validation.valid) {
    // 검사 실패 시 에러 메시지 표시
    toast.error(validation.error);
    
    // 입력 필드 초기화 (사용자가 다시 선택할 수 있도록)
    if (uploadInput) {
      uploadInput.value = "";
    }
    return;
  }

  // 유효한 파일을 전역 변수에 저장
  selectedFile = file;

  // UI 업데이트: 선택된 파일 미리보기 표시
  updateUploadBoxUI(file);

  // 성공 메시지 표시
  toast.success(`${file.name} 선택됨`);
}

/**
 * 업로드 박스 UI 업데이트 함수
 * 
 * 선택된 파일의 미리보기를 표시하고, 업로드 박스의 내용을 변경합니다.
 * FileReader API를 사용하여 이미지를 Data URL로 변환하여 미리보기로 표시합니다.
 * 
 * @param {File} file - 미리보기를 표시할 파일 객체
 * 
 * @example
 * // 파일 선택 후 자동으로 호출됨
 * updateUploadBoxUI(selectedFile);
 */
function updateUploadBoxUI(file) {
  const uboxWrap = uploadBox.querySelector(".UBox_wrap");
  if (!uboxWrap) return;

  // FileReader를 사용하여 파일을 Data URL로 읽기
  const reader = new FileReader();
  
  // 파일 읽기 완료 시 UI 업데이트
  reader.onload = (e) => {
    // 미리보기 이미지와 파일명을 표시하는 HTML 생성
    uboxWrap.innerHTML = `
      <img src="${e.target.result}" alt="Preview" class="upload_preview" style="max-width: 200px; max-height: 200px; object-fit: contain; border-radius: 8px;">
      <p class="U_message" style="margin-top: 12px;">${file.name}</p>
      <p class="U_message2">다른 파일을 선택하려면 클릭하세요</p>
    `;
  };
  
  // 파일을 Data URL 형식으로 읽기 시작
  reader.readAsDataURL(file);
}

/**
 * Reset upload box UI
 */
function resetUploadBoxUI() {
  const uboxWrap = uploadBox.querySelector(".UBox_wrap");
  if (!uboxWrap) return;

  uboxWrap.innerHTML = `
    <img src="./img/fileicon.svg" alt="" class="U_icon">
    <p class="U_message">이미지 및 파일을 업로드하세요.</p>
    <p class="U_message2">
      파일을 드래그하거나 클릭하여 파일을 선택하세요.<br />
      지원 파일 형식: jpg, png, pdf
    </p>
  `;

  selectedFile = null;
}

// ============================================================================
// Analysis Handling
// ============================================================================

/**
 * 디자인 분석 시작 함수
 * 
 * 선택된 이미지 파일을 분석하기 위해 API를 호출하는 함수입니다.
 * 파일을 base64로 변환하고, 선택적 프롬프트와 함께 분석 요청을 보냅니다.
 * 
 * 처리 과정:
 * 1. 파일 선택 여부 확인
 * 2. 로딩 상태 표시
 * 3. 파일을 base64로 변환
 * 4. 프롬프트 입력값 가져오기 (선택사항)
 * 5. analyzeDesign API 호출
 * 6. 성공 시 분석 결과 페이지로 이동
 * 
 * @returns {Promise<void>}
 * 
 * @throws {Error} 파일이 선택되지 않은 경우
 * @throws {Error} API 호출 실패 시 (에러 핸들러가 처리)
 * 
 * @example
 * // 전송 버튼 클릭 시 호출
 * sendButton.addEventListener('click', () => {
 *   startAnalysis();
 * });
 */
async function startAnalysis() {
  // 파일 선택 여부 확인
  if (!selectedFile) {
    toast.warning("이미지를 먼저 선택해주세요");
    return;
  }

  try {
    // 로딩 상태 표시: 사용자에게 분석 진행 중임을 알림
    showLoading("디자인 분석 중...");

    // 파일을 base64 문자열로 변환
    // readFileAsBase64는 { data, mimeType, fileName } 객체를 반환
    const fileData = await readFileAsBase64(selectedFile);

    // 선택적 프롬프트 가져오기
    // 사용자가 입력한 프롬프트가 있으면 사용, 없으면 undefined
    const userPrompt = promptTextarea?.value?.trim() || undefined;

    // 분석 API 호출
    // analyzeDesign 함수는 에러 핸들링을 내부적으로 처리함
    const result = await analyzeDesign({
      imageData: fileData.data,      // base64 인코딩된 이미지 데이터
      mimeType: fileData.mimeType,   // 이미지 MIME 타입 (image/jpeg, image/png 등)
      fileName: fileData.fileName,   // 원본 파일명
      userPrompt,                    // 선택적 사용자 프롬프트
    });

    // 로딩 상태 숨김
    hideLoading();

    // 분석 성공 시
    if (result.success) {
      toast.success("분석 완료!");
      
      // 분석 결과 페이지로 이동
      // analysisId를 URL 파라미터로 전달하여 분석 결과를 로드
      navigateToAnalysis(result.analysisId);
    } else {
      toast.error("분석에 실패했습니다");
    }
  } catch (error) {
    hideLoading();
    console.error("[Upload] Analysis failed:", error);
    toast.error(error.message || "분석 중 오류가 발생했습니다");
  }
}

// ============================================================================
// History Modal
// ============================================================================

/**
 * Load and display analysis history
 */
async function loadAnalysisHistory() {
  try {
    const response = await getAnalyses({ limit: 10 });
    const history = adaptAnalysesResponse(response);

    renderHistoryModal(history.items);
  } catch (error) {
    console.error("[Upload] Failed to load history:", error);
    toast.error("히스토리를 불러오지 못했습니다");
  }
}

/**
 * Render history items in modal
 */
function renderHistoryModal(items) {
  const modalContent = promptModal?.querySelector(".modal-content");
  if (!modalContent) return;

  // Remove existing items (except close button)
  const existingItems = modalContent.querySelectorAll(".promptLi");
  existingItems.forEach((item) => item.remove());

  if (items.length === 0) {
    const emptyMsg = document.createElement("p");
    emptyMsg.className = "history-empty";
    emptyMsg.textContent = "분석 내역이 없습니다";
    emptyMsg.style.cssText = "text-align: center; color: #7C7895; padding: 20px;";
    modalContent.appendChild(emptyMsg);
    return;
  }

  items.forEach((item) => {
    const historyItem = document.createElement("div");
    historyItem.className = "promptLi";
    historyItem.innerHTML = `
      <div class="promptLiTextWrap">
        <p class="promptLiH1">이미지 분석 ('${item.fileName}')</p>
        <p class="promptLiDate">${item.createdAt}</p>
      </div>
      <button class="viewResultBtn" data-analysis-id="${item.id}">결과보기</button>
    `;

    // Add click handler
    const viewBtn = historyItem.querySelector(".viewResultBtn");
    viewBtn.addEventListener("click", () => {
      navigateToAnalysis(item.id);
    });

    modalContent.appendChild(historyItem);
  });
}

// ============================================================================
// Event Listeners
// ============================================================================

const unsubscribeFunctions = [];

function setupEventListeners() {
  let isProcessingFile = false;

  // Upload box click (but not if clicking directly on input)
  if (uploadBox) {
    const unsub = onClick(uploadBox, (e) => {
      // Don't trigger if clicking directly on the input element or if processing
      if (e.target === uploadInput || e.target.closest('.upload_input') || isProcessingFile) {
        return;
      }
      uploadInput?.click();
    });
    unsubscribeFunctions.push(unsub);
  }

  // Prevent input click from bubbling to uploadBox
  if (uploadInput) {
    const unsub = onClick(uploadInput, (e) => {
      e.stopPropagation();
      // Don't open dialog if already processing
      if (isProcessingFile) {
        e.preventDefault();
        return;
      }
    });
    unsubscribeFunctions.push(unsub);
  }

  // File input change
  if (uploadInput) {
    const unsub = onChange(uploadInput, (e) => {
      const file = e.target.files?.[0];
      if (file && !isProcessingFile) {
        isProcessingFile = true;
        handleFileSelect(file);
        // Reset input immediately after processing to allow same file selection again
        // This must be done synchronously, not in setTimeout
        e.target.value = "";
        // Reset flag after a short delay to prevent rapid clicks
        setTimeout(() => {
          isProcessingFile = false;
        }, 300);
      }
    });
    unsubscribeFunctions.push(unsub);
  }

  // Drag and drop
  if (uploadBox) {
    const unsub1 = addEventListener(uploadBox, "dragover", (e) => {
      e.preventDefault();
      uploadBox.classList.add("dragover");
    });
    unsubscribeFunctions.push(unsub1);

    const unsub2 = addEventListener(uploadBox, "dragleave", (e) => {
      e.preventDefault();
      uploadBox.classList.remove("dragover");
    });
    unsubscribeFunctions.push(unsub2);

    const unsub3 = addEventListener(uploadBox, "drop", (e) => {
      e.preventDefault();
      uploadBox.classList.remove("dragover");
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        handleFileSelect(file);
        // Reset input to allow same file selection again
        if (uploadInput) {
          uploadInput.value = "";
        }
      }
    });
    unsubscribeFunctions.push(unsub3);
  }

  // Send button (analyze)
  if (sendButton) {
    const unsub = onClick(sendButton, (e) => {
      e.preventDefault();
      startAnalysis();
    });
    unsubscribeFunctions.push(unsub);
  }

  // Enter key in prompt
  if (promptTextarea) {
    const unsub = onKeyDown(promptTextarea, (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        startAnalysis();
      }
    });
    unsubscribeFunctions.push(unsub);
  }

  // History modal
  if (promptMoreBtn) {
    const unsub = onClick(promptMoreBtn, () => {
      promptModal.style.display = "flex";
      loadAnalysisHistory();
    });
    unsubscribeFunctions.push(unsub);
  }

  if (closeModalBtn) {
    const unsub = onClick(closeModalBtn, () => {
      promptModal.style.display = "none";
    });
    unsubscribeFunctions.push(unsub);
  }

  if (promptModal) {
    const unsub = onClick(promptModal, (e) => {
      if (e.target === promptModal) {
        promptModal.style.display = "none";
      }
    });
    unsubscribeFunctions.push(unsub);
  }

  // Recommendation buttons
  document.querySelectorAll(".reco").forEach((btn) => {
    const unsub = onClick(btn, () => {
      const text = btn.textContent.trim();
      if (promptTextarea) {
        promptTextarea.value = text + " 분위기의 디자인으로 분석해주세요.";
        promptTextarea.focus();
      }
    });
    unsubscribeFunctions.push(unsub);
  });

  // Register cleanup callback
  registerCleanup(() => {
    unsubscribeFunctions.forEach((unsub) => unsub());
    unsubscribeFunctions.length = 0;
  });
}

// ============================================================================
// Drag & Drop Styles
// ============================================================================

const dragStyles = `
.uploadBox.dragover {
  border: 2px dashed #875CFF;
  background: rgba(135, 92, 255, 0.05);
}

.upload_preview {
  border: 1px solid #E7E2FF;
}
`;

const styleSheet = document.createElement("style");
styleSheet.textContent = dragStyles;
document.head.appendChild(styleSheet);

// ============================================================================
// Initialize
// ============================================================================

function init() {
  console.log("[Upload] Initializing upload page...");
  setupEventListeners();
}

// Wait for app initialization
window.addEventListener("dysapp:ready", init);

// Also try immediate init if already ready
if (window.dysapp?.initialized) {
  init();
}
