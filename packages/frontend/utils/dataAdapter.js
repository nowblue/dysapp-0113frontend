/**
 * Data Adapter
 * Transforms API responses to UI-friendly formats
 * Reference: docs/dysapp_PRD.md - Section 11.3
 */

// ============================================================================
// Constants
// ============================================================================

const FORMAT_LABELS = {
  UX_UI: "UX/UI 디자인",
  Editorial: "에디토리얼",
  Poster: "포스터",
  Thumbnail: "썸네일",
  Card: "카드 디자인",
  BI_CI: "브랜드/CI",
  Unknown: "기타",
};

const FIX_SCOPE_LABELS = {
  StructureRebuild: "구조 재설계",
  DetailTuning: "디테일 튜닝",
};

const TRUST_VIBE_LABELS = {
  High: "높음",
  Medium: "보통",
  Low: "낮음",
};

const ENGAGEMENT_LABELS = {
  High: "높음",
  Medium: "보통",
  Low: "낮음",
};

const EMOTIONAL_TONE_LABELS = {
  Calm: "차분한",
  Energetic: "역동적인",
  Serious: "진지한",
  Playful: "장난스러운",
  Minimal: "미니멀한",
};

// ============================================================================
// Analysis Result Adapter
// ============================================================================

/**
 * Transform API analysis response to UI format
 * @param {Object} apiResponse - Raw API response from analyzeDesign
 * @returns {Object} UI-friendly analysis object
 */
export function adaptAnalysisResponse(apiResponse) {
  if (!apiResponse || !apiResponse.success) {
    return null;
  }

  return {
    // Metadata
    id: apiResponse.analysisId,
    imageUrl: apiResponse.imageUrl,

    // Classification
    format: {
      value: apiResponse.formatPrediction,
      label: FORMAT_LABELS[apiResponse.formatPrediction] || apiResponse.formatPrediction,
    },

    // Overall Score
    score: {
      value: apiResponse.overallScore,
      percentage: `${apiResponse.overallScore}%`,
      grade: getScoreGrade(apiResponse.overallScore),
    },

    // Fix Scope
    fixScope: {
      value: apiResponse.fixScope,
      label: FIX_SCOPE_LABELS[apiResponse.fixScope],
      isRebuild: apiResponse.fixScope === "StructureRebuild",
    },

    // Layer 1 Metrics
    layer1: adaptLayer1Metrics(apiResponse.layer1Metrics),

    // Layer 2 Metrics
    layer2: adaptLayer2Metrics(apiResponse.layer2Metrics),

    // Layer 3 Metrics
    layer3: adaptLayer3Metrics(apiResponse.layer3Metrics),

    // Color Palette
    colors: adaptColorPalette(apiResponse.colorPalette),

    // Keywords
    keywords: apiResponse.detectedKeywords || [],

    // Next Actions
    nextActions: apiResponse.nextActions || [],

    // Overall Analysis
    overallAnalysis: apiResponse.overallAnalysis || "",

    // Strengths & Weaknesses
    strengths: apiResponse.strengths || [],
    weaknesses: apiResponse.weaknesses || [],

    // Recognized Text (OCR)
    recognizedText: apiResponse.ocrText || apiResponse.recognizedText || "",
  };
}

/**
 * Adapt Layer 1 (Performance & Information) metrics
 */
function adaptLayer1Metrics(metrics) {
  if (!metrics) return null;

  const average = Math.round(
    (metrics.hierarchyScore + metrics.scanabilityScore + metrics.goalClarityScore) / 3
  );

  return {
    average,
    averagePercentage: `${average}%`,
    weight: "50%",

    hierarchy: {
      value: metrics.hierarchyScore,
      label: "시각적 계층",
      description: "헤드라인-본문-CTA 대비 명확성",
      status: getMetricStatus(metrics.hierarchyScore),
    },

    scanability: {
      value: metrics.scanabilityScore,
      label: "스캔 가능성",
      description: "정보 그룹핑 및 스캔 속도",
      status: getMetricStatus(metrics.scanabilityScore),
    },

    goalClarity: {
      value: metrics.goalClarityScore,
      label: "목적 명확성",
      description: "주제/행동 유도 인식",
      status: getMetricStatus(metrics.goalClarityScore),
    },

    accessibility: {
      lowContrast: metrics.accessibility?.lowContrast || false,
      tinyText: metrics.accessibility?.tinyText || false,
      cluttered: metrics.accessibility?.cluttered || false,
      issues: getAccessibilityIssues(metrics.accessibility),
    },

    diagnosis: metrics.diagnosisSummary || "",

    // Detailed analyses
    hierarchyAnalysis: metrics.hierarchyAnalysis || "",
    scanabilityAnalysis: metrics.scanabilityAnalysis || "",
    goalClarityAnalysis: metrics.goalClarityAnalysis || "",
  };
}

