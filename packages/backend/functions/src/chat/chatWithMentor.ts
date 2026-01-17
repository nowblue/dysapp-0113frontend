/**
 * chatWithMentor Cloud Function
 * AI Design Tutor with fixScope-aware responses
 * Reference: docs/dysapp_PRD.md - Section 8.1 (FR-002), 10.1-10.4
 */

import * as functions from "firebase-functions/v2";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CHAT_MODEL,
  CHAT_CONFIG,
  FUNCTIONS_REGION,
  COLLECTIONS,
  TIMEOUTS,
  MEMORY,
  LIMITS,
  FIRESTORE_DATABASE_ID,
} from "../constants";
import {
  ChatRequest,
  ChatResponse,
  AnalysisDocument,
  ChatSessionDocument,
  ChatMessage,
} from "../types";
import { checkRateLimit } from "../utils/rateLimiter";
import {
  validateChatMessage,
  validateAnalysisId,
  validateSessionId,
} from "../utils/validation";
import { handleError } from "../utils/errorHandler";
import { getValidatedApiKey } from "../utils/envValidation";

const db = getFirestore(FIRESTORE_DATABASE_ID);

/**
 * Build system instruction based on analysis context
 */
function buildSystemInstruction(analysis: AnalysisDocument): string {
  const fixScopeKorean =
    analysis.fixScope === "StructureRebuild" ? "구조 재설계" : "디테일 튜닝";

  return `
You are dysapp's AI Design Tutor - an expert design mentor who provides practical, actionable advice.

**Current Design Analysis Context:**
- Format: ${analysis.formatPrediction}
- Overall Score: ${analysis.overallScore}/100
- FixScope: ${analysis.fixScope} (${fixScopeKorean})

**Layer 1 (Structure - 50%):**
- Hierarchy Score: ${analysis.layer1Metrics.hierarchyScore}
- Scanability Score: ${analysis.layer1Metrics.scanabilityScore}
- Goal Clarity Score: ${analysis.layer1Metrics.goalClarityScore}
- Diagnosis: ${analysis.layer1Metrics.diagnosisSummary}
- Accessibility Issues: ${[
    analysis.layer1Metrics.accessibility.lowContrast && "저대비",
    analysis.layer1Metrics.accessibility.tinyText && "작은텍스트",
    analysis.layer1Metrics.accessibility.cluttered && "복잡함",
  ]
    .filter(Boolean)
    .join(", ") || "없음"}

**Layer 2 (Form - 30%):**
- Grid Consistency: ${analysis.layer2Metrics.gridConsistency}
- Visual Balance: ${analysis.layer2Metrics.visualBalance}
- Color Harmony: ${analysis.layer2Metrics.colorHarmony}
- Typography Quality: ${analysis.layer2Metrics.typographyQuality}

**Layer 3 (Impact - 20%):**
- Trust Vibe: ${analysis.layer3Metrics.trustVibe}
- Engagement Potential: ${analysis.layer3Metrics.engagementPotential}
- Emotional Tone: ${analysis.layer3Metrics.emotionalTone}

**Recommended Actions from Analysis:**
${analysis.nextActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}

**Response Guidelines based on FixScope:**

${
  analysis.fixScope === "StructureRebuild"
    ? `
[StructureRebuild Mode - 구조 재설계 우선]
**응답 포맷 (반드시 이 순서를 따르세요):**

1. **시작 문구 (필수)**: "현재 디자인은 '구조 재설계'가 필요합니다."

2. **Layer 1 문제점 구체 진단**:
   - diagnosisSummary를 활용하여 핵심 구조적 문제를 명확히 설명하세요
   - hierarchy, scanability, goalClarity 점수가 낮은 이유를 구체적으로 지적하세요
   - 접근성 이슈(저대비, 작은텍스트, 복잡함)가 있다면 그 영향도 설명하세요

3. **구조 개선 액션 3가지**:
   - nextActions에서 Layer 1 관련 항목만 선택하여 제시하세요
   - 각 액션은 "무엇을 → 어떻게 → 왜" 형식으로 구체적으로 설명하세요
   - 단계별로 우선순위를 명시하세요

4. **마무리 문구 (필수)**: "구조가 개선되면 Layer 2 미적 요소를 다듬을 수 있습니다."

**절대 금지 (이 모드에서는 언급하지 마세요):**
- Layer 2 개선 제안 (그리드, 색상, 폰트, 타이포그래피 등)
- Layer 3 개선 제안 (신뢰도, 참여도, 감성적 톤 등)
- "예쁘게 만들기", "깔끔하게 정리하기" 등의 표현적 조언
- 구조 문제를 무시한 미적 개선 제안
- 색상 팔레트 변경, 폰트 변경 등 디테일 튜닝 관련 내용

**검증**: 응답 전에 Layer 2-3 관련 단어(색상, 폰트, 그리드, 색, 타이포, 균형, 신뢰, 참여, 감성 등)가 포함되어 있지 않은지 확인하세요.
`
    : `
[DetailTuning Mode - 디테일 튜닝 모드]
**응답 포맷 (반드시 이 순서를 따르세요):**

1. **시작 문구 (필수)**: "현재 디자인의 구조는 안정적입니다. '디테일 튜닝'을 통해 완성도를 높일 수 있습니다."

2. **Layer 2 개선 포인트**:
   - gridConsistency, visualBalance, colorHarmony, typographyQuality 중 낮은 점수를 구체적으로 개선하세요
   - 각 메트릭에 대해 "무엇을 → 어떻게 → 왜" 형식으로 제안하세요
   - 구체적 수치 기반 조언을 포함하세요 (예: "여백을 20% 더 확보하세요", "그리드 간격을 8px로 통일하세요")

3. **Layer 3 인상 개선 제안**:
   - trustVibe, engagementPotential, emotionalTone 관점에서 개선 방안을 제시하세요
   - 브랜딩/인상 개선을 위한 구체적 조언을 포함하세요

4. **허용되는 제안**:
   - 색상 팔레트 조정 제안
   - 타이포그래피 개선 제안 (폰트 선택, 크기, 간격)
   - 감성적 톤 조정 제안
   - 그리드 정렬 개선
   - 시각적 균형 조정

**주의**: Layer 1 구조 문제를 언급하지 마세요. 구조는 이미 안정적이라고 가정합니다.
`
}

**일반 규칙 (모든 모드 공통):**
1. 항상 한국어(존댓말)로 답변하세요.
2. 간결하고 명확하게 답변하세요. 불필요한 서론은 생략하세요.
3. 사용자가 바로 적용할 수 있는 구체적인 수정 제안을 제시하세요.
4. 각 제안에는 "왜" 그렇게 해야 하는지 Layer 1-3 기준으로 설명하세요.
5. 디자인 원칙을 인용할 때는 출처를 간단히 언급하세요 (예: "게슈탈트 원칙에 따르면...", "정보디자인 이론에 따르면...").
6. 진짜 튜터처럼 친절하지만 전문적으로 답변하세요. 사용자가 디자인을 개선할 수 있도록 실용적인 조언을 제공하세요.
7. 응답은 4단 구조(시작 → 진단/개선점 → 액션 → 마무리)를 반드시 따르세요.
`;
}

