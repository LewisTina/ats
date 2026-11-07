import type {
  ParsedResume,
  ResumeSection,
  ExtractionWarning,
  FileType,
} from "@/types";
import { extractSkillsFromText } from "@/lib/analysis/skill-normalizer";

const SECTION_PATTERNS: Array<{
  category: ResumeSection["category"];
  regex: RegExp;
  title: string;
}> = [
  {
    category: "contact",
    regex: /^(contact|coordonn[ée]es|infos|informations personnelles)/i,
    title: "Contact",
  },
  {
    category: "summary",
    regex: /^(profil|resume|r[ée]sum[ée]|about(?:\s+me)?|[àa]\s+propos|synth[èe]se)/i,
    title: "Profil & Synthèse",
  },
  {
    category: "experience",
    regex: /^(exp[ée]riences?(?:\s+professionnelles?)?|work(?:\s+history|\s+experience)?|parcours(?:\s+professionnel)?)/i,
    title: "Expériences professionnelles",
  },
  {
    category: "education",
    regex: /^(formations?|education|dipl[ôo]mes?|cursus(?:\s+acad[ée]mique)?|etudes)/i,
    title: "Formation & Diplômes",
  },
  {
    category: "skills",
    regex: /^(comp[ée]tences?(?:\s+techniques?)?|skills|technologies|expertise|stack(?:\s+technique)?)/i,
    title: "Compétences",
  },
  {
    category: "projects",
    regex: /^(projets?(?:\s+personnels?)?|r[ée]alisations?|portfolio|side[\s\-_]projects?)/i,
    title: "Projets & Réalisations",
  },
  {
    category: "languages",
    regex: /^(langues?|languages)/i,
    title: "Langues",
  },
];

export function structureResume(
  rawText: string,
  fileName: string,
  fileType: FileType,
  fileSizeBytes: number,
  pageCount: number = 1,
  initialWarnings: ExtractionWarning[] = [],
  isScannedOrEmpty: boolean = false
): ParsedResume {
  const warnings: ExtractionWarning[] = [...initialWarnings];

  // Contact info extraction
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}|\b\+?[1-9]\d{1,14}\b/;
  const linkedInRegex = /(?:linkedin\.com\/in\/|linkedin:\s*)[a-zA-Z0-9_-]+/i;
  const gitHubRegex = /(?:github\.com\/|github:\s*)[a-zA-Z0-9_-]+/i;
  const locationRegex = /\b(paris|lyon|marseille|toulouse|nantes|bordeaux|lille|strasbourg|rennes|remote|t[ée]l[ée]travail|france|ile[\s\-_]de[\s\-_]france)\b/i;

  const hasEmail = emailRegex.test(rawText);
  const hasPhone = phoneRegex.test(rawText);
  const hasLinkedIn = linkedInRegex.test(rawText);
  const hasGitHub = gitHubRegex.test(rawText);
  const hasLocation = locationRegex.test(rawText);

  if (!isScannedOrEmpty) {
    if (!hasEmail) {
      warnings.push({
        code: "MISSING_EMAIL",
        severity: "warning",
        message: "Aucune adresse e-mail détectée dans le texte du CV.",
        recommendation: "Ajoutez une adresse e-mail clairement visible en haut du CV.",
      });
    }
    if (!hasPhone) {
      warnings.push({
        code: "MISSING_PHONE",
        severity: "info",
        message: "Aucun numéro de téléphone détecté.",
        recommendation: "Indiquez votre numéro de téléphone avec l'indicatif international si pertinent.",
      });
    }
  }

  // Section splitting
  const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const sections: ResumeSection[] = [];
  let currentSection: ResumeSection = {
    title: "En-tête & Coordonnées",
    category: "contact",
    content: "",
    confidence: 0.8,
  };

  for (const line of lines) {
    let matchedPattern: (typeof SECTION_PATTERNS)[0] | null = null;

    // Check if the line looks like a section header (short line, uppercase or bold styled, matches header regex)
    if (line.length <= 45) {
      for (const pattern of SECTION_PATTERNS) {
        if (pattern.regex.test(line)) {
          matchedPattern = pattern;
          break;
        }
      }
    }

    if (matchedPattern) {
      if (currentSection.content.trim()) {
        sections.push({ ...currentSection, content: currentSection.content.trim() });
      }
      currentSection = {
        title: line,
        category: matchedPattern.category,
        content: "",
        confidence: 0.95,
      };
    } else {
      currentSection.content += line + "\n";
    }
  }

  if (currentSection.content.trim()) {
    sections.push({ ...currentSection, content: currentSection.content.trim() });
  }

  // If no sections were identified, keep the whole text as general
  if (sections.length <= 1 && rawText.length > 100) {
    warnings.push({
      code: "NO_STANDARD_SECTIONS",
      severity: "warning",
      message: "Les titres de rubriques standards (Expériences, Compétences, Formation) n'ont pas été identifiés nettement.",
      recommendation: "Utilisez des titres de sections explicites ('Expérience professionnelle', 'Compétences', 'Formation') séparés par des retours à la ligne.",
    });
  }

  // Detect skills
  const detectedSkills = extractSkillsFromText(rawText);

  return {
    rawText,
    fileName,
    fileType,
    fileSizeBytes,
    pageCount,
    sections,
    detectedSkills,
    contactInfo: {
      hasEmail,
      hasPhone,
      hasLocation,
      hasLinkedIn,
      hasGitHub,
    },
    extractionWarnings: warnings,
    isScannedOrEmpty,
  };
}