/**
 * Adapt Layer 2 (Form & Aesthetic) metrics
 */
function adaptLayer2Metrics(metrics) {
  if (!metrics) return null;

  const average = Math.round(
    (metrics.gridConsistency +
      metrics.visualBalance +
      metrics.colorHarmony +
      metrics.typographyQuality) /
      4
  );

  return {
    average,
    averagePercentage: `${average}%`,
    weight: "30%",

    grid: {
      value: metrics.gridConsistency,
      label: "그리드 일관성",
      description: "정렬 정확도",
      status: getMetricStatus(metrics.gridConsistency),
    },

    balance: {
      value: metrics.visualBalance,
      label: "시각적 균형",
      description: "기하학적 균형",
      status: getMetricStatus(metrics.visualBalance),
    },

    color: {
      value: metrics.colorHarmony,
      label: "색상 조화",
      description: "색채 이론 준수",
      status: getMetricStatus(metrics.colorHarmony),
    },

    typography: {
      value: metrics.typographyQuality,
      label: "타이포그래피",
      description: "폰트 선택 및 간격",
      status: getMetricStatus(metrics.typographyQuality),
    },

    // Detailed analyses
    gridAnalysis: metrics.gridAnalysis || "",
    balanceAnalysis: metrics.balanceAnalysis || "",
    colorAnalysis: metrics.colorAnalysis || "",
    typographyAnalysis: metrics.typographyAnalysis || "",
  };
}

/**
 * Adapt Layer 3 (Communicative Impact) metrics
 */
function adaptLayer3Metrics(metrics) {
  if (!metrics) return null;

  return {
    weight: "20%",

    trust: {
      value: metrics.trustVibe,
      label: TRUST_VIBE_LABELS[metrics.trustVibe],
      title: "신뢰도",
      description: "전문성/신뢰감 인상",
    },

    engagement: {
      value: metrics.engagementPotential,
      label: ENGAGEMENT_LABELS[metrics.engagementPotential],
      title: "참여도",
      description: "행동 유도 가능성",
    },

    tone: {
      value: metrics.emotionalTone,
      label: EMOTIONAL_TONE_LABELS[metrics.emotionalTone],
      title: "감성 톤",
      description: "전체적인 분위기",
    },

    // Detailed analyses
    trustAnalysis: metrics.trustAnalysis || "",
    engagementAnalysis: metrics.engagementAnalysis || "",
    emotionalAnalysis: metrics.emotionalAnalysis || "",
  };
}

/**
 * Adapt color palette
 */
