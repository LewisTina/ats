import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/provider";

export async function GET() {
  const provider = getAIProvider();
  return NextResponse.json({
    configured: provider.isConfigured(),
    providerName: provider.name,
    hasApiKey: Boolean(process.env.AI_API_KEY && process.env.AI_API_KEY.trim().length > 0),
    isLocalOllama: (process.env.AI_PROVIDER || "").toLowerCase() === "ollama",
  });
}
