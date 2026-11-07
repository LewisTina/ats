import { describe, it, expect } from "vitest";
import { runDeterministicAnalysis } from "@/lib/analysis";
import { runSmartOrFastAnalysis } from "@/lib/analysis/smart-analyzer";
import type { ParsedResume } from "@/types";

describe("Full Deterministic & Smart Analysis Pipeline", () => {
  const mockResume: ParsedResume = {
    rawText: `
      Alexandre Martin
      alex.martin@example.fr | 06 99 88 77 66 | Lyon, France
      LinkedIn: linkedin.com/in/alexmartin | GitHub: github.com/alexmartin

      PROFIL
      Développeur Full-Stack avec 5 ans d'expérience sur architectures modernes React et Node.js.

      EXPÉRIENCES
      2020 - 2024 : Développeur Senior Full-Stack - SaaS Corp
      - Développement d'une interface réactive avec React, Next.js et Tailwind CSS
      - Architecture d'API REST avec Node.js, TypeScript et PostgreSQL
      - Automatisation des tests avec Vitest et mise en place de pipelines CI/CD
      - Conteneurisation avec Docker

      FORMATION
      Master Informatique - Université de Lyon

      COMPÉTENCES
      TypeScript, JavaScript, React, Next.js, Node.js, PostgreSQL, Docker, Vitest, CI/CD, Git
    `.trim(),
    fileName: "cv_alexandre_martin.pdf",
    fileType: "pdf",
    fileSizeBytes: 32000,
    pageCount: 1,
    sections: [
      { title: "Contact", category: "contact", content: "Email & Tel", confidence: 1 },
      { title: "Profil", category: "summary", content: "Développeur...", confidence: 1 },
      { title: "Expériences", category: "experience", content: "2020 - 2024...", confidence: 1 },
      { title: "Formation", category: "education", content: "Master...", confidence: 1 },
      { title: "Compétences", category: "skills", content: "TypeScript, React...", confidence: 1 },
    ],
    detectedSkills: [
      "TypeScript",
      "JavaScript",
      "React",
      "Next.js",
      "Node.js",
      "PostgreSQL",
      "Docker",
      "Vitest",
      "CI/CD",
      "Git",
    ],
    contactInfo: {
      hasEmail: true,
      hasPhone: true,
      hasLocation: true,
      hasLinkedIn: true,
      hasGitHub: true,
    },
    extractionWarnings: [],
    isScannedOrEmpty: false,
  };

  const jobDescription = `
    Poste : Développeur Full-Stack Senior (React / Node.js)
    Exigences :
    - Au moins 4 ans d'expérience professionnelle requis.
    - Maîtrise indispensable de TypeScript, React et Node.js.
    - Bonne expérience sur PostgreSQL et Docker.
    - Pratique des tests unitaires (Vitest ou Jest).
    - Connaissance de Kubernetes appréciée (bonus).
  `;

  it("executes complete deterministic analysis without any API keys or network calls", () => {
    const result = runDeterministicAnalysis(
      mockResume,
      jobDescription,
      "fullstack",
      "fast"
    );

    expect(result.atsScore.total).toBeGreaterThanOrEqual(85);
    expect(result.matchingScore.total).toBeGreaterThanOrEqual(80);
    expect(result.matchingScore.blockingRequirementsFailed).toHaveLength(0);

    // Confirmed skills must include React, Node.js, TypeScript, PostgreSQL, Docker
    const confirmedNames = result.confirmedSkills.map((s) => s.name);
    expect(confirmedNames).toContain("React");
    expect(confirmedNames).toContain("Node.js");
    expect(confirmedNames).toContain("TypeScript");
    expect(confirmedNames).toContain("PostgreSQL");
    expect(confirmedNames).toContain("Docker");

    // Recommendations must be prioritized and non-empty
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.summary.strengths.length).toBeGreaterThan(0);
  });

  it("executes smart mode with graceful fallback when AI key is missing", async () => {
    const result = await runSmartOrFastAnalysis(
      mockResume,
      jobDescription,
      "fullstack",
      "smart"
    );

    // Should return result gracefully without throwing
    expect(result.mode).toBe("smart");
    expect(result.atsScore.total).toBeGreaterThanOrEqual(85);
    expect(result.matchingScore.total).toBeGreaterThanOrEqual(80);

    // If no key in test environment, aiEnriched is false and aiErrorMessage is populated
    if (!result.aiEnriched) {
      expect(result.aiErrorMessage).toBeDefined();
    }
  });
});
