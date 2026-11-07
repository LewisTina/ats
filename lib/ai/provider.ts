import {
  AIAnalysisResponseSchema,
  buildAIPrompt,
  type AIAnalysisResponse,
} from "./prompts";
import type { TargetPosition } from "@/types";

export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  analyze(
    resumeText: string,
    jobText: string,
    targetPosition: TargetPosition,
  ): Promise<{ success: boolean; data?: AIAnalysisResponse; error?: string }>;
}

export class ConfigurableLLMProvider implements AIProvider {
  name: string;
  private providerType: string;
  private apiKey?: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.providerType = (process.env.AI_PROVIDER || "openai").toLowerCase();
    this.apiKey = process.env.AI_API_KEY;
    this.model =
      process.env.AI_MODEL ||
      (this.providerType === "ollama" ? "llama3" : "gpt-4o-mini");

    if (process.env.AI_BASE_URL) {
      this.baseUrl = process.env.AI_BASE_URL;
    } else {
      switch (this.providerType) {
        case "openrouter":
          this.baseUrl = "https://openrouter.ai/api/v1";
          break;
        case "gemini":
          this.baseUrl =
            "https://generativelanguage.googleapis.com/v1beta/openai";
          break;
        case "groq":
          this.baseUrl = "https://api.groq.com/openai/v1";
          break;
        case "ollama":
          this.baseUrl = "http://localhost:11434/v1";
          break;
        case "openai":
        default:
          this.baseUrl = "https://api.openai.com/v1";
          break;
      }
    }

    this.name = `${this.providerType.toUpperCase()} (${this.model})`;
  }

  isConfigured(): boolean {
    if (this.providerType === "ollama") {
      return true; // Ollama runs locally without requiring an API key
    }
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async analyze(
    resumeText: string,
    jobText: string,
    targetPosition: TargetPosition,
  ): Promise<{ success: boolean; data?: AIAnalysisResponse; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: `Le fournisseur IA "${this.providerType}" nécessite une variable d'environnement AI_API_KEY configurée dans votre fichier .env.local (ou utilisez Ollama en local).`,
      };
    }

    const { systemPrompt, userPrompt } = buildAIPrompt(
      resumeText,
      jobText,
      targetPosition,
    );
    const endpoint = `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    if (this.providerType === "openrouter") {
      headers["HTTP-Referer"] = "http://localhost:3000";
      headers["X-Title"] = "CV Analyzer Local";
    }

    const bodyPayload = {
      model: this.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        return {
          success: false,
          error: `Erreur API (${res.status} ${res.statusText}) : ${errorBody.slice(0, 300)}`,
        };
      }

      const jsonResponse = await res.json();
      const content = jsonResponse.choices?.[0]?.message?.content;

      if (!content || typeof content !== "string") {
        return {
          success: false,
          error: "Réponse vide reçue du fournisseur IA.",
        };
      }

      // Clean potential markdown blocks
      const cleanJsonString = content
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();

      const parsed = JSON.parse(cleanJsonString);
      const validation = AIAnalysisResponseSchema.safeParse(parsed);

      if (!validation.success) {
        return {
          success: false,
          error: `Format de réponse IA invalide : ${validation.error.issues.map((i) => i.message).join(", ")}`,
        };
      }

      return {
        success: true,
        data: validation.data,
      };
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          return {
            success: false,
            error:
              "Délai d'attente dépassé (timeout 45s) lors de l'appel au fournisseur IA.",
          };
        }
        return {
          success: false,
          error: `Erreur de communication IA : ${err.message}`,
        };
      }
      return {
        success: false,
        error: "Erreur inconnue lors de l'analyse IA.",
      };
    }
  }
}

let defaultProviderInstance: ConfigurableLLMProvider | null = null;

export function getAIProvider(): ConfigurableLLMProvider {
  if (!defaultProviderInstance) {
    defaultProviderInstance = new ConfigurableLLMProvider();
  }
  return defaultProviderInstance;
}
