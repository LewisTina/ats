import { describe, it, expect } from "vitest";
import { compareResumeAnalyses } from "@/lib/analysis/comparator";
import type { ComparisonCandidate, SingleAnalysisResult } from "@/types";

describe("Multi-CV Comparator", () => {
  const dummyResult = (
    matchingTotal: number,
    atsTotal: number,
    blockingFails: string[]
  ): SingleAnalysisResult =>
    ({
      id: "res-1",
      createdAt: new Date().toISOString(),
      mode: "fast",
      targetPosition: "fullstack",
      resume: {
        rawText: "sample",
        fileName: "cv.pdf",
        fileType: "pdf",
        fileSizeBytes: 1000,
        sections: [],
        detectedSkills: [],
        contactInfo: {
          hasEmail: true,
          hasPhone: true,
          hasLocation: true,
          hasLinkedIn: true,
          hasGitHub: true,
        },
        extractionWarnings: [],
        isScannedOrEmpty: false,
      },
      job: {
        rawText: "job",
        targetPosition: "fullstack",
        requirements: [],
        languages: [],
      },
      atsScore: {
        extractionQuality: 35,
        structureSections: 25,
        readingOrder: 20,
        essentialContact: 20,
        total: atsTotal,
        ratingLabel: "Bonne",
      },
      atsDiagnostics: [],
      matchingScore: {
        technicalSkillsScore: 30,
        experienceSeniorityScore: 20,
        responsibilitiesScore: 15,
        methodologyContextScore: 8,
        otherRequirementsScore: 8,
        total: matchingTotal,
        confidenceScore: 90,
        ratingLabel: "Bonne",
        blockingRequirementsFailed: blockingFails,
      },
      requirementsMatches: [],
      confirmedSkills: [],
      partialSkills: [],
      missingSkills: [],
      recommendations: [],
      summary: {
        strengths: [],
        majorGaps: [],
        blockingAlerts: [],
        priorityActions: [],
        verificationsBeforeApplying: [],
      },
      aiEnriched: false,
    } as unknown as SingleAnalysisResult);

  it("prioritizes candidate with 0 blocking issues over one with higher raw score but missing mandatory criteria", () => {
    const candidates: ComparisonCandidate[] = [
      {
        id: "cand-1",
        label: "CV Front-End",
        fileName: "cv_front.pdf",
        result: dummyResult(85, 90, ["Node.js (Backend obligatoire)"]), // Higher score (85) but 1 blocking issue!
      },
      {
        id: "cand-2",
        label: "CV Full-Stack",
        fileName: "cv_fullstack.pdf",
        result: dummyResult(80, 92, []), // Slightly lower score (80) but 0 blocking issues!
      },
    ];

    const report = compareResumeAnalyses(candidates, "Tech Lead Full-Stack", "fullstack");

    // cand-2 must win because it has 0 blocking issues!
    expect(report.recommendedCandidateId).toBe("cand-2");
    expect(report.recommendationReason).toContain("CV Full-Stack");
    expect(report.recommendationReason).toContain("couvre l'ensemble des critères obligatoires");
  });
});

