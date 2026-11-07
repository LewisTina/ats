import { describe, it, expect } from "vitest";
import {
  buildAIPrompt,
  AIAnalysisResponseSchema,
} from "@/lib/ai/prompts";

describe("AI Prompt & Schema Validation", () => {
  it("generates system and user prompts preventing hallucinations and enforcing JSON output", () => {
    const { systemPrompt, userPrompt } = buildAIPrompt(
      "CV Text Sample",
      "Job Description Sample",
      "fullstack"
    );

    expect(systemPrompt).toContain("Ne JAMAIS inventer d'expériences");
    expect(systemPrompt).toContain("JavaScript n'est PAS Java");
    expect(systemPrompt).toContain("React n'est PAS automatiquement React Native");
    expect(userPrompt).toContain("FULLSTACK");
  });

  it("validates well-formed structured AI response JSON with Zod", () => {
    const validAiResponse = {
      jobTitle: "Développeur Full-Stack",
      requirementsEvaluations: [
        {
          label: "TypeScript",
          status: "confirmed",
          proof: "3 ans sur TypeScript chez Acme Corp",
          explanation: "Compétence démontrée en environnement de production",
          confidence: "high",
          required: true,
        },
        {
          label: "Kubernetes",
          status: "missing",
          explanation: "Aucune trace de conteneurs K8s dans le texte",
          confidence: "high",
          required: false,
        },
      ],
      contextualRecommendations: [
        {
          title: "Valoriser l'expérience API",
          issue: "Les endpoints ne sont pas détaillés",
          relevanceToJob: "L'offre recherche de la conception REST",
          suggestion: "Préciser la volumétrie des requêtes traitées",
          priority: "medium",
        },
      ],
      executiveSummary: {
        strengths: ["Excellente maîtrise Front & Back"],
        majorGaps: ["Pas de K8s"],
        blockingAlerts: [],
        priorityActions: ["Détailler l'architecture API"],
      },
    };

    const parsed = AIAnalysisResponseSchema.safeParse(validAiResponse);
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid structured AI responses (e.g. invalid status enum)", () => {
    const invalidAiResponse = {
      requirementsEvaluations: [
        {
          label: "React",
          status: "maybe", // Invalid enum! Must be confirmed, partial, or missing
          explanation: "Test",
          confidence: "high",
          required: true,
        },
      ],
      contextualRecommendations: [],
      executiveSummary: {
        strengths: [],
        majorGaps: [],
        blockingAlerts: [],
        priorityActions: [],
      },
    };

    const parsed = AIAnalysisResponseSchema.safeParse(invalidAiResponse);
    expect(parsed.success).toBe(false);
  });
});
