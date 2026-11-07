import { describe, it, expect } from "vitest";
import { parsePdfBuffer } from "@/lib/parsers/pdf";
import { parseResumeFile } from "@/lib/parsers";

describe("PDF Parser Real Buffer Parsing", () => {
  // Valid minimal PDF containing text
  const pdfString = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Resources <<
    /Font <<
      /F1 4 0 R
    >>
  >>
  /Contents 5 0 R
>>
endobj
4 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
5 0 obj
<< /Length 205 >>
stream
BT
/F1 12 Tf
72 712 Td
(PIERRE LEWIS TINA) Tj
0 -20 Td
(Developpeur Full Stack Web et Mobile) Tj
0 -20 Td
(contact@lewistina.com | Tel: 06 00 00 00 00) Tj
0 -20 Td
(Competences : React, Next.js, Node.js, TypeScript, PostgreSQL) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000341 00000 n 
trailer
<<
  /Size 6
  /Root 1 0 R
>>
startxref
597
%%EOF`;

  it("parses PDF from Node Buffer without 'Please provide binary data as Uint8Array' error", async () => {
    const pdfBuffer = Buffer.from(pdfString, "latin1");

    const result = await parsePdfBuffer(pdfBuffer);

    expect(result.pageCount).toBe(1);
    expect(result.rawText).toContain("PIERRE LEWIS TINA");
    expect(result.rawText).toContain("Developpeur Full Stack Web et Mobile");
    expect(result.warnings.filter((w) => w.code === "PDF_PARSE_FAILED")).toHaveLength(0);
  });

  it("structures full parsed resume with sections, skills, and email from PDF", async () => {
    const pdfBuffer = Buffer.from(pdfString, "latin1");

    const parsedResume = await parseResumeFile(pdfBuffer, "cv_pierre_lewis_tina.pdf");

    expect(parsedResume.fileName).toBe("cv_pierre_lewis_tina.pdf");
    expect(parsedResume.fileType).toBe("pdf");
    expect(parsedResume.contactInfo.hasEmail).toBe(true);
    expect(parsedResume.detectedSkills).toContain("React");
    expect(parsedResume.detectedSkills).toContain("Next.js");
    expect(parsedResume.detectedSkills).toContain("Node.js");
    expect(parsedResume.detectedSkills).toContain("TypeScript");
    expect(parsedResume.detectedSkills).toContain("PostgreSQL");
    expect(parsedResume.isScannedOrEmpty).toBe(false);
  });
});

