import { describe, it, expect } from "vitest";
import {
  normalizeSkill,
  isSkillPresentInText,
  extractSkillsFromText,
} from "@/lib/analysis/skill-normalizer";

describe("Skill Normalizer & Anti-False Positives", () => {
  it("normalizes common synonyms to canonical names", () => {
    expect(normalizeSkill("react.js")).toBe("React");
    expect(normalizeSkill("reactjs")).toBe("React");
    expect(normalizeSkill("react-native")).toBe("React Native");
    expect(normalizeSkill("node")).toBe("Node.js");
    expect(normalizeSkill("postgres")).toBe("PostgreSQL");
    expect(normalizeSkill("cicd")).toBe("CI/CD");
    expect(normalizeSkill("k8s")).toBe("Kubernetes");
  });

  it("strictly distinguishes JavaScript from Java (No false positives)", () => {
    const jsOnlyText = "Développeur Full-Stack expert en JavaScript ES6, TypeScript et Node.js.";

    // Should find JavaScript
    const jsCheck = isSkillPresentInText("JavaScript", jsOnlyText);
    expect(jsCheck.present).toBe(true);

    // Should NOT find Java
    const javaCheck = isSkillPresentInText("Java", jsOnlyText);
    expect(javaCheck.present).toBe(false);

    // Text with explicit Java
    const javaText = "Expérience de 3 ans sur backend Java avec Spring Boot et Hibernate.";
    const javaCheck2 = isSkillPresentInText("Java", javaText);
    expect(javaCheck2.present).toBe(true);
  });

  it("strictly distinguishes React from React Native (No false positives)", () => {
    const webReactText = "Lead Front-End React 18, Next.js et Tailwind CSS pour application web.";

    // React is present
    expect(isSkillPresentInText("React", webReactText).present).toBe(true);

    // React Native must NOT be present
    expect(isSkillPresentInText("React Native", webReactText).present).toBe(false);

    // Mobile text
    const mobileText = "Développement d'application iOS / Android sous React Native et Expo.";
    expect(isSkillPresentInText("React Native", mobileText).present).toBe(true);
  });

  it("strictly distinguishes Docker from Kubernetes", () => {
    const dockerText = "Conteneurisation d'applications avec Docker et Docker Compose.";
    expect(isSkillPresentInText("Docker", dockerText).present).toBe(true);
    expect(isSkillPresentInText("Kubernetes", dockerText).present).toBe(false);
  });

  it("extracts multiple distinct skills accurately from text", () => {
    const text = `
      Stack technique :
      - TypeScript, React, Next.js
      - Node.js, PostgreSQL, Docker
      - Vitest, Git, CI/CD
    `;
    const skills = extractSkillsFromText(text);

    expect(skills).toContain("TypeScript");
    expect(skills).toContain("React");
    expect(skills).toContain("Next.js");
    expect(skills).toContain("Node.js");
    expect(skills).toContain("PostgreSQL");
    expect(skills).toContain("Docker");
    expect(skills).toContain("Vitest");
    expect(skills).toContain("CI/CD");

    // Must NOT contain Java or Flutter
    expect(skills).not.toContain("Java");
    expect(skills).not.toContain("Flutter");
  });
});

