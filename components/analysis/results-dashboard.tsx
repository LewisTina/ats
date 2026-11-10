"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FileSearch,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { SingleAnalysisResult } from "@/types";

interface ResultsDashboardProps {
  result: SingleAnalysisResult;
  onReset: () => void;
}

export function ResultsDashboard({ result, onReset }: ResultsDashboardProps) {
  const [activeSkillsTab, setActiveSkillsTab] = useState<
    "confirmed" | "partial" | "missing"
  >("confirmed");
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [expandedRequirements, setExpandedRequirements] = useState<
    Record<string, boolean>
  >({});

  const toggleReqExpand = (id: string) => {
    setExpandedRequirements((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copySummaryText = () => {
    const text =
      `Synthèse de candidature pour : ${result.job.title || "Offre"}\n` +
      `Score ATS : ${result.atsScore.total}/100 (${result.atsScore.ratingLabel})\n` +
      `Score Matching : ${result.matchingScore.total}/100 (${result.matchingScore.ratingLabel})\n\n` +
      `Points forts :\n${result.summary.strengths.map((s) => `- ${s}`).join("\n")}\n\n` +
      `Écarts majeurs :\n${result.summary.majorGaps.map((g) => `- ${g}`).join("\n")}\n\n` +
      `Actions prioritaires :\n${result.summary.priorityActions.map((a) => `- ${a}`).join("\n")}`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const { atsScore, matchingScore, resume, job } = result;

  return (
    <div className="flex flex-col gap-8">
      {/* Top Bar with Job & CV identity */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-surface-muted px-2 py-0.5 text-sm font-semibold text-foreground/70 uppercase tracking-wider">
              Rapport d'analyse
            </span>
            <span className="text-xs text-foreground/50">
              {new Date(result.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground mt-1 tracking-tight">
            {job.title || "Offre d'emploi analysée"}
          </h2>
          <p className="text-xs text-foreground/60">
            CV :{" "}
            <span className="font-medium text-foreground">
              {resume.fileName}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copySummaryText}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted transition-colors"
          >
            {copiedSummary ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedSummary ? "Copié !" : "Copier la synthèse"}</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Nouvelle analyse</span>
          </button>
        </div>
      </div>

      {/* AI banner or fallback notice */}
      {result.mode === "smart" && (
        <div
          className={`rounded-xl border p-4 text-xs ${
            result.aiEnriched
              ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
              : "border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                {result.aiEnriched
                  ? `Analyse sémantique enrichie par IA (${result.aiProviderUsed})`
                  : "Analyse déterministe locale (Fournisseur IA non actif)"}
              </p>
              <p className="text-sm opacity-90">
                {result.aiEnriched
                  ? "Les correspondances et recommandations ont été affinées par compréhension sémantique de vos réalisations. Les scores restent calculés de façon déterministe."
                  : result.aiErrorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 1 — VUE D'ENSEMBLE (DEUX SCORES DISTINCTS) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Score ATS */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-6 shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Lisibilité ATS
              </span>
              <span className="text-sm text-foreground/50">
                Qualité machine
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-3">
              <span className="text-4xl font-extrabold text-foreground tracking-tight">
                {atsScore.total}
              </span>
              <span className="text-sm font-semibold text-foreground/50">
                / 100
              </span>
              <span
                className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                  atsScore.total >= 80
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : atsScore.total >= 60
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                {atsScore.ratingLabel}
              </span>
            </div>

            <p className="text-xs text-foreground/70 leading-relaxed mb-4">
              Ce score évalue la qualité d'extraction et la structure du CV
              (découpage en sections, en-tête, coordonnées), pas vos compétences
              métier.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border text-sm">
            <div>
              <p className="text-foreground/50">Extraction</p>
              <p className="font-semibold text-foreground">
                {atsScore.extractionQuality}/35
              </p>
            </div>
            <div>
              <p className="text-foreground/50">Sections</p>
              <p className="font-semibold text-foreground">
                {atsScore.structureSections}/25
              </p>
            </div>
            <div>
              <p className="text-foreground/50">Lecture</p>
              <p className="font-semibold text-foreground">
                {atsScore.readingOrder}/20
              </p>
            </div>
            <div>
              <p className="text-foreground/50">Contact</p>
              <p className="font-semibold text-foreground">
                {atsScore.essentialContact}/20
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Score de matching */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface p-6 shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                Score de Matching
              </span>
              <span className="text-sm text-foreground/50">
                Confiance : {matchingScore.confidenceScore}%
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-3">
              <span className="text-4xl font-extrabold text-foreground tracking-tight">
                {matchingScore.total}
              </span>
              <span className="text-sm font-semibold text-foreground/50">
                / 100
              </span>
              <span
                className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                  matchingScore.total >= 75
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : matchingScore.total >= 55
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                {matchingScore.ratingLabel}
              </span>
            </div>

            <p className="text-xs text-foreground/70 leading-relaxed mb-4">
              Ce score évalue la proximité du profil démontré dans votre
              document avec les exigences identifiées de l'annonce.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border text-sm">
            <div>
              <p className="text-foreground/50">Tech / Outils</p>
              <p className="font-semibold text-foreground">
                {matchingScore.technicalSkillsScore}/35
              </p>
            </div>
            <div>
              <p className="text-foreground/50">Séniorité</p>
              <p className="font-semibold text-foreground">
                {matchingScore.experienceSeniorityScore}/25
              </p>
            </div>
            <div>
              <p className="text-foreground/50">Missions</p>
              <p className="font-semibold text-foreground">
                {matchingScore.responsibilitiesScore}/20
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Blocking alerts warning banner if mandatory requirements failed */}
      {matchingScore.blockingRequirementsFailed.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-400">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">
              Attention : Exigences obligatoires non démontrées
            </h4>
            <p>
              L'offre mentionne comme impératif(s) :{" "}
              <span className="font-bold">
                {matchingScore.blockingRequirementsFailed.join(", ")}
              </span>
              . Ces éléments n'ont pas été identifiés nettement dans le texte
              extrait de votre CV.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 2 — COMPÉTENCES DÉMONTRÉES */}
      {/* ============================================================== */}
      <div className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Analyse des compétences par niveau de preuve
            </h3>
            <p className="text-xs text-foreground/60">
              Distinction factuelle entre compétences confirmées, partielles et
              absentes
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center rounded-lg border border-border bg-surface-muted/60 p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveSkillsTab("confirmed")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                activeSkillsTab === "confirmed"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Confirmées ({result.confirmedSkills.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSkillsTab("partial")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                activeSkillsTab === "partial"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Partielles ({result.partialSkills.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSkillsTab("missing")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                activeSkillsTab === "missing"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Non démontrées ({result.missingSkills.length})
            </button>
          </div>
        </div>

        <div className="pt-4">
          {activeSkillsTab === "confirmed" && (
            <div className="space-y-2">
              {result.confirmedSkills.length === 0 ? (
                <p className="text-xs text-foreground/50 py-4 text-center">
                  Aucune compétence confirmée explicitement.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {result.confirmedSkills.map((skill, i) => (
                    <div
                      key={i}
                      className="flex flex-col rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{skill.name}</span>
                      </div>
                      {skill.proof && (
                        <p className="mt-1 font-mono text-sm text-foreground/70 italic line-clamp-2">
                          {skill.proof}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSkillsTab === "partial" && (
            <div className="space-y-2">
              {result.partialSkills.length === 0 ? (
                <p className="text-xs text-foreground/50 py-4 text-center">
                  Aucune compétence partiellement démontrée.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {result.partialSkills.map((skill, i) => (
                    <div
                      key={i}
                      className="flex flex-col rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                        <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{skill.name}</span>
                      </div>
                      <p className="mt-1 text-sm text-foreground/80">
                        {skill.comment}
                      </p>
                      {skill.proof && (
                        <p className="mt-1 font-mono text-[10px] text-foreground/60 italic">
                          Extrait : {skill.proof}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSkillsTab === "missing" && (
            <div className="space-y-2">
              {result.missingSkills.length === 0 ? (
                <p className="text-xs text-foreground/50 py-4 text-center">
                  Toutes les compétences demandées ont été identifiées dans le
                  CV !
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {result.missingSkills.map((skill, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface-muted/40 p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
                        <span className="font-medium text-foreground">
                          {skill.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          skill.required
                            ? "bg-rose-500/10 text-rose-600"
                            : "bg-surface-muted text-foreground/60"
                        }`}
                      >
                        {skill.required ? "Obligatoire" : "Souhaité"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 3 — TABLEAU D'ANALYSE DES EXIGENCES */}
      {/* ============================================================== */}
      <div className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-xs overflow-hidden">
        <div className="pb-4 border-b border-border mb-4">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            Tableau détaillé des exigences de l'offre
          </h3>
          <p className="text-xs text-foreground/60">
            Confrontation critère par critère avec preuves extraites du CV et
            niveau de confiance
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50 text-sm font-semibold text-foreground/60 uppercase tracking-wider">
                <th className="py-2.5 px-3">Exigence</th>
                <th className="py-2.5 px-3">Caractère</th>
                <th className="py-2.5 px-3">Statut</th>
                <th className="py-2.5 px-3">Justification & Preuve</th>
                <th className="py-2.5 px-3">Confiance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.requirementsMatches.map((req) => (
                <tr
                  key={req.requirementId}
                  className="hover:bg-surface-muted/30 transition-colors"
                >
                  <td className="py-3 px-3 font-semibold text-foreground">
                    {req.requirementLabel}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                        req.required
                          ? "bg-foreground/10 text-foreground"
                          : "bg-surface-muted text-foreground/60"
                      }`}
                    >
                      {req.required ? "Obligatoire" : "Souhaité"}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium ${
                        req.status === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : req.status === "partial"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                      }`}
                    >
                      {req.status === "confirmed" && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {req.status === "partial" && (
                        <HelpCircle className="h-3 w-3" />
                      )}
                      {req.status === "missing" && (
                        <XCircle className="h-3 w-3" />
                      )}
                      {req.status === "confirmed"
                        ? "Confirmé"
                        : req.status === "partial"
                          ? "À vérifier"
                          : "Non démontré"}
                    </span>
                  </td>
                  <td className="py-3 px-3 max-w-sm">
                    <p className="text-foreground/80 leading-relaxed">
                      {req.comment}
                    </p>
                    {req.proofInResume && (
                      <p className="mt-1 font-mono text-[10px] text-foreground/50 italic bg-surface-muted/50 p-1 rounded">
                        {req.proofInResume}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm text-foreground/60 capitalize">
                      {req.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 4 — PROBLÈMES DE LISIBILITÉ ATS */}
      {/* ============================================================== */}
      <div className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-xs">
        <div className="pb-4 border-b border-border mb-4">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            Diagnostics et lisibilité ATS
          </h3>
          <p className="text-xs text-foreground/60">
            Points techniques susceptibles de gêner l'indexation par les
            logiciels de recrutement
          </p>
        </div>

        {result.atsDiagnostics.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Aucune anomalie bloquante de lecture ATS n'a été détectée.
              Structure claire et fluide.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {result.atsDiagnostics.map((diag) => (
              <div
                key={diag.id}
                className="flex flex-col rounded-lg border border-border bg-surface-muted/20 p-4 text-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-foreground">
                    {diag.title}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      diag.severity === "high"
                        ? "bg-rose-500/10 text-rose-600"
                        : diag.severity === "medium"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-surface-muted text-foreground/60"
                    }`}
                  >
                    Gravité : {diag.severity}
                  </span>
                </div>
                <p className="text-foreground/75 leading-relaxed mb-2">
                  {diag.explanation}
                </p>
                <div className="flex items-start gap-1.5 rounded bg-surface p-2.5 border border-border text-sm text-foreground/90">
                  <span className="font-semibold text-accent shrink-0">
                    Action corrective :
                  </span>
                  <span>{diag.remediation}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* SECTION 5 — RECOMMANDATIONS PRIORISÉES */}
      {/* ============================================================== */}
      <div className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-xs">
        <div className="pb-4 border-b border-border mb-4">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            Recommandations concrètes et contextualisées
          </h3>
          <p className="text-xs text-foreground/60">
            Conseils d'ajustement sans jamais inventer d'expérience fictive
          </p>
        </div>

        <div className="space-y-3.5">
          {result.recommendations.map((rec) => (
            <div
              key={rec.id}
              className="flex flex-col rounded-lg border border-border bg-surface p-4 text-xs transition-shadow hover:shadow-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="font-bold text-sm text-foreground">
                  {rec.title}
                </h4>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    rec.priority === "high"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : rec.priority === "medium"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-surface-muted text-foreground/60"
                  }`}
                >
                  Priorité {rec.priority}
                </span>
              </div>

              <div className="space-y-1.5 mb-3 text-foreground/80 leading-relaxed">
                <p>
                  <span className="font-semibold text-foreground">
                    Constat :{" "}
                  </span>
                  {rec.issue}
                </p>
                <p className="text-sm text-foreground/60">
                  <span className="font-semibold text-foreground/70">
                    Pertinence :{" "}
                  </span>
                  {rec.relevanceToJob}
                </p>
              </div>

              <div className="rounded-lg bg-surface-muted/50 p-3 border border-border text-sm text-foreground/90 leading-relaxed">
                <p>
                  <span className="font-semibold text-accent">
                    Suggestion :{" "}
                  </span>
                  {rec.suggestion}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECTION 6 — SYNTHÈSE FINALE */}
      {/* ============================================================== */}
      <div className="flex flex-col rounded-xl border border-border bg-surface p-6 shadow-xs">
        <div className="pb-4 border-b border-border mb-4">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            Synthèse d'aide à la décision
          </h3>
          <p className="text-xs text-foreground/60">
            Bilan factuel avant de postuler
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Strengths */}
          <div className="rounded-lg border border-border bg-surface-muted/20 p-4">
            <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Points forts démontrés
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-foreground/80">
              {result.summary.strengths.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          </div>

          {/* Major Gaps */}
          <div className="rounded-lg border border-border bg-surface-muted/20 p-4">
            <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4" />
              Principaux écarts identifiés
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-foreground/80">
              {result.summary.majorGaps.map((g, idx) => (
                <li key={idx}>{g}</li>
              ))}
            </ul>
          </div>

          {/* Blocking alerts */}
          <div className="rounded-lg border border-border bg-surface-muted/20 p-4">
            <h4 className="font-semibold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Critères bloquants éventuels
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-foreground/80">
              {result.summary.blockingAlerts.map((b, idx) => (
                <li key={idx}>{b}</li>
              ))}
            </ul>
          </div>

          {/* Priority actions & Verifications */}
          <div className="rounded-lg border border-border bg-surface-muted/20 p-4">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Vérifications prioritaires avant envoi
            </h4>
            <ul className="space-y-1.5 list-disc list-inside text-foreground/80">
              {result.summary.verificationsBeforeApplying.map((v, idx) => (
                <li key={idx}>{v}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
