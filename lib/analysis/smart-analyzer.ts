import type {
  ParsedResume,
  SingleAnalysisResult,
  RequirementMatch,
  Recommendation,
  RequirementCategory,
} from "@/types";
import { runDeterministicAnalysis } from "./index";
import { getAIProvider } from "@/lib/ai/provider";
import { calculateMatchingScore } from "./scoring";
import { estimateCandidateExperience } from "./job-matcher";

function isExperienceRequirementItem(label: string, category?: string): boolean {
  if (category === "experience_seniority") return true;
  return /(?:\b\d+\s*(?:[àa]|et|to|[-–—/])?\s*\d*\s*(?:ans?|ann[ée]es?|years?)\b|\bexp[ée]rience\b|\bs[ée]niorit[ée]\b)/i.test(
    label
  );
}

function inferCategoryFromLabel(label: string, explicitCategory?: RequirementCategory): RequirementCategory {
  if (explicitCategory) return explicitCategory;
  if (isExperienceRequirementItem(label)) return "experience_seniority";
  if (/\b(anglais|english|fran[çc]ais|french|langue)\b/i.test(label)) return "language";
  if (/\b(agile|scrum|kanban|tdd|ci\s*\/\s*cd|m[ée]thodolog)/i.test(label)) return "methodology";
  if (/\b(autonomie|rigueur|communication|esprit\s+d['’][ée]quipe|relationnel)\b/i.test(label)) {
    return "soft_skill";
  }
  return "technical_skill";
}

export async function runSmartOrFastAnalysis(
  resume: ParsedResume,
  jobDescriptionText: string,
  mode: "fast" | "smart" = "fast"
): Promise<SingleAnalysisResult> {
  // Always run deterministic base first
  const baseResult = runDeterministicAnalysis(
    resume,
    jobDescriptionText,
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

  const candidateExp = estimateCandidateExperience(resume);

  const aiResult = await aiProvider.analyze(
    resume.rawText,
    jobDescriptionText,
    {
      estimatedCandidateYears: candidateExp.years,
      candidateExperienceProof: candidateExp.proof,
      jobMinYears: baseResult.job.yearsOfExperienceRequired,
      jobMaxYears: baseResult.job.yearsOfExperienceMax,
    }
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
  const usedAiIndices = new Set<number>();

  // Merge AI insights with deterministic requirements
  const enrichedMatches: RequirementMatch[] = baseResult.requirementsMatches.map((detMatch) => {
    // Find matching AI requirement (including matching experience items even when labels differ)
    const aiIndex = aiData.requirementsEvaluations.findIndex((ai, idx) => {
      if (usedAiIndices.has(idx)) return false;
      if (
        detMatch.category === "experience_seniority" &&
        isExperienceRequirementItem(ai.label, ai.category)
      ) {
        return true;
      }
      const aiLow = ai.label.toLowerCase();
      const detLow = detMatch.requirementLabel.toLowerCase();
      return aiLow === detLow || detLow.includes(aiLow) || aiLow.includes(detLow);
    });

    if (aiIndex !== -1) {
      usedAiIndices.add(aiIndex);
      const aiItem = aiData.requirementsEvaluations[aiIndex];

      // Guardrail: if deterministic experience check confirmed the candidate meets the minimum
      // bound of an experience interval (e.g. 6 yrs for "5 à 7 ans"), never let an AI false-negative
      // downgrade it to "partial" or "missing".
      if (detMatch.category === "experience_seniority" && detMatch.status === "confirmed") {
        return {
          ...detMatch,
          status: "confirmed",
          proofInResume: detMatch.proofInResume || aiItem.proof,
          comment:
            aiItem.status === "confirmed" && aiItem.explanation
              ? aiItem.explanation
              : detMatch.comment,
          confidence: "high",
        };
      }

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

  const hasDeterministicExp = enrichedMatches.some(
    (m) => m.category === "experience_seniority"
  );

  // Add any unique requirements discovered by AI that weren't in the basic regex list
  aiData.requirementsEvaluations.forEach((aiItem, idx) => {
    if (usedAiIndices.has(idx)) return;

    const category = inferCategoryFromLabel(aiItem.label, aiItem.category);
    // Avoid duplicate experience requirement if deterministic engine already evaluated one
    if (category === "experience_seniority" && hasDeterministicExp) {
      return;
    }

    const alreadyExists = enrichedMatches.some(
      (m) => m.requirementLabel.toLowerCase() === aiItem.label.toLowerCase()
    );
    if (!alreadyExists) {
      enrichedMatches.push({
        requirementId: `ai-req-${Math.random().toString(36).substring(2, 6)}`,
        requirementLabel: aiItem.label,
        category,
        required: aiItem.required,
        status: aiItem.status,
        proofInResume: aiItem.proof,
        comment: aiItem.explanation,
        confidence: aiItem.confidence,
      });
    }
  });

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

  // Filter out any AI-generated majorGaps or blockingAlerts that falsely claim experience is insufficient when experience is confirmed
  const isExpConfirmed = enrichedMatches.some(
    (m) => m.category === "experience_seniority" && m.status === "confirmed"
  );
  const filterFalseExpClaims = (items: string[]) =>
    isExpConfirmed
      ? items.filter(
          (item) =>
            !/(?:\b\d+\s*(?:ans?|ann[ée]es?)\b.*\b(?:minimum|requis|exp[ée]rience)\b|\bexp[ée]rience\b.*\b(?:insuffisant|inf[ée]rieur|manquant|requis))/i.test(
              item
            )
        )
      : items;

  const filteredGaps = filterFalseExpClaims(aiData.executiveSummary.majorGaps);
  const filteredBlocking = filterFalseExpClaims(aiData.executiveSummary.blockingAlerts);

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
      majorGaps: filteredGaps.length > 0
        ? filteredGaps
        : baseResult.summary.majorGaps,
      blockingAlerts: filteredBlocking.length > 0
        ? filteredBlocking
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

