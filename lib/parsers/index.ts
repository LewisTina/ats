import type { ParsedResume, FileType } from "@/types";
import { parsePdfBuffer } from "./pdf";
import { parseDocxBuffer } from "./docx";
import { structureResume } from "./resume-structure";

export async function parseResumeFile(
  buffer: Buffer,
  fileName: string
): Promise<ParsedResume> {
  const extension = fileName.split(".").pop()?.toLowerCase();

  let fileType: FileType = "pdf";
  if (extension === "docx" || extension === "doc") {
    fileType = "docx";
  }

  if (fileType === "pdf") {
    const pdfResult = await parsePdfBuffer(buffer);
    return structureResume(
      pdfResult.rawText,
      fileName,
      fileType,
      buffer.length,
      pdfResult.pageCount,
      pdfResult.warnings,
      pdfResult.isScannedOrEmpty
    );
  } else {
    const docxResult = await parseDocxBuffer(buffer);
    return structureResume(
      docxResult.rawText,
      fileName,
      fileType,
      buffer.length,
      1,
      docxResult.warnings,
      docxResult.isScannedOrEmpty
    );
  }
}

