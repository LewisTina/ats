import { describe, it, expect } from "vitest";
import { evaluateATSReadability } from "@/lib/analysis/ats-checker";
import type { ParsedResume } from "@/types";

describe("ATS Checker & Readability Evaluation", () => {
  it("flags empty or scanned documents as non-évaluable with 0 score", () => {
    const scannedResume: ParsedResume = {
      rawText: "Scanned image without clear text",
      fileName: "scan_cv.pdf",
      fileType: "pdf",
      fileSizeBytes: 2048,
      pageCount: 1,
      sections: [],
      detectedSkills: [],
      contactInfo: {
        hasEmail: false,
        hasPhone: false,
        hasLocation: false,
        hasLinkedIn: false,
        hasGitHub: false,
      },
      extractionWarnings: [],
      isScannedOrEmpty: true,
    };

    const { score, diagnostics } = evaluateATSReadability(scannedResume);

    expect(score.total).toBe(0);
    expect(score.ratingLabel).toContain("non évaluable");
    expect(diagnostics.some((d) => d.id === "ats-diag-scanned")).toBe(true);
  });

  it("calculates high ATS score for well-structured resume with email and standard sections", () => {
    const validResume: ParsedResume = {
      rawText: `
        Jean Dupont - Développeur Full-Stack
        Email: jean.dupont@example.com | Tel: 06 12 34 56 78 | Paris, France
        GitHub: github.com/jeandupont | LinkedIn: linkedin.com/in/jeandupont

        PROFIL
        Ingénieur logiciel passionné par le développement d'applications web réactives.

        EXPÉRIENCES PROFESSIONNELLES
        2021 - 2024 : Tech Lead Full-Stack chez TechCorp
        - Conception d'architecture sous Next.js et Node.js
        - Gestion d'une base de données PostgreSQL

        FORMATIONS
        2019 : Diplôme d'Ingénieur en Informatique

        COMPÉTENCES
        TypeScript, React, Node.js, PostgreSQL, Docker, Git
      `.trim(),
      fileName: "cv_jean_dupont.pdf",
      fileType: "pdf",
      fileSizeBytes: 45000,
      pageCount: 1,
      sections: [
        { title: "Contact", category: "contact", content: "Email & Tel", confidence: 1 },
        { title: "Profil", category: "summary", content: "Ingénieur...", confidence: 1 },
        { title: "Expériences", category: "experience", content: "2021...", confidence: 1 },
        { title: "Formations", category: "education", content: "Diplôme...", confidence: 1 },
        { title: "Compétences", category: "skills", content: "TypeScript...", confidence: 1 },
      ],
      detectedSkills: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Docker", "Git"],
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

    const { score, diagnostics } = evaluateATSReadability(validResume);

    expect(score.total).toBeGreaterThanOrEqual(85);
    expect(score.essentialContact).toBe(20);
    expect(score.structureSections).toBe(25);
    expect(diagnostics.filter((d) => d.severity === "high").length).toBe(0);
  });

  it("penalizes missing email and missing experience section with actionable diagnostics", () => {
    const incompleteResume: ParsedResume = {
      rawText: `
        Candidat Anonyme sans coordonnées identifiées.
        Profil : Développeur passionné par le Web.
        Compétences techniques : React, CSS, HTML.
        Projets personnels : Création d'un blog et d'une application de to-do list.
      `.trim(),
      fileName: "cv_incomplete.docx",
      fileType: "docx",
      fileSizeBytes: 10000,
      pageCount: 1,
      sections: [
        { title: "Compétences", category: "skills", content: "React, CSS, HTML", confidence: 0.9 },
        { title: "Projets", category: "projects", content: "Création d'un blog", confidence: 0.9 },
      ],
      detectedSkills: ["React", "HTML / CSS"],
      contactInfo: {
        hasEmail: false,
        hasPhone: false,
        hasLocation: false,
        hasLinkedIn: false,
        hasGitHub: false,
      },
      extractionWarnings: [],
      isScannedOrEmpty: false,
    };

    const { score, diagnostics } = evaluateATSReadability(incompleteResume);

    expect(score.essentialContact).toBe(0);
    expect(score.total).toBeLessThan(65);
    expect(diagnostics.some((d) => d.id === "ats-diag-no-email")).toBe(true);
    expect(diagnostics.some((d) => d.id === "ats-diag-no-exp")).toBe(true);
  });
});