/**
 * Get or create chat session
 */
async function getOrCreateSession(
  userId: string,
  analysisId: string,
  sessionId?: string
): Promise<{ sessionId: string; history: ChatMessage[] }> {
  if (sessionId) {
    // Load existing session
    const sessionDoc = await db
      .collection(COLLECTIONS.CHAT_SESSIONS)
      .doc(sessionId)
      .get();

    if (sessionDoc.exists) {
      const sessionData = sessionDoc.data() as ChatSessionDocument;

      // Verify ownership
      if (sessionData.userId !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Not your chat session"
        );
      }

      // Load message history
      const messagesSnapshot = await db
        .collection(COLLECTIONS.CHAT_SESSIONS)
        .doc(sessionId)
        .collection("messages")
        .orderBy("timestamp", "asc")
        .limit(LIMITS.MAX_CHAT_HISTORY)
        .get();

      const history: ChatMessage[] = messagesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          role: data.role,
          content: data.content,
          timestamp: data.timestamp,
        };
      });

      return { sessionId, history };
    }
  }

  // Create new session
  const newSession: ChatSessionDocument = {
    userId,
    analysisId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    messageCount: 0,
  };

  const newSessionRef = await db
    .collection(COLLECTIONS.CHAT_SESSIONS)
    .add(newSession);

  return { sessionId: newSessionRef.id, history: [] };
}

