import type { ExtractionWarning } from "@/types";

export interface PdfParseResult {
  rawText: string;
  pageCount: number;
  warnings: ExtractionWarning[];
  isScannedOrEmpty: boolean;
}

interface TextItem {
  str: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export async function parsePdfBuffer(buffer: Buffer | Uint8Array): Promise<PdfParseResult> {
  const warnings: ExtractionWarning[] = [];
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  try {
    const loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    });

    const doc = await loadingTask.promise;
    const pageCount = doc.numPages;
    const pagesText: string[] = [];
    let totalTextLength = 0;

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const items: TextItem[] = [];

      for (const item of content.items) {
        if ("str" in item && typeof item.str === "string") {
          const str = item.str.trim();
          if (!str) continue;

          // transform is [scaleX, skewY, skewX, scaleY, transX, transY]
          const x = item.transform ? item.transform[4] : 0;
          const y = item.transform ? item.transform[5] : 0;
          items.push({
            str: item.str,
            x,
            y,
            width: item.width,
            height: item.height,
          });
        }
      }

      // Group items by line (clustering items with close Y values within tolerance ~4pt)
      const sortedByY = [...items].sort((a, b) => b.y - a.y);
      const lines: TextItem[][] = [];
      const yTolerance = 4;

      for (const item of sortedByY) {
        let placed = false;
        for (const line of lines) {
          const avgY = line.reduce((sum, it) => sum + it.y, 0) / line.length;
          if (Math.abs(avgY - item.y) <= yTolerance) {
            line.push(item);
            placed = true;
            break;
          }
        }
        if (!placed) {
          lines.push([item]);
        }
      }

      // Sort each line from left to right (increasing X) and assemble text
      const pageLines = lines.map((line) => {
        line.sort((a, b) => a.x - b.x);
        return line.map((it) => it.str).join(" ").replace(/\s{2,}/g, " ").trim();
      }).filter((line) => line.length > 0);

      const pageText = pageLines.join("\n");
      pagesText.push(pageText);
      totalTextLength += pageText.length;
    }

    const fullRawText = pagesText.join("\n\n").trim();

    // Check for scanned / image-only / empty PDF
    const avgCharsPerPage = pageCount > 0 ? totalTextLength / pageCount : 0;
    const isScannedOrEmpty = totalTextLength < 80 || avgCharsPerPage < 50;

    if (isScannedOrEmpty) {
      warnings.push({
        code: "SCANNED_OR_EMPTY_PDF",
        severity: "error",
        message: "Le document contient très peu ou pas de texte exploitable (probablement un document scanné ou vectorisé en image).",
        recommendation: "Exportez votre CV directement en PDF texte depuis votre logiciel de traitement de texte (Word, Pages, Google Docs, LaTeX, Figma avec plugins texte natifs).",
      });
    } else {
      if (avgCharsPerPage < 150) {
        warnings.push({
          code: "LOW_TEXT_DENSITY",
          severity: "warning",
          message: "Densité textuelle faible. Certaines informations peuvent être encapsulées dans des visuels ou des blocs non indexables.",
          recommendation: "Vérifiez que toutes les expériences et compétences sont bien présentes sous forme de texte sélectionnable.",
        });
      }

      // Check for common multi-column interleaved text issues
      const linesWithWeirdJumps = pagesText.some((p) => /^[a-z0-9]/i.test(p) && p.includes("    "));
      if (linesWithWeirdJumps) {
        warnings.push({
          code: "MULTI_COLUMN_POSSIBLE",
          severity: "info",
          message: "Mise en page possiblement multi-colonnes détectée.",
          recommendation: "Les ATS lisent de gauche à droite. Assurez-vous que l'ordre des sections reste logique en texte brut.",
        });
      }
    }

    return {
      rawText: fullRawText,
      pageCount,
      warnings,
      isScannedOrEmpty,
    };
  } catch (error) {
    return {
      rawText: "",
      pageCount: 0,
      warnings: [
        {
          code: "PDF_PARSE_FAILED",
          severity: "error",
          message: error instanceof Error ? `Erreur lors de la lecture du PDF : ${error.message}` : "Impossible de lire le fichier PDF.",
          recommendation: "Vérifiez que le fichier PDF n'est pas protégé par mot de passe ni corrompu.",
        },
      ],
      isScannedOrEmpty: true,
    };
  }
}
