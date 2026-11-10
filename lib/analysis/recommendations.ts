import type {
  Recommendation,
  ExecutiveSummary,
  RequirementMatch,
  ATSDiagnostic,
  AnalyzedJob,
  ParsedResume,
} from "@/types";

export function generateRecommendationsAndSummary(
  matches: RequirementMatch[],
  atsDiagnostics: ATSDiagnostic[],
  job: AnalyzedJob,
  resume: ParsedResume
): { recommendations: Recommendation[]; summary: ExecutiveSummary } {
  const recommendations: Recommendation[] = [];

  // 1. Mandatory missing requirements
  const missingMandatory = matches.filter((m) => m.required && m.status === "missing");
  for (const item of missingMandatory) {
    recommendations.push({
      id: `rec-mandatory-${item.requirementId}`,
      title: `Intégrer ou clarifier votre pratique de ${item.requirementLabel}`,
      issue: `L'exigence "${item.requirementLabel}" est mentionnée comme indispensable dans l'annonce mais reste introuvable dans votre CV.`,
      relevanceToJob: `Les recruteurs et filtres éliminent souvent en priorité les profils n'affichant pas explicitement cette exigence clé.`,
      suggestion: `Si vous avez mobilisé cette compétence lors d'une mission ou d'un projet, explicitez-la dans la description de l'expérience correspondante. Si vous ne la maîtrisez pas, préparez une réponse honnête sur votre capacité d'adaptation rapide.`,
      priority: "high",
      category: "mandatory_gap",
    });
  }

  // 2. Partial matches (need proof or precision)
  const partialMatches = matches.filter((m) => m.status === "partial");
  for (const item of partialMatches) {
    recommendations.push({
      id: `rec-partial-${item.requirementId}`,
      title: `Préciser le contexte d'utilisation de ${item.requirementLabel}`,
      issue: item.comment,
      relevanceToJob: `L'offre valorise particulièrement la maîtrise concrète et opérationnelle de cette compétence.`,
      suggestion: `Ajoutez 1 à 2 lignes concrètes détaillant comment vous l'avez mise en œuvre (contexte, volumétrie, résultats obtenus).`,
      priority: "medium",
      category: "clarification",
    });
  }

  // 3. ATS diagnostics fixes
  const severeAts = atsDiagnostics.filter((d) => d.severity === "high" || d.severity === "medium");
  for (const diag of severeAts) {
    recommendations.push({
      id: `rec-${diag.id}`,
      title: `Optimisation ATS : ${diag.title}`,
      issue: diag.explanation,
      relevanceToJob: `Garantit que le recruteur et les logiciels de tri reçoivent vos informations sans perte de données.`,
      suggestion: diag.remediation,
      priority: diag.severity === "high" ? "high" : "medium",
      category: "ats_fix",
    });
  }

  // Deduplicate and limit recommendations to top 7
  const uniqueRecs = recommendations.slice(0, 7);

  // Executive summary generation
  const confirmed = matches.filter((m) => m.status === "confirmed").map((m) => m.requirementLabel);
  const gaps = matches.filter((m) => m.status === "missing").map((m) => m.requirementLabel);
  const blocking = missingMandatory.map((m) => m.requirementLabel);

  const priorityActions = uniqueRecs
    .filter((r) => r.priority === "high")
    .map((r) => r.title);

  if (priorityActions.length === 0 && uniqueRecs.length > 0) {
    priorityActions.push(uniqueRecs[0].title);
  }

  const verifications: string[] = [];
  if (missingMandatory.length > 0) {
    verifications.push(
      `Vérifier si vous possédez une expérience même indirecte sur : ${missingMandatory.map((m) => m.requirementLabel).join(", ")}.`
    );
  }
  if (!resume.contactInfo.hasPhone || !resume.contactInfo.hasEmail) {
    verifications.push("Contrôler la présence visible de vos coordonnées complètes (e-mail et téléphone).");
  }
  if (job.yearsOfExperienceRequired) {
    verifications.push(
      `Confirmer que vos dates d'expériences font ressortir au moins ${job.yearsOfExperienceRequired} années de pratique pertinentes.`
    );
  }

  const summary: ExecutiveSummary = {
    strengths: confirmed.length > 0 ? confirmed.slice(0, 5) : ["Profil correspondant aux bases attendues de l'offre."],
    majorGaps: gaps.length > 0 ? gaps.slice(0, 5) : ["Aucun écart majeur détecté."],
    blockingAlerts:
      blocking.length > 0
        ? blocking.map((b) => `Exigence requise absente : ${b}`)
        : ["Aucun critère bloquant impératif n'a été omis."],
    priorityActions,
    verificationsBeforeApplying: verifications.length > 0 ? verifications : ["Relecture finale du document avant envoi."],
  };

  return { recommendations: uniqueRecs, summary };
}

