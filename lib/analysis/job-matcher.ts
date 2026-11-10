import { z } from "zod";
import type {
  AnalyzedJob,
  JobRequirement,
  ParsedResume,
  RequirementMatch,
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
  minYears: z.number().optional(),
  maxYears: z.number().optional(),
});

export const AnalyzedJobSchema = z.object({
  rawText: z.string(),
  title: z.string().optional(),
  requirements: z.array(JobRequirementSchema),
  seniorityRequired: z.string().optional(),
  yearsOfExperienceRequired: z.number().optional(),
  yearsOfExperienceMax: z.number().optional(),
  languages: z.array(z.string()),
  remotePolicy: z.string().optional(),
});

export interface ExperienceRangeRequirement {
  minYears: number;
  maxYears?: number;
  label: string;
  sourceText: string;
}

/**
 * Extracts experience requirements accurately, supporting intervals (e.g. "5 à 7 ans",
 * "entre 3 et 5 ans", "3-5 years") without taking the upper bound as the minimum.
 */
export function extractExperienceRequirement(
  jobText: string
): ExperienceRangeRequirement | undefined {
  // 1. Check for interval patterns first: "5 à 7 ans", "entre 3 et 5 ans", "5 - 10 ans", "minimum 5 à 7 ans"
  const rangeRegex =
    /(?:(?:au\s+moins|minimum|min\.?|entre|de|from|between)\s+)?(\d{1,2})\s*(?:ans?|ann[ée]es?|years?)?\s*(?:[àa]|et|to|[-–—/])\s*(\d{1,2})\s*\+?\s*(?:ans?|ann[ée]es?|years?)(?:\s*(?:d['’]exp[ée]riences?|of\s+experience|experience|minimum|requis(?:es)?|attendu(?:es)?))?/gi;

  for (const match of jobText.matchAll(rangeRegex)) {
    const first = parseInt(match[1], 10);
    const second = parseInt(match[2], 10);
    if (
      !isNaN(first) &&
      !isNaN(second) &&
      first > 0 &&
      second >= first &&
      second <= 25 &&
      second - first <= 15
    ) {
      // Avoid matching things like "2 à 3 jours de télétravail" if "ans/années/years" wasn't in the match
      const fullMatch = match[0].trim();
      const minYears = first;
      const maxYears = second > first ? second : undefined;
      const label = maxYears
        ? `${minYears} à ${maxYears} ans d'expérience`
        : `${minYears} ans d'expérience minimum`;
      return {
        minYears,
        maxYears,
        label,
        sourceText: fullMatch,
      };
    }
  }

  // 2. Single threshold patterns: "Minimum 5 ans d'expérience", "5+ ans", "au moins 4 ans", "Justifiant de 5 ans d'expérience"
  const singleRegex =
    /(?:(?:au\s+moins|minimum|min\.?|[àa]\s+partir\s+de|plus\s+de|at\s+least|over)\s*(\d{1,2})\s*\+?\s*(?:ans?|ann[ée]es?|years?)(?:\s*(?:d['’]exp[ée]riences?|of\s+experience|experience))?|(\d{1,2})\s*\+\s*(?:ans?|ann[ée]es?|years?)(?:\s*(?:d['’]exp[ée]riences?|of\s+experience|experience))?|(\d{1,2})\s*(?:ans?|ann[ée]es?|years?)\s*(?:(?:d['’]exp[ée]riences?|of\s+experience|experience)\s*(?:minimum|min\.?|ou\s+plus|et\s+plus|requis(?:es)?)?|(?:minimum|min\.?|ou\s+plus|et\s+plus)\s*(?:d['’]exp[ée]riences?)?))/gi;

  for (const match of jobText.matchAll(singleRegex)) {
    const rawNum = match[1] || match[2] || match[3];
    const parsed = parseInt(rawNum, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 25) {
      // Verify it's not Preceded by "à / - / et <num>" (already handled by range, but defensive check)
      const before = jobText.slice(Math.max(0, (match.index ?? 0) - 12), match.index ?? 0);
      if (/(\d{1,2})\s*(?:[àa]|et|to|[-–—/])\s*$/i.test(before)) {
        continue;
      }
      return {
        minYears: parsed,
        label: `${parsed} ans d'expérience minimum`,
        sourceText: match[0].trim(),
      };
    }
  }

  return undefined;
}

export interface EstimatedResumeExperience {
  years?: number;
  proof?: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Estimates candidate's years of experience from resume text & sections.
 * Prioritizes explicit statements ("6 ans d'expérience") and experience section date ranges,
 * avoiding false spans from education dates or future dates.
 */
export function estimateCandidateExperience(
  resume: ParsedResume
): EstimatedResumeExperience {
  const rawText = resume.rawText;

  // 1. Explicit mention in summary or text (e.g., "6 ans d'expérience", "+ de 5 ans d'expérience")
  const explicitMatches: Array<{ years: number; snippet: string }> = [];
  const explicitRegex =
    /(?:plus\s+de\s+|\+\s*de\s+|environ\s+|pr[èe]s\s+de\s+|avec\s+|fort\s+de\s+|rich[es]?\s+de\s+)?(\d{1,2})\s*\+?\s*(?:ans?|ann[ée]es?|years?)\s+(?:d['’]exp[ée]riences?|of\s+experience)/gi;

  for (const m of rawText.matchAll(explicitRegex)) {
    const yrs = parseInt(m[1], 10);
    if (!isNaN(yrs) && yrs > 0 && yrs <= 40) {
      explicitMatches.push({ years: yrs, snippet: m[0].trim() });
    }
  }

  // 2. Date ranges in experience section (or full text if no experience section was segmented)
  const expSections = resume.sections.filter((s) => s.category === "experience");
  const textForDates =
    expSections.length > 0
      ? expSections.map((s) => s.content).join("\n")
      : rawText;

  const nowYear = new Date().getFullYear();
  // Collect explicit date intervals like "2019 - 2024", "2020 - Présent", "depuis 2018"
  const intervalRegex =
    /\b(19[89]\d|20[0-3]\d)\s*(?:[-–—/]|à|to|jusqu['’][àa])\s*(19[89]\d|20[0-3]\d|aujourd['’]hui|pr[ée]sent|present|actuel(?:lement)?|current|now|en\s+cours)\b/gi;
  const sinceRegex = /\b(?:depuis|since)\s+(?:[a-zéû]+\s+)?(19[89]\d|20[0-3]\d)\b/gi;

  const intervals: Array<{ start: number; end: number }> = [];
  const allFoundYears = Array.from(rawText.matchAll(/\b(19[89]\d|20[0-3]\d)\b/g)).map((m) =>
    parseInt(m[1], 10)
  );
  // Reference "current" year: max between actual year and highest non-outlier year in resume
  const maxYearInDoc = allFoundYears.length > 0 ? Math.max(...allFoundYears) : nowYear;
  const referenceCurrentYear = Math.min(Math.max(nowYear, maxYearInDoc), nowYear + 1);

  for (const m of textForDates.matchAll(intervalRegex)) {
    const start = parseInt(m[1], 10);
    const rawEnd = m[2];
    const end = /^\d{4}$/.test(rawEnd) ? parseInt(rawEnd, 10) : referenceCurrentYear;
    if (start >= 1985 && end >= start && end - start <= 40) {
      intervals.push({ start, end });
    }
  }

  for (const m of textForDates.matchAll(sinceRegex)) {
    const start = parseInt(m[1], 10);
    if (start >= 1985 && referenceCurrentYear >= start && referenceCurrentYear - start <= 40) {
      intervals.push({ start, end: referenceCurrentYear });
    }
  }

  let intervalSpanYears: number | undefined;
  let intervalProof: string | undefined;

  if (intervals.length > 0) {
    // Merge overlapping intervals to avoid double-counting parallel missions
    const sorted = [...intervals].sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = sorted[i];
      if (curr.start <= prev.end) {
        prev.end = Math.max(prev.end, curr.end);
      } else {
        merged.push({ ...curr });
      }
    }
    const totalMerged = merged.reduce((sum, iv) => sum + Math.max(1, iv.end - iv.start), 0);
    const minStart = merged[0].start;
    const maxEnd = merged[merged.length - 1].end;
    const rawSpan = maxEnd - minStart;
    intervalSpanYears = Math.max(totalMerged, rawSpan);
    intervalProof = `Périodes professionnelles identifiées de ${minStart} à ${maxEnd} (~${intervalSpanYears} ans).`;
  }

  if (explicitMatches.length > 0) {
    const bestExplicit = explicitMatches.reduce((a, b) => (b.years > a.years ? b : a));
    if (intervalSpanYears !== undefined) {
      // Combine both if coherent
      const chosen = Math.max(bestExplicit.years, intervalSpanYears);
      return {
        years: chosen,
        proof: `Mention explicite "${bestExplicit.snippet}" (${intervalProof})`,
        confidence: "high",
      };
    }
    return {
      years: bestExplicit.years,
      proof: `Mention explicite dans le CV : "${bestExplicit.snippet}".`,
      confidence: "high",
    };
  }

  if (intervalSpanYears !== undefined) {
    return {
      years: intervalSpanYears,
      proof: intervalProof,
      confidence: "medium",
    };
  }

  // 3. Fallback: standalone years in experience section (or document)
  const fallbackYears = Array.from(textForDates.matchAll(/\b(20[0-2]\d)\b/g)).map((m) =>
    parseInt(m[1], 10)
  );
  if (fallbackYears.length > 0) {
    const oldestYear = Math.min(...fallbackYears);
    const latestYear = Math.max(...fallbackYears, Math.min(nowYear, 2026));
    const span = Math.max(1, latestYear - oldestYear);
    return {
      years: span,
      proof: `Historique professionnel débuté vers ${oldestYear} (environ ${span} ans identifiés).`,
      confidence: "medium",
    };
  }

  return { confidence: "low" };
}

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
  jobText: string
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

  // Extract years of experience (supports ranges like "5 à 7 ans" or "5 à 10 ans")
  const expReq = extractExperienceRequirement(jobText);
  const yearsOfExp = expReq?.minYears;
  const yearsOfExpMax = expReq?.maxYears;

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

    // Find line/sentence containing this skill to evaluate required vs preferred
    const escaped = canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sentenceRegex = new RegExp(`([^\n]*?${escaped}[^\n]*)`, "i");
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
      isRequired = false;
      importance = 3;
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
  if (expReq !== undefined) {
    requirements.push({
      id: `req-exp`,
      label: expReq.label,
      normalizedName: "experience_years",
      category: "experience_seniority",
      required: true,
      sourceText: expReq.sourceText,
      importance: 5,
      minYears: expReq.minYears,
      maxYears: expReq.maxYears,
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
    requirements,
    seniorityRequired: seniority,
    yearsOfExperienceRequired: yearsOfExp,
    yearsOfExperienceMax: yearsOfExpMax,
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
      const estimated = estimateCandidateExperience(resume);
      const parsedFromLabel = extractExperienceRequirement(req.label);
      const minRequired = req.minYears ?? parsedFromLabel?.minYears ?? (parseInt(req.label, 10) || 3);
      const maxTarget = req.maxYears ?? parsedFromLabel?.maxYears;

      if (estimated.years !== undefined) {
        if (estimated.years >= minRequired) {
          const inRangeNote =
            maxTarget !== undefined
              ? estimated.years <= maxTarget
                ? `Vous êtes pile dans la tranche recherchée (${minRequired} à ${maxTarget} ans) avec ~${estimated.years} ans d'expérience.`
                : `Votre expérience (~${estimated.years} ans) couvre et dépasse la tranche cible (${minRequired} à ${maxTarget} ans).`
              : `Votre expérience (~${estimated.years} ans) satisfait le seuil attendu d'au moins ${minRequired} ans.`;

          matches.push({
            requirementId: req.id,
            requirementLabel: req.label,
            category: req.category,
            required: req.required,
            status: "confirmed",
            proofInResume: estimated.proof,
            comment: inRangeNote,
            confidence: estimated.confidence,
          });
        } else {
          const rangeText =
            maxTarget !== undefined ? `${minRequired} à ${maxTarget} ans` : `${minRequired} ans minimum`;
          matches.push({
            requirementId: req.id,
            requirementLabel: req.label,
            category: req.category,
            required: req.required,
            status: "partial",
            proofInResume: estimated.proof,
            comment: `Expérience estimée à ~${estimated.years} an(s) pour une cible de ${rangeText}.`,
            confidence: estimated.confidence,
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
