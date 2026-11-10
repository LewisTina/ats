"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";

interface LoadingProgressProps {
  currentStage?: string;
}

const STAGES = [
  "Extraction et lecture du CV",
  "Analyse de la structure et des rubriques ATS",
  "Identification des exigences de l'offre",
  "Comparaison stricte des compétences et expériences",
  "Génération des recommandations et de la synthèse",
  "Finalisation du rapport",
];

export function LoadingProgress({ currentStage }: LoadingProgressProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 450);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-8 shadow-xs my-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-1">
        Analyse en cours…
      </h3>
      <p className="text-xs text-foreground/60 mb-6">
        Évaluation de la lisibilité ATS et calcul du score de correspondance
      </p>

      <div className="w-full max-w-md space-y-2.5">
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;

          return (
            <div
              key={stage}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs transition-colors ${
                isCurrent
                  ? "border-accent/40 bg-accent/5 text-foreground font-medium"
                  : isDone
                  ? "border-border/60 bg-surface text-foreground/70"
                  : "border-transparent text-foreground/40"
              }`}
            >
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isDone
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-accent text-white"
                    : "bg-surface-muted text-foreground/40"
                }`}
              >
                {isDone ? <Check className="h-2.5 w-2.5" /> : idx + 1}
              </div>
              <span className="truncate">{stage}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

