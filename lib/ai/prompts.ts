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

export const AIRequirementSchema = z.object({
  label: z.string().default("Compétence"),
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

export function buildAIPrompt(
  resumeText: string,
  jobText: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Tu es un expert senior en recrutement, en analyse documentaire et en évaluation ATS.
Ton rôle est d'analyser la compatibilité d'un CV avec une offre d'emploi de manière rigoureuse, factuelle, nuancée et constructive.

Règles absolues :
1. Ne JAMAIS inventer d'expériences, de diplômes, de métriques chiffrées ou de compétences absentes.
2. Éviter rigoureusement les faux équivalents :
   - JavaScript n'est PAS Java.
   - React n'est PAS automatiquement React Native (mobile).
   - Docker ne prouve PAS Kubernetes.
   - 5 ans d'expérience globale ne signifient pas 5 ans sur chaque compétence ou technologie.
3. Si une compétence n'est pas mentionnée dans le CV, cela ne signifie pas automatiquement que le candidat en est incapable, mais simplement qu'elle n'est pas démontrée dans le document.
4. Réponds UNIQUEMENT sous forme d'un objet JSON strict respectant la structure demandée, sans texte avant ou après.`;

  const userPrompt = `=== OFFRE D'EMPLOI ===
${jobText}

=== CV DU CANDIDAT (TEXTE EXTRAIT) ===
${resumeText}

Évalue la correspondance détaillée. Retourne un objet JSON valide avec cette structure exacte :
{
  "jobTitle": "Intitulé du poste extrait",
  "requirementsEvaluations": [
    {
      "label": "Nom de l'exigence ou compétence clé",
      "status": "confirmed", // "confirmed" | "partial" | "missing"
      "proof": "Extrait textuel du CV justifiant le statut si applicable",
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
    "blockingAlerts": ["Alerte sur exigence indispensable non vue"],
    "priorityActions": ["Action prioritaire 1"]
  }
}`;

  return { systemPrompt, userPrompt };
}
