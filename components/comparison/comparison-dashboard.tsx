"use client";

import React, { useState } from "react";
import {
  Layers,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  ArrowRight,
  Loader2,
  FileText,
} from "lucide-react";
import type {
  ComparisonReport,
  ParsedResume,
  SingleAnalysisResult,
  AnalysisMode,
} from "@/types";
import { FileUploadCard } from "@/components/upload/file-upload-card";
import { JobCard } from "@/components/job-description/job-card";
import { ResultsDashboard } from "@/components/analysis/results-dashboard";
import Heading from "../blocks/heading";
import Panel from "../blocks/panel";
import Button from "../ui/button";

interface MultiCVItem {
  id: string;
  label: string;
  parsedResume: ParsedResume | null;
}

export function ComparisonDashboard() {
  const [jobDescription, setJobDescription] = useState("");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("fast");

  const [cvList, setCvList] = useState<MultiCVItem[]>([
    { id: "cv-1", label: "CV Version 1", parsedResume: null },
    { id: "cv-2", label: "CV Version 2", parsedResume: null },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [selectedResultToView, setSelectedResultToView] =
    useState<SingleAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addCvSlot = () => {
    const nextIdx = cvList.length + 1;
    setCvList((prev) => [
      ...prev,
      {
        id: `cv-${Date.now()}`,
        label: `CV Version ${nextIdx}`,
        parsedResume: null,
      },
    ]);
  };

  const removeCvSlot = (id: string) => {
    if (cvList.length <= 2) return;
    setCvList((prev) => prev.filter((item) => item.id !== id));
  };

  const updateParsedResume = (id: string, resume: ParsedResume) => {
    setCvList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, parsedResume: resume } : item,
      ),
    );
  };

  const updateLabel = (id: string, newLabel: string) => {
    setCvList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, label: newLabel } : item,
      ),
    );
  };

  const validResumesCount = cvList.filter(
    (item) => item.parsedResume !== null,
  ).length;
  const canCompare =
    validResumesCount >= 2 && jobDescription.trim().length >= 20;

  const handleRunComparison = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const activeResumes = cvList
        .filter((item) => item.parsedResume !== null)
        .map((item) => ({
          id: item.id,
          label: item.label,
          data: item.parsedResume!,
        }));

      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumes: activeResumes,
          jobDescription,
          mode: analysisMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la comparaison");
      }

      setReport(data.report);
      setSelectedResultToView(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erreur inattendue de comparaison.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedResultToView) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedResultToView(null)}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mb-2"
        >
          ← Retour au tableau comparatif
        </button>
        <ResultsDashboard
          result={selectedResultToView}
          onReset={() => setSelectedResultToView(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 divide-y divide-border">
      {/* Introduction */}

      <Heading
        title={"Comparateur multi-versions de CV"}
        description={
          "Importez vos différentes versions de CV face à la même offre et découvrez objectivement la version la plus adaptée."
        }
        errorMessage={errorMessage}
        action={
          <Button
            type="button"
            label={
              isLoading
                ? "Comparaison en cours…"
                : "Comparer mes versions de CV"
            }
            icon="ArrowRight"
            onClick={handleRunComparison}
            disabled={!canCompare || isLoading}
            isLoading={isLoading}
          />
        }
      />
      {/* Shared Job Offer Input */}
      <div className="border-b border-border bg-surface flex-1 flex">
        <div className="w-full max-w-[1584px] mx-auto grid grid-cols-1 md:grid-cols-2 items-start divide-x divide-border border-x border-border flex-1">
          <JobCard
            value={jobDescription}
            onChange={setJobDescription}
            onClear={() => setJobDescription("")}
          />

          {/* CV Slots */}
          <Panel
            icon={"FolderOpen"}
            subtitle={`Au moins 2 CV requis pour exécuter la comparaison`}
            title={`Versions de vos CV à comparer (${validResumesCount} prêt(s))`}
            action={
              <button
                type="button"
                onClick={addCvSlot}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter une version</span>
              </button>
            }
          >
            <div className="divide-y divide-border -m-5">
              {cvList.map((item, index) => (
                <div
                  key={item.id}
                  className="flex flex-col divide-y divide-border"
                >
                  <div className="flex items-center justify-between gap-2 p-4 bg-background">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateLabel(item.id, e.target.value)}
                      className="rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs font-bold text-foreground hover:border-border focus:border-accent focus:bg-background focus:outline-hidden"
                      placeholder="Nom de la version..."
                    />
                    {cvList.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeCvSlot(item.id)}
                        className="text-foreground/40 hover:text-rose-600 transition-colors p-1"
                        title="Supprimer cette version"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <FileUploadCard
                    label={`Document ${index + 1}`}
                    parsedResume={item.parsedResume}
                    onParsed={(res) => updateParsedResume(item.id, res)}
                    onClear={() =>
                      setCvList((prev) =>
                        prev.map((it) =>
                          it.id === item.id
                            ? { ...it, parsedResume: null }
                            : it,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Results View */}
      {report && (
        <div className="space-y-6 pt-6 border-t border-border">
          {/* Recommendation Banner */}
          <div className="flex items-start gap-4 rounded-xl border border-accent/30 bg-accent/5 p-5 text-foreground shadow-xs">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-xs">
              <Award className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wider text-accent">
                  Recommandation objective
                </span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {report.recommendationReason}
              </h3>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Tableau comparatif côte à côte
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/50 text-sm font-semibold text-foreground/60 uppercase tracking-wider">
                    <th className="py-3 px-4">Version du CV</th>
                    <th className="py-3 px-4">Lisibilité ATS</th>
                    <th className="py-3 px-4">Score Matching</th>
                    <th className="py-3 px-4">Exigences bloquantes</th>
                    <th className="py-3 px-4">Points forts & Atouts</th>
                    <th className="py-3 px-4 text-right">Rapport détaillé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.candidates.map((cand) => {
                    const isWinner = cand.id === report.recommendedCandidateId;
                    const highlight = report.comparisonHighlights.find(
                      (h) => h.candidateId === cand.id,
                    );

                    return (
                      <tr
                        key={cand.id}
                        className={`transition-colors ${
                          isWinner
                            ? "bg-accent/5 font-medium"
                            : "hover:bg-surface-muted/30"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{cand.label}</span>
                            {isWinner && (
                              <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                                Recommandé
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-foreground/50 mt-0.5 font-normal">
                            {cand.fileName}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-foreground">
                            {cand.result.atsScore.total}
                          </span>
                          <span className="text-foreground/50">/100</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-foreground">
                            {cand.result.matchingScore.total}
                          </span>
                          <span className="text-foreground/50">/100</span>
                        </td>

                        <td className="py-3.5 px-4">
                          {cand.result.matchingScore.blockingRequirementsFailed
                            .length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              Aucune
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              {
                                cand.result.matchingScore
                                  .blockingRequirementsFailed.length
                              }{" "}
                              manquante(s)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          {highlight?.pros.slice(0, 2).map((p, i) => (
                            <p
                              key={i}
                              className="text-sm text-foreground/80 leading-tight"
                            >
                              • {p}
                            </p>
                          ))}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedResultToView(cand.result)}
                            className="rounded-md border border-border bg-surface px-2.5 py-1 text-sm font-semibold text-foreground hover:bg-surface-muted transition-colors"
                          >
                            Consulter
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
