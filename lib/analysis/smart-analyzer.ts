import type {
  ParsedResume,
  SingleAnalysisResult,
  TargetPosition,
  RequirementMatch,
  Recommendation,
} from "@/types";
import { runDeterministicAnalysis } from "./index";
import { getAIProvider } from "@/lib/ai/provider";
import { calculateMatchingScore } from "./scoring";

export async function runSmartOrFastAnalysis(
  resume: ParsedResume,
  jobDescriptionText: string,
  targetPosition: TargetPosition = "general",
  mode: "fast" | "smart" = "fast"
): Promise<SingleAnalysisResult> {
  // Always run deterministic base first
  const baseResult = runDeterministicAnalysis(
    resume,
    jobDescriptionText,
    targetPosition,
    mode
  );

  if (mode === "fast") {
    return baseResult;
  }

  // Smart mode
  const aiProvider = getAIProvider();

  if (!aiProvider.isConfigured()) {
    return {
      ...baseResult,
      mode: "smart",
      aiEnriched: false,
      aiErrorMessage: `Aucun fournisseur IA configuré (${aiProvider.name}). L'analyse déterministe locale a été exécutée. Configurez AI_API_KEY dans .env.local pour activer l'analyse sémantique.`,
    };
  }

  const aiResult = await aiProvider.analyze(
    resume.rawText,
    jobDescriptionText,
    targetPosition
  );

  if (!aiResult.success || !aiResult.data) {
    return {
      ...baseResult,
      mode: "smart",
      aiEnriched: false,
      aiErrorMessage: aiResult.error || "Impossible d'obtenir une analyse IA valide. Affichage des résultats déterministes.",
    };
  }

  const aiData = aiResult.data;

  // Merge AI insights with deterministic requirements
  const enrichedMatches: RequirementMatch[] = baseResult.requirementsMatches.map((detMatch) => {
    // Find matching AI requirement
    const aiItem = aiData.requirementsEvaluations.find(
      (ai) =>
        ai.label.toLowerCase() === detMatch.requirementLabel.toLowerCase() ||
        detMatch.requirementLabel.toLowerCase().includes(ai.label.toLowerCase()) ||
        ai.label.toLowerCase().includes(detMatch.requirementLabel.toLowerCase())
    );

    if (aiItem) {
      return {
        ...detMatch,
        status: aiItem.status,
        proofInResume: aiItem.proof || detMatch.proofInResume,
        comment: aiItem.explanation || detMatch.comment,
        confidence: aiItem.confidence,
        required: aiItem.required,
      };
    }
    return detMatch;
  });

  // Add any unique requirements discovered by AI that weren't in the basic regex list
  for (const aiItem of aiData.requirementsEvaluations) {
    const alreadyExists = enrichedMatches.some(
      (m) => m.requirementLabel.toLowerCase() === aiItem.label.toLowerCase()
    );
    if (!alreadyExists) {
      enrichedMatches.push({
        requirementId: `ai-req-${Math.random().toString(36).substring(2, 6)}`,
        requirementLabel: aiItem.label,
        category: "technical_skill",
        required: aiItem.required,
        status: aiItem.status,
        proofInResume: aiItem.proof,
        comment: aiItem.explanation,
        confidence: aiItem.confidence,
      });
    }
  }

  // Recalculate score deterministically from enriched matches (ensuring AI never invents arbitrary raw scores)
  const updatedMatchingScore = calculateMatchingScore(enrichedMatches);

  // Combine recommendations
  const aiRecs: Recommendation[] = aiData.contextualRecommendations.map((r, idx) => ({
    id: `ai-rec-${idx}`,
    title: r.title,
    issue: r.issue,
    relevanceToJob: r.relevanceToJob,
    suggestion: r.suggestion,
    priority: r.priority,
    category: "valorization",
  }));

  // Keep ATS fix recommendations from deterministic engine
  const atsRecs = baseResult.recommendations.filter((r) => r.category === "ats_fix");
  const mergedRecs = [...aiRecs, ...atsRecs].slice(0, 7);

  // Update confirmed / partial / missing lists
  const confirmedSkills = enrichedMatches
    .filter((m) => m.status === "confirmed")
    .map((m) => ({ name: m.requirementLabel, proof: m.proofInResume }));

  const partialSkills = enrichedMatches
    .filter((m) => m.status === "partial")
    .map((m) => ({ name: m.requirementLabel, comment: m.comment, proof: m.proofInResume }));

  const missingSkills = enrichedMatches
    .filter((m) => m.status === "missing")
    .map((m) => ({ name: m.requirementLabel, required: m.required }));

  return {
    ...baseResult,
    mode: "smart",
    job: {
      ...baseResult.job,
      title: aiData.jobTitle || baseResult.job.title,
    },
    matchingScore: updatedMatchingScore,
    requirementsMatches: enrichedMatches,
    confirmedSkills,
    partialSkills,
    missingSkills,
    recommendations: mergedRecs,
    summary: {
      strengths: aiData.executiveSummary.strengths.length > 0
        ? aiData.executiveSummary.strengths
        : baseResult.summary.strengths,
      majorGaps: aiData.executiveSummary.majorGaps.length > 0
        ? aiData.executiveSummary.majorGaps
        : baseResult.summary.majorGaps,
      blockingAlerts: aiData.executiveSummary.blockingAlerts.length > 0
        ? aiData.executiveSummary.blockingAlerts
        : baseResult.summary.blockingAlerts,
      priorityActions: aiData.executiveSummary.priorityActions.length > 0
        ? aiData.executiveSummary.priorityActions
        : baseResult.summary.priorityActions,
      verificationsBeforeApplying: baseResult.summary.verificationsBeforeApplying,
    },
    aiEnriched: true,
    aiProviderUsed: aiProvider.name,
  };
}

