import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runSmartOrFastAnalysis } from "@/lib/analysis/smart-analyzer";
import { compareResumeAnalyses } from "@/lib/analysis/comparator";
import type { ParsedResume, ComparisonCandidate } from "@/types";

export const maxDuration = 90;

const CompareBodySchema = z.object({
  resumes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      data: z.custom<ParsedResume>((val) => val && typeof val === "object"),
    })
  ).min(2, "Au moins 2 CV sont nécessaires pour effectuer une comparaison."),
  jobDescription: z.string().min(15, "La description de l'offre est requise."),
  targetPosition: z.enum(["fullstack", "frontend", "mobile", "general"]).default("general"),
  mode: z.enum(["fast", "smart"]).default("fast"),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const validation = CompareBodySchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Requête de comparaison invalide",
          details: validation.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { resumes, jobDescription, targetPosition, mode } = validation.data;

    // Run analyses in parallel
    const candidates: ComparisonCandidate[] = await Promise.all(
      resumes.map(async (item) => {
        const result = await runSmartOrFastAnalysis(
          item.data,
          jobDescription,
          targetPosition,
          mode
        );
        return {
          id: item.id,
          label: item.label,
          fileName: item.data.fileName,
          result,
        };
      })
    );

    const firstJobTitle = candidates[0]?.result.job.title || "Offre d'emploi";
    const report = compareResumeAnalyses(candidates, firstJobTitle, targetPosition);

    return NextResponse.json({ success: true, report });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inattendue lors de la comparaison.";
    return NextResponse.json(
      { error: `Échec de la comparaison : ${message}` },
      { status: 500 }
    );
  }
}

