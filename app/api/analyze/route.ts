import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runSmartOrFastAnalysis } from "@/lib/analysis/smart-analyzer";
import type { ParsedResume } from "@/types";

export const maxDuration = 60;

const RequestBodySchema = z.object({
  resume: z.custom<ParsedResume>((val) => val && typeof val === "object"),
  jobDescription: z.string().min(15, "La description de l'offre doit contenir au moins 15 caractères."),
  targetPosition: z.enum(["fullstack", "frontend", "mobile", "general"]).default("general"),
  mode: z.enum(["fast", "smart"]).default("fast"),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const validation = RequestBodySchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Requête invalide",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { resume, jobDescription, targetPosition, mode } = validation.data;

    const result = await runSmartOrFastAnalysis(
      resume,
      jobDescription,
      targetPosition,
      mode
    );

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inattendue lors de l'analyse.";
    return NextResponse.json(
      { error: `Échec de l'analyse : ${message}` },
      { status: 500 }
    );
  }
}

