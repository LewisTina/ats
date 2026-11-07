import { NextRequest, NextResponse } from "next/server";
import { parseResumeFile } from "@/lib/parsers";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier n'a été fourni." },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (!extension || !["pdf", "docx", "doc"].includes(extension)) {
      return NextResponse.json(
        {
          error:
            "Format de fichier non pris en charge. Veuillez importer un document PDF ou DOCX.",
        },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error:
            "Le fichier dépasse la taille maximale autorisée de 10 Mo.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await parseResumeFile(buffer, fileName);

    return NextResponse.json({ success: true, resume: parsed });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inattendue lors de l'extraction.";
    return NextResponse.json(
      { error: `Échec du traitement du fichier : ${message}` },
      { status: 500 }
    );
  }
}
