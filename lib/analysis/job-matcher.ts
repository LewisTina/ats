import { z } from "zod";
import type {
  AnalyzedJob,
  JobRequirement,
  ParsedResume,
  RequirementMatch,
  TargetPosition,
} from "@/types";
import {
  extractSkillsFromText,
  isSkillPresentInText,
  normalizeSkill,
  SKILL_CATALOG,
} from "./skill-normalizer";

export const JobRequirementSchema = z.object({
  id: z.string(),
  label: z.string(),
  normalizedName: z.string(),
  category: z.enum([
    "technical_skill",
    "framework_tool",
    "experience_seniority",
    "soft_skill",
    "education_degree",
    "language",
    "responsibility",
    "methodology",
    "other",
  ]),
  required: z.boolean(),
  sourceText: z.string(),
  importance: z.number().min(1).max(5),
});

export const AnalyzedJobSchema = z.object({
  rawText: z.string(),
  title: z.string().optional(),
  targetPosition: z.enum(["fullstack", "frontend", "mobile", "general"]),
  requirements: z.array(JobRequirementSchema),
  seniorityRequired: z.string().optional(),
  yearsOfExperienceRequired: z.number().optional(),
  languages: z.array(z.string()),
  remotePolicy: z.string().optional(),
});

// Markers for required vs preferred
const REQUIRED_MARKERS = [
  "obligatoire",
  "indispensable",
  "requis",
  "requise",
  "exigé",
  "exigée",
  "impératif",
  "impérative",
  "must have",
  "required",
  "essential",
  "mandatory",
  "indispensables",
  "requis:",
];

const PREFERRED_MARKERS = [
  "souhaité",
  "souhaitée",
  "apprécié",
  "appréciée",
  "bonus",
  "un plus",
  "nice to have",
  "preferred",
  "plus appréciable",
  "atout",
  "optionnel",
  "idéalement",
];

