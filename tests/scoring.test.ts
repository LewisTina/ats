import { describe, it, expect } from "vitest";
import { calculateMatchingScore, DEFAULT_SCORING_WEIGHTS } from "@/lib/analysis/scoring";
import type { RequirementMatch } from "@/types";

describe("Matching Scoring Engine", () => {
  it("gives 100/100 when all requirements are fully confirmed", () => {
    const perfectMatches: RequirementMatch[] = [
      {
        requirementId: "1",
        requirementLabel: "TypeScript",
        category: "technical_skill",
        required: true,
        status: "confirmed",
        comment: "OK",
        confidence: "high",
      },
      {
        requirementId: "2",
        requirementLabel: "React",
        category: "technical_skill",
        required: true,
        status: "confirmed",
        comment: "OK",
        confidence: "high",
      },
      {
        requirementId: "3",
        requirementLabel: "5 ans d'expérience",
        category: "experience_seniority",
        required: true,
        status: "confirmed",
        comment: "OK",
        confidence: "high",
      },
    ];

    const score = calculateMatchingScore(perfectMatches);
    expect(score.total).toBe(100);
    expect(score.blockingRequirementsFailed).toHaveLength(0);
  });

  it("caps and flags blocking requirements when mandatory skills are completely missing", () => {
    const failedMatches: RequirementMatch[] = [
      {
        requirementId: "1",
        requirementLabel: "TypeScript",
        category: "technical_skill",
        required: true,
        status: "confirmed",
        comment: "OK",
        confidence: "high",
      },
      {
        requirementId: "2",
        requirementLabel: "AWS",
        category: "technical_skill",
        required: true, // mandatory!
        status: "missing",
        comment: "Missing",
        confidence: "high",
      },
      {
        requirementId: "3",
        requirementLabel: "Kubernetes",
        category: "technical_skill",
        required: true, // mandatory!
        status: "missing",
        comment: "Missing",
        confidence: "high",
      },
      {
        requirementId: "4",
        requirementLabel: "Node.js",
        category: "technical_skill",
        required: true, // mandatory!
        status: "missing",
        comment: "Missing",
        confidence: "high",
      },
    ];

    const score = calculateMatchingScore(failedMatches);
    expect(score.blockingRequirementsFailed).toContain("AWS");
    expect(score.blockingRequirementsFailed).toContain("Kubernetes");
    expect(score.blockingRequirementsFailed).toContain("Node.js");
    // With 3 mandatory failures, score should be capped <= 60
    expect(score.total).toBeLessThanOrEqual(60);
  });
});