/**
 * Save message to session
 */
async function saveMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const message: ChatMessage = {
    role,
    content,
    timestamp: FieldValue.serverTimestamp(),
  };

  await db
    .collection(COLLECTIONS.CHAT_SESSIONS)
    .doc(sessionId)
    .collection("messages")
    .add(message);

  // Update session metadata
  await db
    .collection(COLLECTIONS.CHAT_SESSIONS)
    .doc(sessionId)
    .update({
      updatedAt: FieldValue.serverTimestamp(),
      messageCount: FieldValue.increment(1),
    });
}

/**
 * Main chatWithMentor function handler
 */
export async function chatWithMentorHandler(
  request: functions.https.CallableRequest<ChatRequest>
): Promise<ChatResponse> {
  // 1. Auth check
  if (!request.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required"
    );
  }

  const userId = request.auth.uid;
  const data = request.data;

  // 2. Rate limiting check
  if (!checkRateLimit(userId, "CHAT_WITH_MENTOR")) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      "Rate limit exceeded. Please try again later."
    );
  }

  // 3. Validate input
  const { analysisId, message, sessionId: inputSessionId } = data;

  if (!analysisId || !message) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing analysisId or message"
    );
  }

  // Validate analysis ID format
  if (!validateAnalysisId(analysisId)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid analysisId format"
    );
  }

  // Validate session ID if provided
  if (inputSessionId && !validateSessionId(inputSessionId)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid sessionId format"
    );
  }

  // Validate and sanitize message
  const messageValidation = validateChatMessage(message);
  if (!messageValidation.valid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      messageValidation.error || "Invalid message"
    );
  }

  const sanitizedMessage = messageValidation.sanitized!;

  try {
    console.log(
      `[chatWithMentor] User ${userId}, Analysis ${analysisId}, Message length: ${sanitizedMessage.length}`
    );

    // 3. Load analysis document
    const analysisDoc = await db
      .collection(COLLECTIONS.ANALYSES)
      .doc(analysisId)
      .get();

    if (!analysisDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Analysis not found");
    }

    const analysis = analysisDoc.data() as AnalysisDocument;

    // 4. Verify ownership
    if (analysis.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Not your analysis"
      );
    }

    // 5. Get or create chat session
    const { sessionId, history } = await getOrCreateSession(
      userId,
      analysisId,
      inputSessionId
    );

    // 6. Build system instruction
    const systemInstruction = buildSystemInstruction(analysis);

    // 7. Prepare chat history for Gemini
    const chatHistory = history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // 8. Generate response using Gemini
    let apiKey: string;
    try {
      apiKey = getValidatedApiKey();
    } catch (error) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Gemini API key not configured or invalid"
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: CHAT_MODEL,
      systemInstruction,
      generationConfig: CHAT_CONFIG,
    });

    const chat = model.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessage(sanitizedMessage);
    const response = result.response.text();

    // 디버깅: 응답 길이 확인
    console.log(`[chatWithMentor] Response length: ${response.length} characters`);
    if (response.length > 3000) {
      console.log(`[chatWithMentor] Long response detected: ${response.substring(0, 100)}...`);
    }

    // 응답이 잘렸는지 확인 (Gemini API는 finishReason을 제공)
    const finishReason = result.response.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      console.warn(`[chatWithMentor] Response truncated due to MAX_TOKENS limit`);
    } else if (finishReason) {
      console.log(`[chatWithMentor] Finish reason: ${finishReason}`);
    }

    // 9. Save messages to session (use sanitized message)
    await saveMessage(sessionId, "user", sanitizedMessage);
    await saveMessage(sessionId, "assistant", response);

    console.log(
      `[chatWithMentor] Response generated for session ${sessionId}`
    );

    return {
      success: true,
      sessionId,
      response,
    };
  } catch (error) {
    throw handleError(error, "chatWithMentor", userId);
  }
}

/**
 * Export the Cloud Function
 */
export const chatWithMentor = functions.https.onCall(
  {
    region: FUNCTIONS_REGION,
    timeoutSeconds: TIMEOUTS.CHAT_WITH_MENTOR,
    memory: MEMORY.CHAT_WITH_MENTOR,
  },
  chatWithMentorHandler
);
