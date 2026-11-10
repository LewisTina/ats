import { describe, it, expect } from "vitest";
import {
  analyzeJobDescription,
  extractExperienceRequirement,
  estimateCandidateExperience,
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
    const analyzed = analyzeJobDescription(sampleJobText);

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
    const analyzed = analyzeJobDescription(sampleJobText);

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

  it("extracts experience intervals without confusing the upper bound as minimum ('5 à 7 ans', '5 à 10 ans')", () => {
    const cases = [
      {
        text: "Profil : minimum 5 à 7 ans d'expérience sur des projets web.",
        min: 5,
        max: 7,
        label: "5 à 7 ans d'expérience",
      },
      {
        text: "Profil recherché :\n- 5 à 10 ans d'expérience\n- Maîtrise React / Next.js",
        min: 5,
        max: 10,
        label: "5 à 10 ans d'expérience",
      },
      {
        text: "Expérience souhaitée : entre 3 et 5 ans sur Node.js.",
        min: 3,
        max: 5,
        label: "3 à 5 ans d'expérience",
      },
      {
        text: "Seniority: 4 - 6 years of experience required",
        min: 4,
        max: 6,
        label: "4 à 6 ans d'expérience",
      },
      {
        text: "Au moins 5 ans d'expérience professionnelle.",
        min: 5,
        max: undefined,
        label: "5 ans d'expérience minimum",
      },
    ];

    for (const c of cases) {
      const exp = extractExperienceRequirement(c.text);
      expect(exp).toBeDefined();
      expect(exp?.minYears).toBe(c.min);
      expect(exp?.maxYears).toBe(c.max);
      expect(exp?.label).toBe(c.label);

      const job = analyzeJobDescription(c.text);
      expect(job.yearsOfExperienceRequired).toBe(c.min);
      expect(job.yearsOfExperienceMax).toBe(c.max);
      const expReq = job.requirements.find((r) => r.category === "experience_seniority");
      expect(expReq?.label).toBe(c.label);
      expect(expReq?.minYears).toBe(c.min);
      expect(expReq?.maxYears).toBe(c.max);
    }
  });

  it("confirms candidate with 5-6 years of experience when job asks for 'minimum 5 à 7 ans' or '5 à 10 ans'", () => {
    const jobText = `
      Poste : Développeur React / Next.js
      Profil recherché :
      - Minimum 5 à 7 ans d'expérience
      - React / Next.js / TypeScript
    `;
    const analyzed = analyzeJobDescription(jobText);

    const resume: ParsedResume = {
      rawText: `
        Développeur Front-End avec 6 ans d'expérience.
        EXPÉRIENCES
        2020 - 2026 : Développeur React / Next.js
      `,
      fileName: "cv.pdf",
      fileType: "pdf",
      fileSizeBytes: 10000,
      pageCount: 1,
      sections: [
        {
          title: "Expériences",
          category: "experience",
          content: "2020 - 2026 : Développeur React / Next.js",
          confidence: 0.95,
        },
      ],
      detectedSkills: ["React", "Next.js", "TypeScript"],
      contactInfo: {
        hasEmail: true,
        hasPhone: true,
        hasLocation: true,
        hasLinkedIn: false,
        hasGitHub: false,
      },
      extractionWarnings: [],
      isScannedOrEmpty: false,
    };

    const est = estimateCandidateExperience(resume);
    expect(est.years).toBe(6);

    const matches = matchRequirements(analyzed.requirements, resume);
    const expMatch = matches.find((m) => m.category === "experience_seniority");
    expect(expMatch).toBeDefined();
    expect(expMatch?.requirementLabel).toBe("5 à 7 ans d'expérience");
    expect(expMatch?.status).toBe("confirmed");
    expect(expMatch?.comment).toContain("5 à 7 ans");
  });

  it("extracts full 6-year span from French month-year intervals ('Septembre 2020 – Janvier 2022', 'Décembre 2023 – Septembre 2026')", () => {
    const resumeWithMonths: ParsedResume = {
      rawText: `
        PROFIL
        Développeur web depuis 2020, en entreprise et en freelance.
        EXPÉRIENCES PROFESSIONNELLES
        Développeur Full Stack Web et Mobile - CPG Consulting
        Décembre 2023 – Septembre 2026
        Développeur web et mobile freelance
        Depuis 2022
        Développeur web & Graphic Designer - Pro Deco
        Septembre 2020 – Janvier 2022
      `,
      fileName: "cv.pdf",
      fileType: "pdf",
      fileSizeBytes: 15000,
      pageCount: 1,
      sections: [
        {
          title: "PROFIL",
          category: "summary",
          content: "Développeur web depuis 2020, en entreprise et en freelance.",
          confidence: 0.95,
        },
        {
          title: "EXPÉRIENCES PROFESSIONNELLES",
          category: "experience",
          content: `
            Développeur Full Stack Web et Mobile - CPG Consulting
            Décembre 2023 – Septembre 2026
            Développeur web et mobile freelance
            Depuis 2022
            Développeur web & Graphic Designer - Pro Deco
            Septembre 2020 – Janvier 2022
          `,
          confidence: 0.95,
        },
      ],
      detectedSkills: ["React", "TypeScript"],
      contactInfo: {
        hasEmail: true,
        hasPhone: true,
        hasLocation: true,
        hasLinkedIn: false,
        hasGitHub: false,
      },
      extractionWarnings: [],
      isScannedOrEmpty: false,
    };

    const est = estimateCandidateExperience(resumeWithMonths);
    expect(est.years).toBe(6);
    expect(est.proof).toContain("2020 à 2026");
  });
});

