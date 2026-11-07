import type {
  Recommendation,
  ExecutiveSummary,
  RequirementMatch,
  ATSDiagnostic,
  AnalyzedJob,
  ParsedResume,
  TargetPosition,
} from "@/types";

export function generateRecommendationsAndSummary(
  matches: RequirementMatch[],
  atsDiagnostics: ATSDiagnostic[],
  job: AnalyzedJob,
  resume: ParsedResume,
  targetPosition: TargetPosition
): { recommendations: Recommendation[]; summary: ExecutiveSummary } {
  const recommendations: Recommendation[] = [];

  // 1. Mandatory missing requirements
  const missingMandatory = matches.filter((m) => m.required && m.status === "missing");
  for (const item of missingMandatory) {
    recommendations.push({
      id: `rec-mandatory-${item.requirementId}`,
      title: `Intégrer ou clarifier votre pratique de ${item.requirementLabel}`,
      issue: `L'exigence "${item.requirementLabel}" est mentionnée comme indispensable dans l'annonce mais reste introuvable dans votre CV.`,
      relevanceToJob: `Les recruteurs et filtres techniques éliminent souvent en priorité les profils n'affichant pas explicitement cette exigence clé.`,
      suggestion: `Si vous avez manipulé ou côtoyé cette technologie lors d'une mission ou d'un projet personnel, explicitez-la dans la description du projet correspondant. Si vous ne la maîtrisez pas, préparez une réponse honnête sur votre capacité d'apprentissage rapide.`,
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

  // 4. Target Position specific valorization
  if (targetPosition === "fullstack") {
    const hasBackAndFront =
      resume.detectedSkills.some((s) => ["React", "Vue.js", "Angular", "Next.js"].includes(s)) &&
      resume.detectedSkills.some((s) => ["Node.js", "Python", "Java", "Go", "PostgreSQL"].includes(s));
    if (!hasBackAndFront) {
      recommendations.push({
        id: "rec-pos-fullstack",
        title: "Équilibrer la visibilité Front-End et Back-End",
        issue: "Pour un positionnement Full-Stack, le CV doit démontrer un équilibre clair entre interface utilisateur et logique serveur/données.",
        relevanceToJob: "L'offre recherche une autonomie de bout en bout sur la chaîne applicative.",
        suggestion: "Mettez en avant vos contributions aux API et modèles de données autant que le travail sur les interfaces.",
        priority: "medium",
        category: "valorization",
      });
    }
  } else if (targetPosition === "mobile") {
    const hasMobile = resume.detectedSkills.some((s) =>
      ["React Native", "Flutter", "Swift", "Kotlin", "iOS", "Android"].includes(s)
    );
    if (!hasMobile) {
      recommendations.push({
        id: "rec-pos-mobile",
        title: "Mettre en avant vos réalisations mobiles spécifiques",
        issue: "Aucune technologie mobile majeure (React Native, Flutter, Swift, Kotlin) n'est identifiée nettement en tête de CV.",
        relevanceToJob: "Pour une candidature ciblée Mobile, la publication d'applications (App Store, Google Play) est un différenciateur direct.",
        suggestion: "Indiquez les liens de vos applications publiées ou dépôts de démonstration.",
        priority: "high",
        category: "valorization",
      });
    }
  } else if (targetPosition === "frontend") {
    const hasDesignSystem = resume.detectedSkills.includes("Design System") || /storybook|shadcn|accessibilit/i.test(resume.rawText);
    if (!hasDesignSystem) {
      recommendations.push({
        id: "rec-pos-frontend",
        title: "Valoriser l'ergonomie, les composants et le Design System",
        issue: "Le profil Front-End / Design System gagne à expliciter les pratiques de composants réutilisables et de tests UI.",
        relevanceToJob: "Recherché pour des interfaces soignées et modulaires.",
        suggestion: "Mentionnez explicitement Storybook, tests d'accessibilité (a11y) ou bibliothèques de composants créées.",
        priority: "low",
        category: "valorization",
      });
    }
  }

  // Deduplicate and limit recommendations to top 6
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
    strengths: confirmed.length > 0 ? confirmed.slice(0, 5) : ["Profil technique correspondant aux bases attendues."],
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
