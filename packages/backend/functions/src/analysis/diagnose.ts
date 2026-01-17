/**
 * FixScope Diagnosis Logic
 * Rule-based computation and LLM validation
 * Reference: docs/dysapp_PRD.md - Section 9.2, 15.11
 */

import {
  PerformanceMetrics,
  FormMetrics,
  FixScope,
  FixScopeValidationResult,
} from "../types";
import { THRESHOLDS } from "../constants";

/**
 * Compute fixScope based on Layer 1 and Layer 2 metrics
 * Core business logic for determining intervention level
 *
 * Priority Rules:
 * 1. Critical structural failure (L1 < 50) → StructureRebuild
 * 2. Scanability failure (< 50) → StructureRebuild
 * 3. Ambiguous case (50-60) → StructureRebuild (conservative)
 * 4. Structure OK but form needs work → DetailTuning
 */
export function computeFixScope(
  l1: PerformanceMetrics,
  l2: FormMetrics
): FixScope {
  // Rule 1: Critical structural failure
  // If hierarchy or goal clarity is critically low, structure needs rebuild
  if (
    l1.hierarchyScore < THRESHOLDS.HIERARCHY_CRITICAL ||
    l1.goalClarityScore < THRESHOLDS.GOAL_CLARITY_CRITICAL
  ) {
    return "StructureRebuild";
  }

  // Rule 2: Scanability failure
  // If users can't scan the design effectively, structure is broken
  if (l1.scanabilityScore < THRESHOLDS.SCANABILITY_CRITICAL) {
    return "StructureRebuild";
  }

  // Rule 3: Ambiguous case (50-60 range)
  // When hierarchy is borderline, default to rebuild for safety
  if (
    l1.hierarchyScore >= THRESHOLDS.HIERARCHY_AMBIGUOUS_LOW &&
    l1.hierarchyScore < THRESHOLDS.HIERARCHY_AMBIGUOUS_HIGH
  ) {
    return "StructureRebuild";
  }

  // Rule 4: Structure OK but form needs work
  // If hierarchy is solid but grid is weak, only tuning needed
  if (
    l1.hierarchyScore >= THRESHOLDS.HIERARCHY_AMBIGUOUS_HIGH &&
    l2.gridConsistency < THRESHOLDS.GRID_CONSISTENCY_LOW
  ) {
    return "DetailTuning";
  }

  // Default: Structure is solid, only details need attention
  return "DetailTuning";
}

/**
 * Validate LLM-suggested fixScope against rule-based computation
 * Returns validated fixScope and whether it was overridden
 */
export function validateFixScope(
  llmFixScope: FixScope,
  l1: PerformanceMetrics,
  l2: FormMetrics
): FixScopeValidationResult {
  const ruleFixScope = computeFixScope(l1, l2);

  if (llmFixScope !== ruleFixScope) {
    // Log discrepancy for analysis
    console.log(`[FixScope Override] LLM: ${llmFixScope}, Rule: ${ruleFixScope}`);
    console.log(`  L1 Scores: hierarchy=${l1.hierarchyScore}, scanability=${l1.scanabilityScore}, goalClarity=${l1.goalClarityScore}`);
    console.log(`  L2 Scores: grid=${l2.gridConsistency}`);

    return {
      fixScope: ruleFixScope,
      overridden: true,
      reason: `LLM suggested ${llmFixScope}, but rule-based analysis requires ${ruleFixScope}. ` +
        `Hierarchy: ${l1.hierarchyScore}, Scanability: ${l1.scanabilityScore}, Goal Clarity: ${l1.goalClarityScore}`,
    };
  }

  return {
    fixScope: llmFixScope,
    overridden: false,
  };
}

/**
 * Calculate Layer 1 average score
 */
export function calculateL1Average(l1: PerformanceMetrics): number {
  return Math.round(
    (l1.hierarchyScore + l1.scanabilityScore + l1.goalClarityScore) / 3
  );
}

/**
 * Calculate Layer 2 average score
 */
export function calculateL2Average(l2: FormMetrics): number {
  return Math.round(
    (l2.gridConsistency + l2.visualBalance + l2.colorHarmony + l2.typographyQuality) / 4
  );
}

/**
 * Calculate weighted overall score
 * L1: 50%, L2: 30%, L3: 20%
 * Note: L3 is qualitative, so we derive a numeric score from it
 */
export function calculateOverallScore(
  l1: PerformanceMetrics,
  l2: FormMetrics,
  l3TrustVibe: "High" | "Medium" | "Low",
  l3Engagement: "High" | "Medium" | "Low"
): number {
  const l1Avg = calculateL1Average(l1);
  const l2Avg = calculateL2Average(l2);

  // Convert L3 qualitative metrics to numeric
  const vibeScore = { High: 90, Medium: 65, Low: 40 }[l3TrustVibe];
  const engagementScore = { High: 90, Medium: 65, Low: 40 }[l3Engagement];
  const l3Avg = Math.round((vibeScore + engagementScore) / 2);

  // Weighted calculation
  const overall = Math.round(l1Avg * 0.5 + l2Avg * 0.3 + l3Avg * 0.2);

  return Math.max(0, Math.min(100, overall));
}

/**
 * Check if design has severe accessibility issues
 * 2+ accessibility flags = severe
 */
export function hasSevereAccessibilityIssues(l1: PerformanceMetrics): boolean {
  const flags = [
    l1.accessibility.lowContrast,
    l1.accessibility.tinyText,
    l1.accessibility.cluttered,
  ];

  const trueCount = flags.filter(Boolean).length;
  return trueCount >= 2;
}

/**
 * Generate diagnosis details for debugging/logging
 */
export function generateDiagnosisDetails(
  l1: PerformanceMetrics,
  l2: FormMetrics,
  fixScope: FixScope
): {
  l1Average: number;
  l2Average: number;
  criticalIssues: string[];
  recommendation: string;
} {
  const l1Average = calculateL1Average(l1);
  const l2Average = calculateL2Average(l2);
  const criticalIssues: string[] = [];

  // Identify critical issues
  if (l1.hierarchyScore < THRESHOLDS.HIERARCHY_CRITICAL) {
    criticalIssues.push(`Hierarchy score critically low (${l1.hierarchyScore})`);
  }
  if (l1.goalClarityScore < THRESHOLDS.GOAL_CLARITY_CRITICAL) {
    criticalIssues.push(`Goal clarity critically low (${l1.goalClarityScore})`);
  }
  if (l1.scanabilityScore < THRESHOLDS.SCANABILITY_CRITICAL) {
    criticalIssues.push(`Scanability critically low (${l1.scanabilityScore})`);
  }
  if (hasSevereAccessibilityIssues(l1)) {
    criticalIssues.push("Severe accessibility issues detected");
  }
  if (l2.gridConsistency < THRESHOLDS.GRID_CONSISTENCY_LOW) {
    criticalIssues.push(`Grid consistency needs improvement (${l2.gridConsistency})`);
  }

  // Generate recommendation
  let recommendation: string;
  if (fixScope === "StructureRebuild") {
    recommendation =
      "구조적 재설계가 필요합니다. " +
      "정보 계층 구조와 시각적 흐름을 재정립한 후 " +
      "미적 요소를 다듬으세요.";
  } else {
    recommendation =
      "기본 구조는 안정적입니다. " +
      "그리드 정렬, 색상 조화, 타이포그래피 등 " +
      "디테일을 개선하여 완성도를 높이세요.";
  }

  return {
    l1Average,
    l2Average,
    criticalIssues,
    recommendation,
  };
}
