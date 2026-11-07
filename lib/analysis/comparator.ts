import type {
  ComparisonCandidate,
  ComparisonReport,
  TargetPosition,
} from "@/types";

export function compareResumeAnalyses(
  candidates: ComparisonCandidate[],
  jobTitle: string,
  targetPosition: TargetPosition
): ComparisonReport {
  if (candidates.length === 0) {
    return {
      jobTitle,
      targetPosition,
      candidates: [],
      recommendedCandidateId: "",
      recommendationReason: "Aucun CV fourni pour la comparaison.",
      comparisonHighlights: [],
    };
  }

  // Rank candidates
  const scored = candidates.map((cand) => {
    const res = cand.result;
    const blockingCount = res.matchingScore.blockingRequirementsFailed.length;
    const matchScore = res.matchingScore.total;
    const atsScore = res.atsScore.total;
    const confirmedCount = res.confirmedSkills.length;

    const pros: string[] = [];
    const cons: string[] = [];

    if (blockingCount === 0) {
      pros.push("Toutes les exigences indispensables identifiées sont couvertes.");
    } else {
      cons.push(`${blockingCount} exigence(s) obligatoire(s) non démontrée(s) : ${res.matchingScore.blockingRequirementsFailed.join(", ")}`);
    }

    if (matchScore >= 80) {
      pros.push(`Excellente adéquation technique globale (${matchScore}/100).`);
    } else if (matchScore < 65) {
      cons.push(`Score de matching modéré (${matchScore}/100) pour cette offre.`);
    }

    if (atsScore >= 85) {
      pros.push(`Structure très lisible pour les ATS (${atsScore}/100).`);
    } else if (atsScore < 70) {
      cons.push(`Lisibilité ATS perfectible (${atsScore}/100).`);
    }

    if (confirmedCount > 0) {
      pros.push(`${confirmedCount} compétences confirmées avec preuves.`);
    }

    return {
      candidate: cand,
      blockingCount,
      matchScore,
      atsScore,
      pros,
      cons,
    };
  });

  // Sort logic:
  // 1. Minimum blocking issues
  // 2. Highest matching score
  // 3. Highest ATS score
  const sorted = [...scored].sort((a, b) => {
    if (a.blockingCount !== b.blockingCount) {
      return a.blockingCount - b.blockingCount;
    }
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return b.atsScore - a.atsScore;
  });

  const best = sorted[0];

  let recommendationReason = "";
  if (best.blockingCount === 0) {
    recommendationReason = `Le CV "${best.candidate.label}" est la version la plus adaptée. Il couvre l'ensemble des critères obligatoires demandés par l'annonce avec un score de matching de ${best.matchScore}/100 et une lisibilité ATS de ${best.atsScore}/100.`;
  } else {
    recommendationReason = `Le CV "${best.candidate.label}" est le meilleur compromis identifié (${best.matchScore}/100 en matching), mais attention : ${best.blockingCount} exigence(s) obligatoire(s) reste(nt) à clarifier (${best.candidate.result.matchingScore.blockingRequirementsFailed.join(", ")}).`;
  }

  return {
    jobTitle: jobTitle || "Offre d'emploi",
    targetPosition,
    candidates,
    recommendedCandidateId: best.candidate.id,
    recommendationReason,
    comparisonHighlights: scored.map((s) => ({
      candidateId: s.candidate.id,
      pros: s.pros,
      cons: s.cons,
      blockingIssuesCount: s.blockingCount,
    })),
  };
}
