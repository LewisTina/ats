import type {
  RequirementMatch,
  MatchingScoreBreakdown,
  RequirementCategory,
} from "@/types";

export interface ScoringWeights {
  technicalSkills: number;
  experienceSeniority: number;
  responsibilities: number;
  methodologyContext: number;
  otherRequirements: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  technicalSkills: 0.35,
  experienceSeniority: 0.25,
  responsibilities: 0.20,
  methodologyContext: 0.10,
  otherRequirements: 0.10,
};

export function calculateMatchingScore(
  matches: RequirementMatch[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): MatchingScoreBreakdown {
  if (matches.length === 0) {
    return {
      technicalSkillsScore: 0,
      experienceSeniorityScore: 0,
      responsibilitiesScore: 0,
      methodologyContextScore: 0,
      otherRequirementsScore: 0,
      total: 0,
      confidenceScore: 10,
      ratingLabel: "Données insuffisantes pour évaluer la correspondance",
      blockingRequirementsFailed: [],
    };
  }

  const blockingFailed: string[] = [];
  const categorized: Record<
    keyof ScoringWeights,
    { pointsEarned: number; maxPoints: number; count: number }
  > = {
    technicalSkills: { pointsEarned: 0, maxPoints: 0, count: 0 },
    experienceSeniority: { pointsEarned: 0, maxPoints: 0, count: 0 },
    responsibilities: { pointsEarned: 0, maxPoints: 0, count: 0 },
    methodologyContext: { pointsEarned: 0, maxPoints: 0, count: 0 },
    otherRequirements: { pointsEarned: 0, maxPoints: 0, count: 0 },
  };

  const getWeightCategory = (cat: RequirementCategory): keyof ScoringWeights => {
    switch (cat) {
      case "technical_skill":
      case "framework_tool":
        return "technicalSkills";
      case "experience_seniority":
        return "experienceSeniority";
      case "responsibility":
        return "responsibilities";
      case "methodology":
        return "methodologyContext";
      default:
        return "otherRequirements";
    }
  };

  for (const match of matches) {
    const group = getWeightCategory(match.category);
    const weightImportance = match.required ? 1.5 : 1.0;

    categorized[group].count += 1;
    categorized[group].maxPoints += 100 * weightImportance;

    if (match.status === "confirmed") {
      categorized[group].pointsEarned += 100 * weightImportance;
    } else if (match.status === "partial") {
      categorized[group].pointsEarned += 50 * weightImportance;
    } else {
      // missing
      if (match.required) {
        blockingFailed.push(match.requirementLabel);
      }
    }
  }

  // Sum the weights of categories actually evaluated in the job description
  let activeWeightsSum = 0;
  for (const [key, data] of Object.entries(categorized)) {
    if (data.count > 0) {
      activeWeightsSum += weights[key as keyof ScoringWeights];
    }
  }

  // If no category was evaluated, return 0
  if (activeWeightsSum === 0) {
    return {
      technicalSkillsScore: 0,
      experienceSeniorityScore: 0,
      responsibilitiesScore: 0,
      methodologyContextScore: 0,
      otherRequirementsScore: 0,
      total: 0,
      confidenceScore: 10,
      ratingLabel: "Données insuffisantes",
      blockingRequirementsFailed: [],
    };
  }

  // Calculate score per category proportionally to active weights
  const calcCategoryScore = (groupKey: keyof ScoringWeights): number => {
    const data = categorized[groupKey];
    if (data.count === 0) return 0;

    const normalizedMax = (weights[groupKey] / activeWeightsSum) * 100;
    const ratio = data.pointsEarned / data.maxPoints;
    return Math.round(ratio * normalizedMax);
  };

  const technicalSkillsScore = calcCategoryScore("technicalSkills");
  const experienceSeniorityScore = calcCategoryScore("experienceSeniority");
  const responsibilitiesScore = calcCategoryScore("responsibilities");
  const methodologyContextScore = calcCategoryScore("methodologyContext");
  const otherRequirementsScore = calcCategoryScore("otherRequirements");

  let rawTotal =
    technicalSkillsScore +
    experienceSeniorityScore +
    responsibilitiesScore +
    methodologyContextScore +
    otherRequirementsScore;

  // If there are mandatory/blocking requirements failed, cap or lightly adjust matching total to reflect critical gaps
  if (blockingFailed.length >= 3) {
    rawTotal = Math.min(rawTotal, 60);
  } else if (blockingFailed.length >= 1) {
    rawTotal = Math.min(rawTotal, 78);
  }

  const total = Math.min(100, Math.max(0, Math.round(rawTotal)));

  // Confidence calculation
  const highConfidenceCount = matches.filter((m) => m.confidence === "high").length;
  const confidenceScore = Math.min(
    95,
    Math.max(30, Math.round((highConfidenceCount / matches.length) * 85 + (matches.length > 5 ? 10 : 0)))
  );

  let ratingLabel = "Faible correspondance avec l'offre";
  if (total >= 85) ratingLabel = "Excellente correspondance";
  else if (total >= 72) ratingLabel = "Bonne correspondance";
  else if (total >= 55) ratingLabel = "Correspondance partielle";

  return {
    technicalSkillsScore,
    experienceSeniorityScore,
    responsibilitiesScore,
    methodologyContextScore,
    otherRequirementsScore,
    total,
    confidenceScore,
    ratingLabel,
    blockingRequirementsFailed: blockingFailed,
  };
}
