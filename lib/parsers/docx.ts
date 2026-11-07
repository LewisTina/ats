import mammoth from "mammoth";
import type { ExtractionWarning } from "@/types";

export interface DocxParseResult {
  rawText: string;
  warnings: ExtractionWarning[];
  isScannedOrEmpty: boolean;
}

export async function parseDocxBuffer(buffer: Buffer): Promise<DocxParseResult> {
  const warnings: ExtractionWarning[] = [];

  try {
    const result = await mammoth.extractRawText({ buffer });
    const rawText = (result.value || "").trim();

    for (const msg of result.messages) {
      if (msg.type === "warning") {
        warnings.push({
          code: "DOCX_FORMAT_WARNING",
          severity: "info",
          message: msg.message,
        });
      }
    }

    const isScannedOrEmpty = rawText.length < 60;
    if (isScannedOrEmpty) {
      warnings.push({
        code: "DOCX_EMPTY",
        severity: "error",
        message: "Le fichier DOCX ne contient aucun texte exploitable.",
        recommendation: "Assurez-vous que le document Word contient du texte brut et non uniquement des images intégrées.",
      });
    }

    return {
      rawText,
      warnings,
      isScannedOrEmpty,
    };
  } catch (error) {
    return {
      rawText: "",
      warnings: [
        {
          code: "DOCX_PARSE_FAILED",
          severity: "error",
          message: error instanceof Error ? `Erreur lors de la lecture du fichier Word : ${error.message}` : "Impossible d'extraire le texte du fichier DOCX.",
          recommendation: "Vérifiez que le document n'est pas corrompu ou protégé.",
        },
      ],
      isScannedOrEmpty: true,
    };
  }
}