export function analyzeJobDescription(
  jobText: string,
  targetPosition: TargetPosition = "general"
): AnalyzedJob {
  const requirements: JobRequirement[] = [];
  const lines = jobText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  // Extract job title candidate
  let title = "";
  for (const line of lines.slice(0, 5)) {
    if (
      /(d[ée]veloppeur|developer|ing[ée]nieur|engineer|lead|architect|consultant|full[\s\-_]stack|front[\s\-_]end|back[\s\-_]end|mobile)/i.test(
        line
      ) &&
      line.length < 90
    ) {
      title = line.replace(/^(poste\s*:\s*|intitul[ée]\s*:\s*|job\s*:\s*)/i, "").trim();
      break;
    }
  }
  if (!title && lines.length > 0 && lines[0].length < 80) {
    title = lines[0];
  }

  // Extract years of experience
  let yearsOfExp: number | undefined;
  const expMatch = jobText.match(
    /(?:au\s+moins|minimum|min\.?|\+)?\s*(\d+)\s*(?:ans?|ann[ée]es?|years?)\s*(?:d['’]exp[ée]rience|experience)?/i
  );
  if (expMatch && expMatch[1]) {
    const parsed = parseInt(expMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 25) {
      yearsOfExp = parsed;
    }
  }

  // Extract seniority
  let seniority: string | undefined;
  if (/\b(junior|d[ée]butant)\b/i.test(jobText)) seniority = "Junior";
  else if (/\b(lead|staff|principal|head of)\b/i.test(jobText)) seniority = "Lead / Staff";
  else if (/\b(senior|s[ée]nior|exp[ée]riment[ée])\b/i.test(jobText)) seniority = "Senior";
  else if (/\b(confirm[ée]|mid[\s\-_]level)\b/i.test(jobText)) seniority = "Confirmé";

  // Extract remote policy
  let remotePolicy: string | undefined;
  if (/\b(full\s*remote|100%\s*t[ée]l[ée]travail|remote\s*total)\b/i.test(jobText)) {
    remotePolicy = "Full Remote";
  } else if (/\b(hybride|hybrid|2\s*jours\s*de\s*t[ée]l[ée]travail|3\s*jours\s*de\s*t[ée]l[ée]travail)\b/i.test(jobText)) {
    remotePolicy = "Hybride";
  } else if (/\b(sur\s*site|pr[ée]sentiel|pas\s*de\s*t[ée]l[ée]travail)\b/i.test(jobText)) {
    remotePolicy = "Présentiel";
  }

  // Extract languages
  const languages: string[] = [];
  if (/\b(anglais|english|fluent\s+english|bilingue\s+anglais)\b/i.test(jobText)) {
    languages.push("Anglais");
  }
  if (/\b(fran[çc]ais|french)\b/i.test(jobText)) {
    languages.push("Français");
  }

  // Technical skills extraction
  const detectedSkills = extractSkillsFromText(jobText);
  let reqIndex = 1;

  for (const skillName of detectedSkills) {
    const canonical = normalizeSkill(skillName);
    const def = SKILL_CATALOG.find((s) => s.canonical === canonical);
    const category =
      def?.category === "mobile" || def?.category === "frontend" || def?.category === "backend"
        ? "technical_skill"
        : def?.category === "database" || def?.category === "devops" || def?.category === "testing"
        ? "framework_tool"
        : def?.category === "architecture"
        ? "responsibility"
        : "technical_skill";

    // Find sentence containing this skill to evaluate required vs preferred
    const escaped = canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sentenceRegex = new RegExp(`([^.!?\n]*?${escaped}[^.!?\n]*)`, "i");
    const sentenceMatch = jobText.match(sentenceRegex);
    const sentence = sentenceMatch ? sentenceMatch[1].toLowerCase() : "";

    // Check if in a section or sentence marked as "preferred" or "required"
    const hasPreferredMarker = PREFERRED_MARKERS.some((m) => sentence.includes(m));
    const hasRequiredMarker = REQUIRED_MARKERS.some((m) => sentence.includes(m));

    let isRequired = false;
    let importance = 3;

    if (hasRequiredMarker) {
      isRequired = true;
      importance = 5;
    } else if (hasPreferredMarker) {
      isRequired = false;
      importance = 2;
    } else {
      // Not explicitly marked as required or preferred
      // Only treat as required if it is the core skill of the target position
      if (
        (targetPosition === "frontend" && def?.category === "frontend") ||
        (targetPosition === "mobile" && def?.category === "mobile") ||
        (targetPosition === "fullstack" && (canonical === "React" || canonical === "Node.js" || canonical === "TypeScript"))
      ) {
        isRequired = true;
        importance = 4;
      } else {
        isRequired = false;
        importance = 3;
      }
    }

    requirements.push({
      id: `req-${reqIndex++}`,
      label: canonical,
      normalizedName: canonical,
      category,
      required: isRequired,
      sourceText: sentenceMatch ? sentenceMatch[1].trim() : canonical,
      importance,
    });
  }

  // Add experience / seniority requirement if identified
  if (yearsOfExp !== undefined) {
    requirements.push({
      id: `req-exp`,
      label: `${yearsOfExp} ans d'expérience minimum`,
      normalizedName: "experience_years",
      category: "experience_seniority",
      required: true,
      sourceText: expMatch ? expMatch[0] : `${yearsOfExp} ans d'expérience`,
      importance: 5,
    });
  }

  // Add English requirement if found
  if (languages.includes("Anglais")) {
    const isEnglishMandatory = /anglais\s*(courant|professionnel|indispensable|exig[ée]|fluent)/i.test(jobText);
    requirements.push({
      id: `req-lang-en`,
      label: "Anglais technique / professionnel",
      normalizedName: "english",
      category: "language",
      required: isEnglishMandatory,
      sourceText: isEnglishMandatory ? "Anglais professionnel requis" : "Anglais souhaité",
      importance: isEnglishMandatory ? 4 : 2,
    });
  }

  return {
    rawText: jobText,
    title,
    targetPosition,
    requirements,
    seniorityRequired: seniority,
    yearsOfExperienceRequired: yearsOfExp,
    languages,
    remotePolicy,
  };
}

/**
 * Compares job requirements against the parsed resume deterministically.
 */
export function matchRequirements(
  requirements: JobRequirement[],
  resume: ParsedResume
): RequirementMatch[] {
  const matches: RequirementMatch[] = [];

  for (const req of requirements) {
    if (req.category === "technical_skill" || req.category === "framework_tool") {
      const check = isSkillPresentInText(req.normalizedName, resume.rawText);
      if (check.present) {
        matches.push({
          requirementId: req.id,
          requirementLabel: req.label,
          category: req.category,
          required: req.required,
          status: "confirmed",
          proofInResume: check.snippet,
          comment: `Compétence ${req.label} identifiée explicitement dans le CV.`,
          confidence: "high",
        });
      } else {
        // Special case: check if a partial/related skill is present
        // (e.g. Jest present when Vitest is requested, or Docker present when Cloud/DevOps requested)
        let partialFound = false;
        if (req.normalizedName === "Kubernetes") {
          const dockerCheck = isSkillPresentInText("Docker", resume.rawText);
          if (dockerCheck.present) {
            matches.push({
              requirementId: req.id,
              requirementLabel: req.label,
              category: req.category,
              required: req.required,
              status: "partial",
              proofInResume: dockerCheck.snippet,
              comment: "Docker est présent, mais Kubernetes (K8s) n'est pas explicitement mentionné.",
              confidence: "medium",
            });
            partialFound = true;
          }
        } else if (req.normalizedName === "React Native") {
          const reactCheck = isSkillPresentInText("React", resume.rawText);
          if (reactCheck.present) {
            matches.push({
              requirementId: req.id,
              requirementLabel: req.label,
              category: req.category,
              required: req.required,
              status: "partial",
              proofInResume: reactCheck.snippet,
              comment: "React est mentionné, mais l'expérience spécifique sur React Native (Mobile) n'est pas démontrée.",
              confidence: "medium",
            });
            partialFound = true;
          }
        } else if (req.normalizedName === "Jest") {
          const vitestCheck = isSkillPresentInText("Vitest", resume.rawText);
          if (vitestCheck.present) {
            matches.push({
              requirementId: req.id,
              requirementLabel: req.label,
              category: req.category,
              required: req.required,
              status: "partial",
              proofInResume: vitestCheck.snippet,
              comment: "Vitest (framework de test compatible Jest) est présent dans le CV.",
              confidence: "high",
            });
            partialFound = true;
          }
        }

        if (!partialFound) {
          matches.push({
            requirementId: req.id,
            requirementLabel: req.label,
            category: req.category,
            required: req.required,
            status: "missing",
            comment: `Aucune mention de ${req.label} trouvée dans le CV.`,
            confidence: "high",
          });
        }
      }
    } else if (req.category === "experience_seniority") {
      // Check overall years / dates in resume
      // Look for year occurrences like 2018, 2020...
      const currentYear = new Date().getFullYear();
      const yearsFound = Array.from(resume.rawText.matchAll(/\b(20[0-2]\d)\b/g)).map((m) =>
        parseInt(m[1], 10)
      );
      if (yearsFound.length > 0) {
        const oldestYear = Math.min(...yearsFound);
        const estimatedSpan = currentYear - oldestYear;
        const requiredYears = parseInt(req.label, 10) || 3;

        if (estimatedSpan >= requiredYears) {
          matches.push({
            requirementId: req.id,
            requirementLabel: req.label,
            category: req.category,
            required: req.required,
            status: "confirmed",
            proofInResume: `Historique professionnel débuté vers ${oldestYear} (environ ${estimatedSpan} ans de carrière identifiés).`,
            comment: "La durée globale de parcours semble satisfaire le niveau de séniorité attendu.",
            confidence: "medium",
          });
        } else {
          matches.push({
            requirementId: req.id,
            requirementLabel: req.label,
            category: req.category,
            required: req.required,
            status: "partial",
            proofInResume: `Dates trouvées : depuis ${oldestYear} (~${estimatedSpan} ans).`,
            comment: "La séniorité globale démontrée dans les dates semble légèrement inférieure ou difficile à vérifier.",
            confidence: "medium",
          });
        }
      } else {
        matches.push({
          requirementId: req.id,
          requirementLabel: req.label,
          category: req.category,
          required: req.required,
          status: "partial",
          comment: "Dates professionnelles peu lisibles ou non consolidées par l'extraction.",
          confidence: "low",
        });
      }
    } else if (req.category === "language") {
      const isEnglishReq = /anglais/i.test(req.label);
      if (isEnglishReq) {
        const enCheck = /\b(anglais|english|fluent|toeic|toefl|bilingue)\b/i.test(resume.rawText);
        if (enCheck) {
          matches.push({
            requirementId: req.id,
            requirementLabel: req.label,
            category: req.category,
            required: req.required,
            status: "confirmed",
            comment: "Niveau d'anglais mentionné dans le CV.",
            confidence: "high",
          });
        } else {
          matches.push({
            requirementId: req.id,
            requirementLabel: req.label,
            category: req.category,
            required: req.required,
            status: "missing",
            comment: "Aucune indication sur le niveau d'anglais dans le CV.",
            confidence: "medium",
          });
        }
      }
    } else {
      // General requirement fallback
      const check = isSkillPresentInText(req.label, resume.rawText);
      matches.push({
        requirementId: req.id,
        requirementLabel: req.label,
        category: req.category,
        required: req.required,
        status: check.present ? "confirmed" : "missing",
        proofInResume: check.snippet,
        comment: check.present
          ? `Élément mentionné dans le CV.`
          : `Non spécifié dans le document.`,
        confidence: check.present ? "high" : "medium",
      });
    }
  }

  return matches;
}
