import {
  AIAnalysisResponseSchema,
  buildAIPrompt,
  type AIAnalysisResponse,
  type AIPromptContext,
} from "./prompts";

export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  analyze(
    resumeText: string,
    jobText: string,
    context?: AIPromptContext
  ): Promise<{ success: boolean; data?: AIAnalysisResponse; error?: string }>;
}

export function extractJsonFromContent(content: string): string {
  // 1. Remove thinking blocks like <think>...</think> from reasoning models
  let clean = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. Remove markdown code fences if present
  clean = clean.replace(/```(?:json)?\s*([\s\S]*?)\s*```/i, "$1").trim();

  // 3. Find outermost JSON object
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }

  return clean;
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
    this.model = process.env.AI_MODEL || (this.providerType === "ollama" ? "llama3" : "gpt-4o-mini");

    if (process.env.AI_BASE_URL) {
      this.baseUrl = process.env.AI_BASE_URL;
    } else {
      switch (this.providerType) {
        case "openrouter":
          this.baseUrl = "https://openrouter.ai/api/v1";
          break;
        case "gemini":
          this.baseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
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
    context?: AIPromptContext
  ): Promise<{ success: boolean; data?: AIAnalysisResponse; error?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: `Le fournisseur IA "${this.providerType}" nécessite une variable d'environnement AI_API_KEY configurée dans votre fichier .env (ou utilisez Ollama en local).`,
      };
    }

    const { systemPrompt, userPrompt } = buildAIPrompt(resumeText, jobText, context);
    const isOllama = this.providerType === "ollama";

    // For Ollama, use the native /api/chat endpoint so we can explicitly pass options.num_ctx = 16384
    // (preventing the 4096-token default context shift that truncates JSON) and disable thinking mode.
    const ollamaOrigin = this.baseUrl.replace(/\/v1\/?$/, "").replace(/\/+$/, "");
    const endpoint = isOllama
      ? `${ollamaOrigin}/api/chat`
      : `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;

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

    const isThinkingModel = /qwen3|deepseek-r1|qwq/i.test(this.model);

    const bodyPayload = isOllama
      ? {
          model: this.model,
          stream: false,
          format: "json",
          ...(isThinkingModel ? { think: false } : {}),
          options: {
            temperature: 0.1,
            num_ctx: 16384,
            num_predict: 4096,
          },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }
      : {
          model: this.model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        };

    try {
      // Allow up to 5 minutes for local models (Ollama), 2 minutes for cloud APIs
      const timeoutMs = isOllama ? 300000 : 120000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      const content =
        jsonResponse.message?.content ?? jsonResponse.choices?.[0]?.message?.content;

      if (!content || typeof content !== "string") {
        return {
          success: false,
          error: "Réponse vide reçue du fournisseur IA.",
        };
      }

      const cleanJsonString = extractJsonFromContent(content);

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleanJsonString);
      } catch (parseErr) {
        return {
          success: false,
          error: `JSON malformé retourné par le LLM (${parseErr instanceof Error ? parseErr.message : "Erreur de syntaxe"}). Contenu brut : ${content.slice(0, 200)}…`,
        };
      }

      const validation = AIAnalysisResponseSchema.safeParse(parsed);

      if (!validation.success) {
        const issueDetails = validation.error.issues
          .map((i) => `${i.path.join(".") || "racine"}: ${i.message}`)
          .join(", ");
        return {
          success: false,
          error: `Format de réponse IA invalide (${issueDetails})`,
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
            error: "Délai d'attente dépassé lors de l'appel au fournisseur IA.",
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
