import { z } from "zod";
import type { TargetPosition } from "@/types";

export const AIAnalysisResponseSchema = z.object({
  jobTitle: z.string().optional(),
  requirementsEvaluations: z.array(
    z.object({
      label: z.string(),
      status: z.enum(["confirmed", "partial", "missing"]),
      proof: z.string().optional(),
      explanation: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
      required: z.boolean(),
    })
  ),
  contextualRecommendations: z.array(
    z.object({
      title: z.string(),
      issue: z.string(),
      relevanceToJob: z.string(),
      suggestion: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    })
  ),
  executiveSummary: z.object({
    strengths: z.array(z.string()),
    majorGaps: z.array(z.string()),
    blockingAlerts: z.array(z.string()),
    priorityActions: z.array(z.string()),
  }),
});

export type AIAnalysisResponse = z.infer<typeof AIAnalysisResponseSchema>;

export function buildAIPrompt(
  resumeText: string,
  jobText: string,
  targetPosition: TargetPosition
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Tu es un expert senior en recrutement technique, en analyse documentaire et en évaluation ATS.
Ton rôle est d'analyser la compatibilité d'un CV avec une offre d'emploi de manière rigoureuse, factuelle, nuancée et constructive.

Règles absolues :
1. Ne JAMAIS inventer d'expériences, de diplômes, de métriques chiffrées ou de compétences absentes.
2. Éviter rigoureusement les faux équivalents :
   - JavaScript n'est PAS Java.
   - React n'est PAS automatiquement React Native (mobile).
   - Docker ne prouve PAS Kubernetes.
   - 5 ans d'expérience globale ne signifient pas 5 ans sur chaque technologie.
3. Si une compétence n'est pas mentionnée dans le CV, cela ne signifie pas automatiquement que le candidat en est incapable, mais simplement qu'elle n'est pas démontrée dans le document.
4. Réponds UNIQUEMENT sous forme d'un objet JSON strict respectant la structure demandée, sans texte avant ou après.`;

  const userPrompt = `Voici le positionnement visé : ${targetPosition.toUpperCase()}

=== OFFRE D'EMPLOI ===
${jobText}

=== CV DU CANDIDAT (TEXTE EXTRAIT) ===
${resumeText}

Évalue la correspondance détaillée. Retourne un objet JSON valide avec cette structure exacte :
{
  "jobTitle": "Intitulé du poste extrait",
  "requirementsEvaluations": [
    {
      "label": "Nom de l'exigence ou compétence clé",
      "status": "confirmed" | "partial" | "missing",
      "proof": "Extrait textuel du CV justifiant le statut si applicable",
      "explanation": "Pourquoi ce statut a été attribué de manière factuelle",
      "confidence": "high" | "medium" | "low",
      "required": true // si indispensable, false si souhaité/bonus
    }
  ],
  "contextualRecommendations": [
    {
      "title": "Titre clair et direct",
      "issue": "Problème précis constaté",
      "relevanceToJob": "Pourquoi c'est important pour cette offre",
      "suggestion": "Conseil concret d'amélioration sans inventer",
      "priority": "high" | "medium" | "low"
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

