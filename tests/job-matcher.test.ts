import { describe, it, expect } from "vitest";
import {
  analyzeJobDescription,
  matchRequirements,
} from "@/lib/analysis/job-matcher";
import type { ParsedResume } from "@/types";

describe("Job Requirement Analysis & Deterministic Matching", () => {
  const sampleJobText = `
    Poste : Développeur Full-Stack Senior
    Expérience : Minimum 5 ans d'expérience requis.

    Missions :
    - Développement sur React et Next.js (maîtrise indispensable).
    - API avec Node.js et PostgreSQL.
    - Docker obligatoire pour les déploiements.
    - Connaissance de Kubernetes et AWS appréciée (bonus).
    - Anglais professionnel courant requis.
  `;

  it("extracts requirements, differentiates required vs bonus", () => {
    const analyzed = analyzeJobDescription(sampleJobText, "fullstack");

    expect(analyzed.title).toContain("Full-Stack Senior");
    expect(analyzed.yearsOfExperienceRequired).toBe(5);

    // React, Node.js, TypeScript/Next.js, Docker should be required
    const reactReq = analyzed.requirements.find((r) => r.normalizedName === "React");
    expect(reactReq).toBeDefined();
    expect(reactReq?.required).toBe(true);

    const dockerReq = analyzed.requirements.find((r) => r.normalizedName === "Docker");
    expect(dockerReq).toBeDefined();
    expect(dockerReq?.required).toBe(true);

    // Kubernetes should be bonus (appréciée / bonus)
    const k8sReq = analyzed.requirements.find((r) => r.normalizedName === "Kubernetes");
    expect(k8sReq).toBeDefined();
    expect(k8sReq?.required).toBe(false);
  });

  it("identifies confirmed, partial and missing skills with exact proofs", () => {
    const analyzed = analyzeJobDescription(sampleJobText, "fullstack");

    const resume: ParsedResume = {
      rawText: `
        Jean Dev
        jean@test.com
        Expériences :
        2018 - 2024 (6 ans d'expérience) : Développeur Web Senior chez StudioTech.
        - Développement d'applications React et Next.js avec PostgreSQL.
        - Conteneurisation des services avec Docker.
        - Anglais courant : travail avec équipes internationales.
      `,
      fileName: "cv.pdf",
      fileType: "pdf",
      fileSizeBytes: 20000,
      pageCount: 1,
      sections: [],
      detectedSkills: ["React", "Next.js", "PostgreSQL", "Docker"],
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

    const matches = matchRequirements(analyzed.requirements, resume);

    // React should be confirmed
    const reactMatch = matches.find((m) => m.requirementLabel === "React");
    expect(reactMatch?.status).toBe("confirmed");
    expect(reactMatch?.proofInResume).toBeDefined();

    // Docker should be confirmed
    const dockerMatch = matches.find((m) => m.requirementLabel === "Docker");
    expect(dockerMatch?.status).toBe("confirmed");

    // Kubernetes should be partial or missing (since resume only has Docker)
    const k8sMatch = matches.find((m) => m.requirementLabel === "Kubernetes");
    expect(k8sMatch?.status).toBe("partial"); // Docker detected as partial foundation for K8s

    // AWS should be missing
    const awsMatch = matches.find((m) => m.requirementLabel === "AWS");
    expect(awsMatch?.status).toBe("missing");
  });
});
