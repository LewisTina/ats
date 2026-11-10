import { z } from "zod";

// Flexible status preprocessor
const statusSchema = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  const s = val.toLowerCase().trim();
  if (
    s === "confirmed" ||
    s === "confirmé" ||
    s === "confirme" ||
    s.startsWith("confirm") ||
    s === "valide" ||
    s === "validé" ||
    s === "valid" ||
    s === "acquis" ||
    s === "yes" ||
    s === "true"
  ) {
    return "confirmed";
  }
  if (
    s === "partial" ||
    s === "partiel" ||
    s.startsWith("parti") ||
    s.includes("check") ||
    s.includes("verif") ||
    s === "moyen" ||
    s === "medium"
  ) {
    return "partial";
  }
  if (
    s === "missing" ||
    s === "absent" ||
    s === "non" ||
    s === "manquant" ||
    s.startsWith("manqu") ||
    s.startsWith("absent") ||
    s.startsWith("miss")
  ) {
    return "missing";
  }
  return val; // leaves invalid values so z.enum can reject unrecognized status
}, z.enum(["confirmed", "partial", "missing"]));

// Flexible confidence preprocessor
const confidenceSchema = z.preprocess((val) => {
  if (typeof val !== "string") return "medium";
  const c = val.toLowerCase().trim();
  if (c.includes("high") || c.includes("haut") || c.includes("forte")) return "high";
  if (c.includes("low") || c.includes("faible") || c.includes("bas")) return "low";
  return "medium";
}, z.enum(["high", "medium", "low"]));

// Flexible priority preprocessor
const prioritySchema = z.preprocess((val) => {
  if (typeof val !== "string") return "medium";
  const p = val.toLowerCase().trim();
  if (p.includes("high") || p.includes("haut") || p.includes("urgent")) return "high";
  if (p.includes("low") || p.includes("faible") || p.includes("bas")) return "low";
  return "medium";
}, z.enum(["high", "medium", "low"]));

// Flexible boolean preprocessor
const booleanSchema = z.preprocess((val) => {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    return /true|oui|yes|obligatoire|indispensable|requis|exig/i.test(val);
  }
  return false;
}, z.boolean());

// Flexible category preprocessor
const categorySchema = z.preprocess((val) => {
  if (typeof val !== "string") return undefined;
  const c = val.toLowerCase().trim();
  if (c === "experience_seniority" || c.includes("exp") || c.includes("senior") || c.includes("sénior")) {
    return "experience_seniority";
  }
  if (c === "framework_tool" || c.includes("framework") || c.includes("tool") || c.includes("outil")) {
    return "framework_tool";
  }
  if (c === "soft_skill" || c.includes("soft") || c.includes("humain") || c.includes("comportement")) {
    return "soft_skill";
  }
  if (c === "education_degree" || c.includes("educ") || c.includes("dipl") || c.includes("formation")) {
    return "education_degree";
  }
  if (c === "language" || c.includes("lang")) {
    return "language";
  }
  if (c === "responsibility" || c.includes("respons") || c.includes("mission")) {
    return "responsibility";
  }
  if (c === "methodology" || c.includes("method") || c.includes("méthod") || c.includes("agile")) {
    return "methodology";
  }
  if (c === "other" || c.includes("autre")) {
    return "other";
  }
  if (c === "technical_skill" || c.includes("tech")) {
    return "technical_skill";
  }
  return undefined;
}, z.enum([
  "technical_skill",
  "framework_tool",
  "experience_seniority",
  "soft_skill",
  "education_degree",
  "language",
  "responsibility",
  "methodology",
  "other",
]).optional());

export const AIRequirementSchema = z.object({
  label: z.string().default("Compétence"),
  category: categorySchema,
  status: statusSchema,
  proof: z.string().optional().default(""),
  explanation: z.string().optional().default(""),
  confidence: confidenceSchema.default("medium"),
  required: booleanSchema.default(false),
});

export const AIRecommendationSchema = z.object({
  title: z.string().default("Recommandation"),
  issue: z.string().optional().default(""),
  relevanceToJob: z.string().optional().default("Pertinent pour cette offre"),
  suggestion: z.string().optional().default(""),
  priority: prioritySchema.default("medium"),
});

export const AIExecutiveSummarySchema = z.object({
  strengths: z.array(z.string()).default([]),
  majorGaps: z.array(z.string()).default([]),
  blockingAlerts: z.array(z.string()).default([]),
  priorityActions: z.array(z.string()).default([]),
});

