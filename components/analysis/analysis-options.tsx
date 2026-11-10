"use client";

import React from "react";
import {
  Cpu,
  Zap,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { AnalysisMode } from "@/types";

interface AnalysisOptionsProps {
  analysisMode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  onAnalyze: () => void;
  canAnalyze: boolean;
  isLoading: boolean;
}

export function AnalysisOptions({
  analysisMode,
  onModeChange,
  onAnalyze,
  canAnalyze,
  isLoading,
}: AnalysisOptionsProps) {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 shadow-xs">
      {/* Mode d'analyse */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground tracking-tight">
          <Cpu className="h-4 w-4 text-accent" />
          <span>Moteur d'analyse</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Mode Rapide */}
          <button
            type="button"
            onClick={() => onModeChange("fast")}
            className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-all ${
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
                className={`text-xs font-semibold ${
                  analysisMode === "fast" ? "text-accent" : "text-foreground"
                }`}
              >
                Rapide (Local)
              </span>
            </div>
            <span className="text-[10px] text-foreground/50 mt-1">
              Analyse déterministe hors-ligne. Aucune clé API requise.
            </span>
          </button>

          {/* Mode Intelligent */}
          <button
            type="button"
            onClick={() => onModeChange("smart")}
            className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-all ${
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
                className={`text-xs font-semibold ${
                  analysisMode === "smart" ? "text-accent" : "text-foreground"
                }`}
              >
                Intelligent (LLM)
              </span>
            </div>
            <span className="text-[10px] text-foreground/50 mt-1">
              Analyse déterministe enrichie par compréhension sémantique.
            </span>
          </button>
        </div>
      </div>

      {/* Main Action Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!canAnalyze || isLoading}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all shadow-xs ${
            !canAnalyze || isLoading
              ? "cursor-not-allowed bg-surface-muted text-foreground/40 border border-border"
              : "cursor-pointer bg-foreground text-background hover:opacity-90 active:scale-[0.99]"
          }`}
        >
          <span>Analyser ma candidature</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
