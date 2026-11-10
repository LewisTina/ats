"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { FileUploadCard } from "@/components/upload/file-upload-card";
import { JobCard } from "@/components/job-description/job-card";
import { AnalysisOptions } from "@/components/analysis/analysis-options";
import { LoadingProgress } from "@/components/analysis/loading-progress";
import { ResultsDashboard } from "@/components/analysis/results-dashboard";
import { ComparisonDashboard } from "@/components/comparison/comparison-dashboard";
import { HistoryModal } from "@/components/history/history-modal";
import type { ParsedResume, SingleAnalysisResult, AnalysisMode } from "@/types";
import Heading from "@/components/blocks/heading";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/button";

const LOCAL_STORAGE_HISTORY_KEY = "cv_analyzer_history_v1";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"single" | "compare">("single");
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("fast");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentResult, setCurrentResult] =
    useState<SingleAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<SingleAnalysisResult[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Load history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (_) {}
  }, []);

  const saveToHistory = (result: SingleAnalysisResult) => {
    try {
      const nextHistory = [
        result,
        ...history.filter((h) => h.id !== result.id),
      ].slice(0, 20);
      setHistory(nextHistory);
      localStorage.setItem(
        LOCAL_STORAGE_HISTORY_KEY,
        JSON.stringify(nextHistory),
      );
    } catch (_) {}
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
    } catch (_) {}
  };

  const deleteHistoryItem = (id: string) => {
    const nextHistory = history.filter((h) => h.id !== id);
    setHistory(nextHistory);
    try {
      localStorage.setItem(
        LOCAL_STORAGE_HISTORY_KEY,
        JSON.stringify(nextHistory),
      );
    } catch (_) {}
  };

  const canAnalyze = Boolean(
    parsedResume &&
    parsedResume.rawText.length > 30 &&
    jobDescription.trim().length >= 20,
  );

  const handleStartAnalysis = async () => {
    if (!canAnalyze || !parsedResume) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: parsedResume,
          jobDescription,
          mode: analysisMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Une erreur est survenue lors de l'analyse.",
        );
      }

      setCurrentResult(data.result);
      saveToHistory(data.result);

      // Scroll smoothly to results
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erreur inattendue lors de l'analyse.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setErrorMessage(null);
        }}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full flex-1 flex flex-col">
        {activeTab === "compare" ? (
          <ComparisonDashboard />
        ) : currentResult ? (
          <ResultsDashboard
            result={currentResult}
            onReset={() => {
              setCurrentResult(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : (
          <div className="flex flex-col flex-1 divide-y divide-border">
            {/* Hero / Intro */}
            <Heading
              title={"Analysez votre CV avant de postuler."}
              description={
                "Comparez votre CV à une offre d'emploi, identifiez les écarts, évaluez sa lisibilité par les systèmes ATS et découvrez comment améliorer votre candidature."
              }
              errorMessage={errorMessage}
              action={
                <Button
                  type="button"
                  label="Analyser ma candidature"
                  icon="ArrowRight"
                  onClick={handleStartAnalysis}
                  disabled={!canAnalyze || isLoading}
                />
              }
            />

            {/* Loading Progression State */}
            {isLoading ? (
              <LoadingProgress />
            ) : (
              <>
                {/* Two Main Cards: Resume (Left) + Job Description (Right) */}
                <div className="flex flex-1 bg-surface">
                  <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-2 items-start divide-x divide-border max-w-[1584px] border-x border-border">
                    <FileUploadCard
                      label="Votre CV"
                      parsedResume={parsedResume}
                      onParsed={(resume) => {
                        setParsedResume(resume);
                        setErrorMessage(null);
                      }}
                      onClear={() => setParsedResume(null)}
                    />

                    <JobCard
                      value={jobDescription}
                      onChange={(val) => {
                        setJobDescription(val);
                        setErrorMessage(null);
                      }}
                      onClear={() => setJobDescription("")}
                    />
                  </div>
                </div>
                {/* Analysis Options and Trigger */}
                <AnalysisOptions
                  analysisMode={analysisMode}
                  onModeChange={setAnalysisMode}
                />
              </>
            )}
          </div>
        )}
      </main>

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={(item) => {
          setCurrentResult(item);
          setActiveTab("single");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onClear={clearHistory}
        onDeleteItem={deleteHistoryItem}
      />
    </div>
  );
}
