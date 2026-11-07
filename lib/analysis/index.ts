import type {
  ParsedResume,
  SingleAnalysisResult,
  TargetPosition,
  AnalysisMode,
} from "@/types";
import { analyzeJobDescription, matchRequirements } from "./job-matcher";
import { evaluateATSReadability } from "./ats-checker";
import { calculateMatchingScore } from "./scoring";
import { generateRecommendationsAndSummary } from "./recommendations";

export function runDeterministicAnalysis(
  resume: ParsedResume,
  jobDescriptionText: string,
  targetPosition: TargetPosition = "general",
  mode: AnalysisMode = "fast"
): SingleAnalysisResult {
  const analyzedJob = analyzeJobDescription(jobDescriptionText, targetPosition);
  const { score: atsScore, diagnostics: atsDiagnostics } = evaluateATSReadability(resume);
  const requirementsMatches = matchRequirements(analyzedJob.requirements, resume);
  const matchingScore = calculateMatchingScore(requirementsMatches);
  const { recommendations, summary } = generateRecommendationsAndSummary(
    requirementsMatches,
    atsDiagnostics,
    analyzedJob,
    resume,
    targetPosition
  );

  const confirmedSkills = requirementsMatches
    .filter((m) => m.status === "confirmed")
    .map((m) => ({ name: m.requirementLabel, proof: m.proofInResume }));

  const partialSkills = requirementsMatches
    .filter((m) => m.status === "partial")
    .map((m) => ({ name: m.requirementLabel, comment: m.comment, proof: m.proofInResume }));

  const missingSkills = requirementsMatches
    .filter((m) => m.status === "missing")
    .map((m) => ({ name: m.requirementLabel, required: m.required }));

  return {
    id: `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    mode,
    targetPosition,
    resume,
    job: analyzedJob,
    atsScore,
    atsDiagnostics,
    matchingScore,
    requirementsMatches,
    confirmedSkills,
    partialSkills,
    missingSkills,
    recommendations,
    summary,
    aiEnriched: false,
  };
}
