import { describe, it, expect } from "vitest";
import {
  buildAIPrompt,
  AIAnalysisResponseSchema,
} from "@/lib/ai/prompts";
import { extractJsonFromContent } from "@/lib/ai/provider";

describe("AI Prompt & Schema Validation", () => {
  it("generates system and user prompts preventing hallucinations and enforcing JSON output", () => {
    const { systemPrompt, userPrompt } = buildAIPrompt(
      "CV Text Sample",
      "Job Description Sample"
    );

    expect(systemPrompt).toContain("Ne JAMAIS inventer d'expériences");
    expect(systemPrompt).toContain("JavaScript n'est PAS Java");
    expect(systemPrompt).toContain("React n'est PAS automatiquement React Native");
    expect(userPrompt).toContain("CV Text Sample");
    expect(userPrompt).toContain("Job Description Sample");
  });

  it("extracts pure JSON from content with reasoning <think> blocks and code fences", () => {
    const rawWithThinking = `
      <think>
        Analyzing candidate Pierre Lewis Tina...
        Skills match React and Next.js.
      </think>
      \`\`\`json
      {
        "jobTitle": "Développeur Full-Stack",
        "requirementsEvaluations": [
          { "label": "React", "status": "confirmed" }
        ]
      }
      \`\`\`
    `;

    const extracted = extractJsonFromContent(rawWithThinking);
    const parsed = JSON.parse(extracted);

    expect(parsed.jobTitle).toBe("Développeur Full-Stack");
    expect(parsed.requirementsEvaluations).toHaveLength(1);
  });

  it("gracefully validates partial Ollama JSON without throwing 'Required, Required'", () => {
    // Simulates Ollama output that omits blockingAlerts, priorityActions, and uses French aliases
    const ollamaResponse = {
      intitule: "Développeur Full Stack",
      requirements: [
        {
          skill: "React",
          statut: "confirmé",
          preuve: "React et Next.js dans plusieurs projets",
          justification: "Compétence avérée",
          confiance: "haute",
          obligatoire: "oui",
        },
        {
          skill: "Node.js",
          statut: "confirmé",
          confiance: "haute",
        },
      ],
      recommendations: [
        {
          titre: "Détailler les tests",
          probleme: "Peu de détails sur les tests",
          pertinence: "Requis pour la CI",
          action: "Ajouter Vitest",
          priorite: "haute",
        },
      ],
      synthese: {
        pointsForts: ["Excellente maîtrise React et Node.js"],
        ecarts: ["Pas de Kubernetes"],
        // Notice: blockingAlerts and priorityActions are omitted!
      },
    };

    const validation = AIAnalysisResponseSchema.safeParse(ollamaResponse);

    expect(validation.success).toBe(true);
    if (validation.success) {
      expect(validation.data.jobTitle).toBe("Développeur Full Stack");
      expect(validation.data.requirementsEvaluations).toHaveLength(2);
      expect(validation.data.requirementsEvaluations[0].status).toBe("confirmed");
      expect(validation.data.requirementsEvaluations[0].confidence).toBe("high");
      expect(validation.data.requirementsEvaluations[0].required).toBe(true);

      // Defaulted arrays must not crash
      expect(validation.data.executiveSummary.blockingAlerts).toEqual([]);
      expect(validation.data.executiveSummary.priorityActions).toEqual([]);
    }
  });

  it("rejects invalid structured AI responses (e.g. invalid status enum)", () => {
    const invalidAiResponse = {
      requirementsEvaluations: [
        {
          label: "React",
          status: "inconnu_ou_invalide", // Unrecognized status!
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