export const AIAnalysisResponseSchema = z.preprocess(
  (rawObj) => {
    if (!rawObj || typeof rawObj !== "object") return rawObj;
    const obj = rawObj as Record<string, unknown>;

    // Normalize requirements array from aliases
    const rawReqs =
      obj.requirementsEvaluations ||
      obj.requirements ||
      obj.competences ||
      obj.skills;

    const requirementsEvaluations = Array.isArray(rawReqs)
      ? rawReqs.map((item) => {
          if (!item || typeof item !== "object") return { label: String(item) };
          const it = item as Record<string, unknown>;
          return {
            label: it.label || it.name || it.skill || it.titre || "Compétence",
            category: it.category || it.categorie || it.type,
            status: it.status || it.statut,
            proof: it.proof || it.preuve || it.snippet || "",
            explanation: it.explanation || it.justification || it.comment || it.raison || "",
            confidence: it.confidence || it.confiance || "medium",
            required: it.required !== undefined ? it.required : (it.obligatoire !== undefined ? it.obligatoire : false),
          };
        })
      : rawReqs;

    // Normalize recommendations from aliases
    const rawRecs =
      obj.contextualRecommendations ||
      obj.recommendations ||
      obj.recommandations ||
      obj.conseils ||
      [];
    const contextualRecommendations = Array.isArray(rawRecs)
      ? rawRecs.map((item) => {
          if (!item || typeof item !== "object") return { title: String(item) };
          const it = item as Record<string, unknown>;
          return {
            title: it.title || it.titre || "Ajustement recommandé",
            issue: it.issue || it.probleme || it.constat || "",
            relevanceToJob: it.relevanceToJob || it.relevance || it.pertinence || "Pertinent pour l'offre",
            suggestion: it.suggestion || it.action || it.conseil || "",
            priority: it.priority || it.priorite || "medium",
          };
        })
      : [];

    // Normalize summary from aliases
    const rawSummary =
      (obj.executiveSummary as Record<string, unknown>) ||
      (obj.summary as Record<string, unknown>) ||
      (obj.synthese as Record<string, unknown>) ||
      {};

    const executiveSummary = {
      strengths: Array.isArray(rawSummary.strengths || rawSummary.pointsForts || rawSummary.points_forts)
        ? (rawSummary.strengths || rawSummary.pointsForts || rawSummary.points_forts)
        : [],
      majorGaps: Array.isArray(rawSummary.majorGaps || rawSummary.gaps || rawSummary.ecarts)
        ? (rawSummary.majorGaps || rawSummary.gaps || rawSummary.ecarts)
        : [],
      blockingAlerts: Array.isArray(rawSummary.blockingAlerts || rawSummary.alerts || rawSummary.bloquants)
        ? (rawSummary.blockingAlerts || rawSummary.alerts || rawSummary.bloquants)
        : [],
      priorityActions: Array.isArray(rawSummary.priorityActions || rawSummary.actions || rawSummary.actionsPrioritaires)
        ? (rawSummary.priorityActions || rawSummary.actions || rawSummary.actionsPrioritaires)
        : [],
    };

    return {
      jobTitle: obj.jobTitle || obj.title || obj.intitule,
      requirementsEvaluations,
      contextualRecommendations,
      executiveSummary,
    };
  },
  z.object({
    jobTitle: z.string().optional(),
    requirementsEvaluations: z.array(AIRequirementSchema),
    contextualRecommendations: z.array(AIRecommendationSchema).default([]),
    executiveSummary: AIExecutiveSummarySchema.default({
      strengths: [],
      majorGaps: [],
      blockingAlerts: [],
      priorityActions: [],
    }),
  })
);

export type AIAnalysisResponse = z.infer<typeof AIAnalysisResponseSchema>;

export interface AIPromptContext {
  currentYear?: number;
  estimatedCandidateYears?: number;
  candidateExperienceProof?: string;
  jobMinYears?: number;
  jobMaxYears?: number;
}

