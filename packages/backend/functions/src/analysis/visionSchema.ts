/**
 * Gemini Vision Schema & System Instruction
 * Reference: docs/dysapp_PRD.md - Section 15.10
 */

import { SchemaType } from "@google/generative-ai";

/**
 * JSON Schema for Gemini Vision structured output
 * Enforces snake_case for LLM output
 */
export const DESIGN_ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    format_prediction: {
      type: SchemaType.STRING,
      enum: ["UX_UI", "Editorial", "Poster", "Thumbnail", "Card", "BI_CI", "Unknown"],
      description: "Predicted design format category",
    },
    layer1_performance: {
      type: SchemaType.OBJECT,
      properties: {
        hierarchy_score: {
          type: SchemaType.INTEGER,
          description: "Visual hierarchy clarity score (0-100)",
        },
        scanability_score: {
          type: SchemaType.INTEGER,
          description: "Information grouping and scan speed score (0-100)",
        },
        goal_clarity_score: {
          type: SchemaType.INTEGER,
          description: "Topic/action recognition clarity score (0-100)",
        },
        accessibility: {
          type: SchemaType.OBJECT,
          properties: {
            low_contrast: {
              type: SchemaType.BOOLEAN,
              description: "Whether design has WCAG AA contrast issues",
            },
            tiny_text: {
              type: SchemaType.BOOLEAN,
              description: "Whether design has text smaller than 12px",
            },
            cluttered: {
              type: SchemaType.BOOLEAN,
              description: "Whether design has information overload",
            },
          },
          required: ["low_contrast", "tiny_text", "cluttered"],
        },
        diagnosis_summary: {
          type: SchemaType.STRING,
          description: "Comprehensive structural diagnosis in Korean (3-5 sentences). Must include specific issues, their impact, and why they matter. Be detailed and insightful.",
        },
        hierarchy_analysis: {
          type: SchemaType.STRING,
          description: "Detailed analysis of visual hierarchy in Korean (2-3 sentences). Explain what works well, what doesn't, and specific visual elements that create or break hierarchy.",
        },
        scanability_analysis: {
          type: SchemaType.STRING,
          description: "Detailed analysis of information scanability in Korean (2-3 sentences). Explain how information is grouped, visual flow, and ease of finding key information.",
        },
        goal_clarity_analysis: {
          type: SchemaType.STRING,
          description: "Detailed analysis of goal clarity in Korean (2-3 sentences). Explain how clear the purpose is, what makes it clear/unclear, and specific elements that help or hinder understanding.",
        },
      },
      required: ["hierarchy_score", "scanability_score", "goal_clarity_score", "accessibility", "diagnosis_summary", "hierarchy_analysis", "scanability_analysis", "goal_clarity_analysis"],
    },
    layer2_form: {
      type: SchemaType.OBJECT,
      properties: {
        grid_consistency: {
          type: SchemaType.INTEGER,
          description: "Grid alignment accuracy score (0-100)",
        },
        visual_balance: {
          type: SchemaType.INTEGER,
          description: "Geometric equilibrium score (0-100)",
        },
        color_harmony: {
          type: SchemaType.INTEGER,
          description: "Color theory adherence score (0-100)",
        },
        typography_quality: {
          type: SchemaType.INTEGER,
          description: "Font choice and spacing quality score (0-100)",
        },
        grid_analysis: {
          type: SchemaType.STRING,
          description: "Detailed analysis of grid consistency in Korean (2-3 sentences). Explain alignment issues, grid system usage, and visual organization.",
        },
        balance_analysis: {
          type: SchemaType.STRING,
          description: "Detailed analysis of visual balance in Korean (2-3 sentences). Explain weight distribution, symmetry/asymmetry, and compositional balance.",
        },
        color_analysis: {
          type: SchemaType.STRING,
          description: "Detailed analysis of color harmony in Korean (2-3 sentences). Explain color relationships, harmony principles used, and emotional impact of color choices.",
        },
        typography_analysis: {
          type: SchemaType.STRING,
          description: "Detailed analysis of typography quality in Korean (2-3 sentences). Explain font choices, hierarchy, readability, and typographic principles.",
        },
      },
      required: ["grid_consistency", "visual_balance", "color_harmony", "typography_quality", "grid_analysis", "balance_analysis", "color_analysis", "typography_analysis"],
    },
    layer3_communicative: {
      type: SchemaType.OBJECT,
      properties: {
        trust_vibe: {
          type: SchemaType.STRING,
          enum: ["High", "Medium", "Low"],
          description: "Professionalism and trust impression",
        },
        engagement_potential: {
          type: SchemaType.STRING,
          enum: ["High", "Medium", "Low"],
          description: "Call-to-action effectiveness potential",
        },
        emotional_tone: {
          type: SchemaType.STRING,
          enum: ["Calm", "Energetic", "Serious", "Playful", "Minimal"],
          description: "Overall emotional atmosphere",
        },
        trust_analysis: {
          type: SchemaType.STRING,
          description: "Detailed analysis of trust and professionalism in Korean (2-3 sentences). Explain what creates or undermines trust, visual cues, and professional impression.",
        },
        engagement_analysis: {
          type: SchemaType.STRING,
          description: "Detailed analysis of engagement potential in Korean (2-3 sentences). Explain call-to-action effectiveness, visual hooks, and elements that encourage interaction.",
        },
        emotional_analysis: {
          type: SchemaType.STRING,
          description: "Detailed analysis of emotional tone in Korean (2-3 sentences). Explain how the design conveys emotion, mood, and atmosphere through visual elements.",
        },
      },
      required: ["trust_vibe", "engagement_potential", "emotional_tone", "trust_analysis", "engagement_analysis", "emotional_analysis"],
    },
    overall_score: {
      type: SchemaType.INTEGER,
      description: "Weighted overall design score (0-100). Layer1: 50%, Layer2: 30%, Layer3: 20%",
    },
    fix_scope: {
      type: SchemaType.STRING,
      enum: ["StructureRebuild", "DetailTuning"],
      description: "Recommended fix approach. StructureRebuild if Layer1 avg < 60",
    },
    color_palette: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          hex: {
            type: SchemaType.STRING,
            description: "Hex color code (e.g., #FF5733)",
          },
          approx_name: {
            type: SchemaType.STRING,
            description: "Approximate color name (e.g., Coral Red)",
          },
          usage_ratio: {
            type: SchemaType.NUMBER,
            description: "Estimated usage ratio (0.0-1.0)",
          },
        },
        required: ["hex", "approx_name", "usage_ratio"],
      },
      description: "Top 5 dominant colors in the design",
    },
    detected_keywords: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Key visual/textual elements detected (max 20)",
    },
    next_actions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Specific, actionable improvement suggestions in Korean (5-7 items). Each should be detailed, concrete, and include why it matters. Format: 'What to do' + 'How to do it' + 'Why it helps'",
    },
    strengths: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Design strengths and what works well in Korean (3-5 items). Be specific about visual elements, principles, and effective choices.",
    },
    weaknesses: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Design weaknesses and areas for improvement in Korean (3-5 items). Be specific about issues, their impact, and why they matter.",
    },
    overall_analysis: {
      type: SchemaType.STRING,
      description: "Comprehensive overall analysis in Korean (5-7 sentences). Must include: summary of key findings, major strengths and weaknesses, design quality assessment, target audience fit, and overall impression. Be insightful and professional.",
    },
    rag_search_queries: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Suggested search queries for finding relevant design guidelines",
    },
    recognized_text: {
      type: SchemaType.STRING,
      description: "All text content extracted from the image via OCR. Include all visible text, labels, headings, body text, etc. Preserve line breaks and structure. If no text is found, return empty string.",
    },
  },
  required: [
    "format_prediction",
    "layer1_performance",
    "layer2_form",
    "layer3_communicative",
    "overall_score",
    "fix_scope",
    "color_palette",
    "detected_keywords",
    "next_actions",
    "strengths",
    "weaknesses",
    "overall_analysis",
    "rag_search_queries",
    "recognized_text",
  ],
};

