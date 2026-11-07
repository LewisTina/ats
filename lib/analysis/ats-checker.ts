import type {
  ParsedResume,
  ATSScoreBreakdown,
  ATSDiagnostic,
} from "@/types";

export function evaluateATSReadability(resume: ParsedResume): {
  score: ATSScoreBreakdown;
  diagnostics: ATSDiagnostic[];
} {
  const diagnostics: ATSDiagnostic[] = [];

  // If scanned or completely empty, ATS cannot evaluate
  if (resume.isScannedOrEmpty || resume.rawText.length < 80) {
    diagnostics.push({
      id: "ats-diag-scanned",
      title: "Document scanné ou texte non indexable",
      category: "extraction",
      severity: "high",
      explanation:
        "Le document ne contient quasiment aucun flux textuel exploitable. Les systèmes ATS et moteurs d'indexation n'analyseront aucune de vos compétences.",
      remediation:
        "Générez un PDF natif avec du texte vectorisé / sélectionnable depuis votre traitement de texte ou votre outil d'édition.",
    });

    return {
      score: {
        extractionQuality: 0,
        structureSections: 0,
        readingOrder: 0,
        essentialContact: 0,
        total: 0,
        ratingLabel: "Document non évaluable (texte absent ou scanné)",
      },
      diagnostics,
    };
  }

  // 1. Extraction Quality (max 35)
  let extractionQuality = 35;
  const textLength = resume.rawText.length;

  if (textLength < 400) {
    extractionQuality -= 15;
    diagnostics.push({
      id: "ats-diag-short-text",
      title: "Volume de texte très réduit",
      category: "extraction",
      severity: "medium",
      explanation: `Seulement ${textLength} caractères extraits. Le CV risque de manquer de mots-clés techniques détaillés.`,
      remediation: "Développez vos réalisations et les technologies utilisées pour chaque expérience.",
    });
  } else if (textLength > 6000) {
    extractionQuality -= 5;
    diagnostics.push({
      id: "ats-diag-very-long",
      title: "Volume textuel volumineux",
      category: "extraction",
      severity: "low",
      explanation: "Le texte extrait est particulièrement long (> 6000 caractères), ce qui peut diluer les mots-clés clés.",
      remediation: "Privilégiez la concision pour faire ressortir immédiatement les points forts pertinents.",
    });
  }

  for (const warning of resume.extractionWarnings) {
    if (warning.code === "LOW_TEXT_DENSITY") {
      extractionQuality = Math.max(10, extractionQuality - 8);
    }
  }

  // 2. Structure and standard sections (max 25)
  let structureSections = 0;
  const categoriesPresent = new Set(resume.sections.map((s) => s.category));

  if (categoriesPresent.has("experience")) {
    structureSections += 10;
  } else {
    diagnostics.push({
      id: "ats-diag-no-exp",
      title: "Section Expériences non détectée",
      category: "structure",
      severity: "high",
      explanation: "Les ATS recherchent une rubrique claire de type 'Expériences' pour cartographier vos postes.",
      remediation: "Nommez clairement votre section 'Expériences professionnelles' avec un titre standard.",
    });
  }

  if (categoriesPresent.has("skills")) {
    structureSections += 6;
  } else if (resume.detectedSkills.length > 3) {
    // Skills found in text but not under a designated section
    structureSections += 3;
    diagnostics.push({
      id: "ats-diag-no-skills-section",
      title: "Absence de rubrique Compétences dédiée",
      category: "structure",
      severity: "medium",
      explanation: "Des compétences sont dispersées dans vos descriptions mais aucune rubrique dédiée n'est identifiée.",
      remediation: "Ajoutez un encadré ou une section 'Compétences techniques' pour regrouper votre stack.",
    });
  }

  if (categoriesPresent.has("education")) {
    structureSections += 5;
  } else {
    diagnostics.push({
      id: "ats-diag-no-education",
      title: "Section Formation non identifiée",
      category: "structure",
      severity: "low",
      explanation: "Certains filtres ATS vérifient les diplômes ou formations initiales.",
      remediation: "Mentionnez vos diplômes ou certifications clés sous une rubrique 'Formation'.",
    });
  }

  if (categoriesPresent.has("contact") || resume.contactInfo.hasEmail) {
    structureSections += 4;
  }

  // 3. Reading Order and Flow (max 20)
  let readingOrder = 20;
  const hasMultiColumn = resume.extractionWarnings.some((w) => w.code === "MULTI_COLUMN_POSSIBLE");
  if (hasMultiColumn) {
    readingOrder -= 6;
    diagnostics.push({
      id: "ats-diag-columns",
      title: "Colonnes multiples possibles",
      category: "reading_order",
      severity: "medium",
      explanation:
        "Une structure multi-colonnes a été détectée. Certains ATS plus anciens peuvent entremêler le texte des colonnes parallèles.",
      remediation:
        "Vérifiez dans l'aperçu du texte extrait que le texte d'une colonne ne s'insère pas au milieu d'une phrase d'une autre colonne.",
    });
  }

  // 4. Essential contact information (max 20)
  let essentialContact = 0;
  if (resume.contactInfo.hasEmail) {
    essentialContact += 8;
  } else {
    diagnostics.push({
      id: "ats-diag-no-email",
      title: "Adresse e-mail absente ou masquée",
      category: "contact",
      severity: "high",
      explanation: "L'adresse e-mail est l'identifiant primaire de la plupart des ATS.",
      remediation: "Inscrivez votre adresse e-mail en texte brut sélectionnable dans l'en-tête.",
    });
  }

  if (resume.contactInfo.hasPhone) {
    essentialContact += 6;
  } else {
    diagnostics.push({
      id: "ats-diag-no-phone",
      title: "Numéro de téléphone introuvable",
      category: "contact",
      severity: "medium",
      explanation: "L'absence de numéro direct complique la prise de contact rapide par les recruteurs.",
      remediation: "Ajoutez un numéro de téléphone avec l'indicatif (+33...).",
    });
  }

  if (resume.contactInfo.hasLocation || resume.contactInfo.hasLinkedIn || resume.contactInfo.hasGitHub) {
    essentialContact += 6;
  } else {
    diagnostics.push({
      id: "ats-diag-no-links",
      title: "Liens professionnels ou localisation absents",
      category: "contact",
      severity: "low",
      explanation: "Indiquer votre localisation (ville / région) et un profil GitHub / LinkedIn renforce la pertinence du dossier.",
      remediation: "Indiquez votre ville/région de rattachement et le lien vers votre GitHub ou profil professionnel.",
    });
  }

  const total = Math.min(100, Math.max(0, extractionQuality + structureSections + readingOrder + essentialContact));

  let ratingLabel = "Faible lisibilité ATS";
  if (total >= 88) ratingLabel = "Excellente lisibilité ATS";
  else if (total >= 75) ratingLabel = "Bonne lisibilité ATS";
  else if (total >= 60) ratingLabel = "Lisibilité ATS moyenne";

  return {
    score: {
      extractionQuality,
      structureSections,
      readingOrder,
      essentialContact,
      total,
      ratingLabel,
    },
    diagnostics,
  };
}
