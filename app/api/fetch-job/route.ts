import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FetchJobError, safeFetchHtml } from "@/lib/scraping/safe-fetch";
import { extractJobFromHtml, MIN_JOB_TEXT_LENGTH } from "@/lib/scraping/job-extractor";

export const runtime = "nodejs";
export const maxDuration = 30;

const RequestBodySchema = z.object({
  url: z.string().trim().min(1, "L'URL est requise.").max(2048, "URL trop longue."),
});

export async function POST(req: NextRequest) {
  try {
    const validation = RequestBodySchema.safeParse(await req.json().catch(() => null));
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Requête invalide." },
        { status: 400 }
      );
    }

    const { html, finalUrl } = await safeFetchHtml(validation.data.url);
    const job = extractJobFromHtml(html);

    if (job.text.length < MIN_JOB_TEXT_LENGTH) {
      throw new FetchJobError(
        "Contenu de l'offre introuvable sur la page (site rendu en JavaScript ou connexion requise). Copiez-collez le texte de l'offre.",
        422
      );
    }

    return NextResponse.json({
      success: true,
      title: job.title,
      text: job.text,
      source: job.source,
      url: finalUrl,
    });
  } catch (error) {
    if (error instanceof FetchJobError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Erreur inattendue lors de la récupération de l'offre." },
      { status: 500 }
    );
  }
}