function adaptColorPalette(colors) {
  if (!colors || !Array.isArray(colors)) return [];

  return colors.map((color, index) => ({
    hex: color.hex,
    name: color.approxName,
    ratio: color.usageRatio,
    percentage: `${Math.round(color.usageRatio * 100)}%`,
    isPrimary: index === 0,
  }));
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get score grade based on value
 */
function getScoreGrade(score) {
  if (score >= 90) return { grade: "A+", label: "우수" };
  if (score >= 80) return { grade: "A", label: "좋음" };
  if (score >= 70) return { grade: "B", label: "양호" };
  if (score >= 60) return { grade: "C", label: "보통" };
  if (score >= 50) return { grade: "D", label: "개선 필요" };
  return { grade: "F", label: "재설계 필요" };
}

/**
 * Get metric status based on value
 */
function getMetricStatus(value) {
  if (value >= 80) return { status: "good", label: "좋음", color: "#22c55e" };
  if (value >= 60) return { status: "moderate", label: "보통", color: "#eab308" };
  if (value >= 40) return { status: "warning", label: "주의", color: "#f97316" };
  return { status: "critical", label: "심각", color: "#ef4444" };
}

/**
 * Get accessibility issues list
 */
function getAccessibilityIssues(accessibility) {
  if (!accessibility) return [];

  const issues = [];
  if (accessibility.lowContrast) {
    issues.push({ type: "lowContrast", label: "저대비 문제", description: "WCAG AA 기준 미달" });
  }
  if (accessibility.tinyText) {
    issues.push({ type: "tinyText", label: "작은 텍스트", description: "12px 미만 텍스트" });
  }
  if (accessibility.cluttered) {
    issues.push({ type: "cluttered", label: "복잡함", description: "정보 과밀" });
  }
  return issues;
}

// ============================================================================
// Analysis History Adapter
// ============================================================================

/**
 * Adapt analysis list for history display
 * @param {Object} apiResponse - Response from getAnalyses
 * @returns {Object} Adapted history data
 */
export function adaptAnalysesResponse(apiResponse) {
  if (!apiResponse || !apiResponse.success) {
    return { items: [], total: 0, hasMore: false };
  }

  return {
    items: apiResponse.analyses.map((analysis) => ({
      id: analysis.id,
      fileName: analysis.fileName,
      imageUrl: analysis.imageUrl,
      format: {
        value: analysis.formatPrediction,
        label: FORMAT_LABELS[analysis.formatPrediction] || analysis.formatPrediction,
      },
      score: analysis.overallScore,
      scorePercentage: `${analysis.overallScore}%`,
      fixScope: {
        value: analysis.fixScope,
        label: FIX_SCOPE_LABELS[analysis.fixScope],
        isRebuild: analysis.fixScope === "StructureRebuild",
      },
      createdAt: formatDate(analysis.createdAt),
    })),
    total: apiResponse.total,
    hasMore: apiResponse.hasMore,
  };
}

// ============================================================================
// Search Results Adapter
// ============================================================================

/**
 * Adapt search results
 * @param {Object} apiResponse - Response from searchSimilar
 * @returns {Object} Adapted search results
 */
/**
 * Adapt text search response to UI format
 * @param {Object} apiResponse - Response from searchText
 * @returns {Object} UI-friendly search results
 */
export function adaptTextSearchResponse(apiResponse) {
  if (!apiResponse || !apiResponse.success || !apiResponse.results) {
    return { items: [], count: 0 };
  }

  const items = apiResponse.results.map((result) => ({
    id: result.id,
    imageUrl: result.imageUrl,
    fileName: result.fileName,
    format: {
      value: result.formatPrediction,
      label: FORMAT_LABELS[result.formatPrediction] || result.formatPrediction,
    },
    score: result.overallScore,
    fixScope: {
      value: result.fixScope,
      label: FIX_SCOPE_LABELS[result.fixScope],
      isRebuild: result.fixScope === "StructureRebuild",
    },
    similarityLabel: "텍스트 일치",
    ocrText: result.ocrText,
    relevanceScore: result.relevanceScore || 0,
  }));

  return {
    items,
    count: items.length,
  };
}

export function adaptSearchResponse(apiResponse) {
  if (!apiResponse || !apiResponse.success) {
    return { items: [], count: 0 };
  }

  return {
    items: apiResponse.results.map((result) => ({
      id: result.id,
      imageUrl: result.imageUrl,
      fileName: result.fileName,
      similarity: Math.round((1 - result.distance) * 100),
      similarityLabel: `${Math.round((1 - result.distance) * 100)}% 유사`,
      format: {
        value: result.formatPrediction,
        label: FORMAT_LABELS[result.formatPrediction] || result.formatPrediction,
      },
      score: result.overallScore,
      fixScope: {
        value: result.fixScope,
        label: FIX_SCOPE_LABELS[result.fixScope],
      },
    })),
    count: apiResponse.count,
  };
}

// ============================================================================
// User Profile Adapter
// ============================================================================

/**
 * Adapt user profile
 * @param {Object} apiResponse - Response from getUserProfile
 * @returns {Object} Adapted profile data
 */
export function adaptUserProfile(apiResponse) {
  if (!apiResponse || !apiResponse.success || !apiResponse.profile) {
    return null;
  }

  const profile = apiResponse.profile;

  return {
    uid: profile.uid,
    email: profile.email || "",
    displayName: profile.displayName || "익명 사용자",
    photoURL: profile.photoURL || null,
    phoneNumber: profile.phoneNumber || "",
    jobTitle: profile.jobTitle || "STUDENT",
    subscriptionTier: profile.subscriptionTier || "free",
    subscriptionLabel: getSubscriptionLabel(profile.subscriptionTier),
    analysisCount: profile.analysisCount || 0,
    createdAt: formatDate(profile.createdAt),
    preferences: profile.preferences || {},
    privacyConsent: profile.privacyConsent ? {
      consented: profile.privacyConsent.consented,
      version: profile.privacyConsent.version,
      agreedAt: formatDate(profile.privacyConsent.agreedAt),
    } : null,
  };
}

/**
 * Get subscription tier label
 */
function getSubscriptionLabel(tier) {
  const labels = {
    free: "무료",
    pro: "프로",
    enterprise: "기업",
  };
  return labels[tier] || "무료";
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format Firestore timestamp to readable date
 * @param {Object|Date|string} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  if (!timestamp) return "";

  let date;

  // Handle Firestore Timestamp
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp._seconds) {
    date = new Date(timestamp._seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) {
    return "";
  }

  // Format: YYYY-MM-DD HH:mm
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Format relative time (e.g., "2시간 전")
 * @param {Object|Date|string} timestamp
 * @returns {string}
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return "";

  let date;

  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp._seconds) {
    date = new Date(timestamp._seconds * 1000);
  } else {
    date = new Date(timestamp);
  }

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;

  return formatDate(timestamp);
}

// ============================================================================
// Export Constants for UI
// ============================================================================

export {
  FORMAT_LABELS,
  FIX_SCOPE_LABELS,
  TRUST_VIBE_LABELS,
  ENGAGEMENT_LABELS,
  EMOTIONAL_TONE_LABELS,
};
