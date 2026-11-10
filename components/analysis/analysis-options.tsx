"use client";

import React from "react";
import { Cpu, Zap, Sparkles, ArrowRight } from "lucide-react";
import type { AnalysisMode } from "@/types";

interface AnalysisOptionsProps {
  analysisMode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
}

export function AnalysisOptions({
  analysisMode,
  onModeChange,
}: AnalysisOptionsProps) {
  return (
    <div className="flex bg-surface">
      {/* Mode d'analyse */}
      <div className="w-full max-w-[1584px] border-x border-border p-3 sm:p-5 mx-auto flex flex-col sm:flex-row justify-between gap-2 md:gap-8">
        <div className="flex items-center gap-1.5 text-base font-semibold text-foreground tracking-tight">
          <Cpu className="h-6 w-6 text-accent" />
          <span>Moteur d'analyse</span>
        </div>

        <div className="grid grid-cols-2 gap-1">
          {/* Mode Rapide */}
          <button
            type="button"
            onClick={() => onModeChange("fast")}
            className={`flex flex-col items-start rounded-l-2xl rounded-r-md px-4 py-2 border text-left transition-all ${
              analysisMode === "fast"
                ? "border-accent bg-accent/5 ring-1 ring-accent"
                : "border-border bg-background hover:bg-surface-muted"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Zap
                className={`h-3.5 w-3.5 ${
                  analysisMode === "fast"
                    ? "text-amber-500"
                    : "text-foreground/50"
                }`}
              />
              <span
                className={`text-sm font-semibold ${
                  analysisMode === "fast" ? "text-accent" : "text-foreground"
                }`}
              >
                Rapide (Local)
              </span>
            </div>
            <span className="text-xs text-foreground/50 hidden sm:block">
              Analyse déterministe hors-ligne. Aucune clé API requise.
            </span>
          </button>

          {/* Mode Intelligent */}
          <button
            type="button"
            onClick={() => onModeChange("smart")}
            className={`flex flex-col items-start rounded-l-md rounded-r-2xl  px-4 py-2 border text-left transition-all ${
              analysisMode === "smart"
                ? "border-accent bg-accent/5 ring-1 ring-accent"
                : "border-border bg-background hover:bg-surface-muted"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles
                className={`h-3.5 w-3.5 ${
                  analysisMode === "smart"
                    ? "text-accent"
                    : "text-foreground/50"
                }`}
              />
              <span
                className={`text-sm font-semibold ${
                  analysisMode === "smart" ? "text-accent" : "text-foreground"
                }`}
              >
                Intelligent (LLM)
              </span>
            </div>
            <span className="text-xs text-foreground/50 hidden sm:block">
              Analyse déterministe enrichie par compréhension sémantique.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