export function buildAIPrompt(
  resumeText: string,
  jobText: string,
  context: AIPromptContext = {}
): { systemPrompt: string; userPrompt: string } {
  const currentYear = context.currentYear ?? new Date().getFullYear();

  const systemPrompt = `Tu es un expert senior en recrutement IT, en analyse documentaire et en évaluation ATS.
Nous sommes en ${currentYear}. Ton rôle est d'analyser la compatibilité d'un CV avec une offre d'emploi de manière rigoureuse, factuelle, nuancée et constructive.

Règles absolues :
1. Ne JAMAIS inventer d'expériences, de diplômes, de métriques chiffrées ou de compétences absentes du CV.
2. ÉVALUATION DES TRANCHES ET INTERVALLES D'EXPÉRIENCE (CRITIQUE) :
   - Lorsqu'une offre mentionne un intervalle (ex: "5 à 7 ans", "5 à 10 ans", "entre 3 et 5 ans", "minimum 5 à 7 ans"), la borne INFÉRIEURE (ex: 5 ans) est le seuil minimum requis, et l'intervalle représente la cible idéale.
   - Ne transforme JAMAIS un intervalle "X à Y ans" en "Y ans minimum". Un candidat ayant X ans ou plus (ex: 5, 6 ou 7 ans pour "5 à 7 ans" ou "5 à 10 ans") est DANS la tranche recherchée : son statut DOIT être "confirmed" (et NON "partial" ni "missing").
   - Pour calculer l'expérience du candidat, additionne ses périodes professionnelles (une période "2020 - Présent/Aujourd'hui" compte jusqu'en ${currentYear}) ou fie-toi à la durée explicitement mentionnée dans son profil.
   - Si le candidat est légèrement sous la borne inférieure (ex: 4 ans pour "5 à 7 ans"), utilise "partial", pas "missing".
3. Éviter rigoureusement les faux équivalents techniques :
   - JavaScript n'est PAS Java.
   - React n'est PAS automatiquement React Native (mobile).
   - Docker ne prouve PAS Kubernetes.
   - 5 ans d'expérience globale ne signifient pas 5 ans sur chaque technologie récente.
   - En revanche, reconnais les équivalences implicites directes : Next.js implique React et JavaScript ; TypeScript implique JavaScript ; App Router/NextJS 16 sont validés par une expérience solide et récente sur Next.js.
4. Si une compétence n'est pas mentionnée dans le CV, elle n'est simplement pas démontrée dans le document ("missing").
5. Réponds UNIQUEMENT sous forme d'un objet JSON strict respectant la structure demandée, sans texte avant ou après.`;

  const preAnalysisLines: string[] = [
    `- Année de référence : ${currentYear}`,
  ];
  if (context.jobMinYears !== undefined) {
    const targetDesc = context.jobMaxYears
      ? `Intervalle de ${context.jobMinYears} à ${context.jobMaxYears} ans (seuil minimum = ${context.jobMinYears} ans ; tout candidat ayant >= ${context.jobMinYears} ans valide ce critère en "confirmed")`
      : `Minimum ${context.jobMinYears} ans`;
    preAnalysisLines.push(`- Expérience demandée dans l'offre : ${targetDesc}`);
  }
  if (context.estimatedCandidateYears !== undefined) {
    preAnalysisLines.push(
      `- Expérience du candidat estimée par pré-analyse : ~${context.estimatedCandidateYears} ans${
        context.candidateExperienceProof ? ` (${context.candidateExperienceProof})` : ""
      }`
    );
  }

  const userPrompt = `=== REPÈRES FACTUELS DE PRÉ-ANALYSE ===
${preAnalysisLines.join("\n")}

=== OFFRE D'EMPLOI ===
${jobText}

=== CV DU CANDIDAT (TEXTE EXTRAIT) ===
${resumeText}

Évalue la correspondance détaillée. Retourne un objet JSON valide avec cette structure exacte :
{
  "jobTitle": "Intitulé du poste extrait",
  "requirementsEvaluations": [
    {
      "label": "Nom de l'exigence ou compétence clé (pour l'expérience, garde le format d'intervalle ex: '5 à 10 ans d'expérience')",
      "category": "technical_skill", // "technical_skill" | "framework_tool" | "experience_seniority" | "methodology" | "responsibility" | "soft_skill" | "language" | "education_degree" | "other"
      "status": "confirmed", // "confirmed" | "partial" | "missing"
      "proof": "Extrait textuel du CV ou calcul des dates justifiant le statut",
      "explanation": "Pourquoi ce statut a été attribué de manière factuelle",
      "confidence": "high", // "high" | "medium" | "low"
      "required": true // true si indispensable, false si souhaité/bonus
    }
  ],
  "contextualRecommendations": [
    {
      "title": "Titre clair et direct",
      "issue": "Problème précis constaté",
      "relevanceToJob": "Pourquoi c'est important pour cette offre",
      "suggestion": "Conseil concret d'amélioration sans inventer",
      "priority": "high" // "high" | "medium" | "low"
    }
  ],
  "executiveSummary": {
    "strengths": ["Point fort 1", "Point fort 2"],
    "majorGaps": ["Écart 1", "Écart 2"],
    "blockingAlerts": ["Alerte uniquement sur une exigence indispensable réellement absente"],
    "priorityActions": ["Action prioritaire 1"]
  }
}`;

  return { systemPrompt, userPrompt };
}