/**
 * System instruction for Vision analysis
 * Guides Gemini to perform 3-Layer design evaluation
 */
export const VISION_SYSTEM_INSTRUCTION = `
**Role:**
You are the "dysapp Design Tutor," an expert AI utilizing Modernist Design Theory (Bauhaus, Swiss Style) and Information Design principles to critique visual works.

**Task:**
Analyze the provided image based on the "3-Layer Design Evaluation Framework" and return the result strictly as a JSON object matching the provided schema.

**Evaluation Framework:**

**Layer 1: Performance & Information (Weight: 50%)**
Evaluates functional effectiveness:
- hierarchy_score: Visual hierarchy clarity - Is there a clear focal point? Are headline/body/CTA properly contrasted? (0-100)
- scanability_score: Information grouping and scan speed - Can users quickly find what they need? (0-100)
- goal_clarity_score: Topic/action recognition - Is the purpose immediately clear? (0-100)
- accessibility: Check for low_contrast (WCAG AA failure), tiny_text (<12px), cluttered (information overload)
- diagnosis_summary: Comprehensive structural diagnosis (1-3 sentences in Korean). Must clearly state the core structural issue, its impact on user experience, and priority. Format: "핵심 원인 → 영향 → 우선순위". Be concise but insightful.
- hierarchy_analysis: Detailed analysis of visual hierarchy (2-3 sentences in Korean). Explain what works well, what doesn't, and specific visual elements that create or break hierarchy.
- scanability_analysis: Detailed analysis of information scanability (2-3 sentences in Korean). Explain how information is grouped, visual flow, and ease of finding key information.
- goal_clarity_analysis: Detailed analysis of goal clarity (2-3 sentences in Korean). Explain how clear the purpose is, what makes it clear/unclear, and specific elements that help or hinder understanding.

**Layer 2: Aesthetic & Form (Weight: 30%)**
Evaluates visual quality:
- grid_consistency: Alignment accuracy - Are elements properly aligned to a grid system? (0-100)
- visual_balance: Geometric equilibrium - Is weight distributed properly? (0-100)
- color_harmony: Color theory adherence - Do colors work well together? (0-100)
- typography_quality: Font choice, pairing, spacing quality (0-100)
- grid_analysis: Detailed analysis of grid consistency (2-3 sentences in Korean). Explain alignment issues, grid system usage, and visual organization.
- balance_analysis: Detailed analysis of visual balance (2-3 sentences in Korean). Explain weight distribution, symmetry/asymmetry, and compositional balance.
- color_analysis: Detailed analysis of color harmony (2-3 sentences in Korean). Explain color relationships, harmony principles used, and emotional impact of color choices.
- typography_analysis: Detailed analysis of typography quality (2-3 sentences in Korean). Explain font choices, hierarchy, readability, and typographic principles.

**Layer 3: Communicative Impact (Weight: 20%)**
Evaluates impression and engagement:
- trust_vibe: Does it look professional? (High/Medium/Low)
- engagement_potential: Will users take action? (High/Medium/Low)
- emotional_tone: Overall mood (Calm/Energetic/Serious/Playful/Minimal)
- trust_analysis: Detailed analysis of trust and professionalism (2-3 sentences in Korean). Explain what creates or undermines trust, visual cues, and professional impression.
- engagement_analysis: Detailed analysis of engagement potential (2-3 sentences in Korean). Explain call-to-action effectiveness, visual hooks, and elements that encourage interaction.
- emotional_analysis: Detailed analysis of emotional tone (2-3 sentences in Korean). Explain how the design conveys emotion, mood, and atmosphere through visual elements.

**Scoring Guidelines:**
1. Average good professional work should score around 70-75
2. Don't give 90+ scores easily - reserve for exceptional work
3. Be specific and detailed in all analysis fields - point to exact visual elements, explain why they work or don't work
4. Provide insightful, professional analysis that helps designers understand both strengths and weaknesses
5. Use design terminology and principles (e.g., Gestalt principles, color theory, typography rules)
6. Be concrete and specific - avoid vague statements

**Analysis Quality Requirements:**
- All analysis fields must be detailed, insightful, and professional
- Explain the "why" behind scores, not just the "what"
- Reference specific visual elements in the design
- Use design principles and theory to support your analysis
- Be constructive - explain how improvements would help
- diagnosis_summary: 1-3 sentences covering core structural issue, impact, and priority (핵심 원인 → 영향 → 우선순위)
- Each metric analysis: 2-3 sentences explaining what works/doesn't work and why
- overall_analysis: 5-7 sentences providing comprehensive assessment including key findings, strengths, weaknesses, quality assessment, target audience fit, and overall impression
- strengths: 3-5 specific items about what works well and why
- weaknesses: 3-5 specific items about issues, their impact, and why they matter
- next_actions: 3-5 detailed, actionable suggestions in format: "무엇을 할 것인가 + 어떻게 할 것인가 + 왜 도움이 되는가". Include specific steps and design principle references.

**fix_scope Decision Rules:**
- "StructureRebuild" if:
  - hierarchy_score < 50
  - goal_clarity_score < 50
  - scanability_score < 50
  - hierarchy_score is between 50-60 (ambiguous range)
- "DetailTuning" if:
  - hierarchy_score >= 60 AND structure is sound
  - Only aesthetic refinements needed

**Output Rules:**
1. Return ONLY valid JSON - no markdown, no explanatory text
2. All scores must be integers 0-100
3. color_palette: Extract 3-5 dominant colors with accurate usage ratios
4. next_actions: Provide 3-5 detailed, actionable improvement suggestions in Korean. Each must follow this format: "무엇을 할 것인가 + 어떻게 할 것인가 + 왜 도움이 되는가". Be specific with concrete steps and design principle references.
5. strengths: Provide 3-5 specific strengths in Korean, explaining what works well and why
6. weaknesses: Provide 3-5 specific weaknesses in Korean, explaining issues, their impact, and why they matter
7. overall_analysis: Provide comprehensive 5-7 sentence analysis in Korean covering key findings, strengths, weaknesses, quality assessment, target audience fit, and overall impression
8. All analysis fields must be in Korean and be detailed, insightful, and professional
9. rag_search_queries: Suggest 3-5 design principle search terms
10. Be thorough - this is a professional design critique report, not a brief summary

**Special Cases:**
- If no text is present, evaluate typography_quality based on potential text placement
- For abstract art without clear hierarchy, evaluate based on compositional principles
- For incomplete/draft designs, score based on current state, not potential

**OCR Text Extraction:**
- Extract ALL visible text from the image using OCR capabilities
- Include headings, body text, labels, captions, buttons, navigation items, etc.
- Preserve line breaks and basic structure where possible
- If no text is found, return empty string for recognized_text
- This text will be used for search functionality, so accuracy is important
`;

/**
 * Function declaration schema for Gemini API
 * (Alternative approach using function calling)
 */
export const ANALYSIS_FUNCTION_DECLARATION = {
  name: "analyze_design",
  description: "Analyze a design image and return structured evaluation results",
  parameters: DESIGN_ANALYSIS_SCHEMA as any,
};
