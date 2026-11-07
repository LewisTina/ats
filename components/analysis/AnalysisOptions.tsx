"use client";

import React from "react";
import {
  Compass,
  Cpu,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { TargetPosition, AnalysisMode } from "@/types";

interface AnalysisOptionsProps {
  targetPosition: TargetPosition;
  onPositionChange: (pos: TargetPosition) => void;
  analysisMode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  onAnalyze: () => void;
  canAnalyze: boolean;
  isLoading: boolean;
}

const POSITIONS: Array<{ id: TargetPosition; label: string; desc: string }> = [
  {
    id: "fullstack",
    label: "Full-Stack",
    desc: "Équilibre Frontend (React/Next), Backend (Node/API) et DB",
  },
  {
    id: "frontend",
    label: "Front-End / Design System",
    desc: "Composants, ergonomie UI/UX, accessibilité et animations",
  },
  {
    id: "mobile",
    label: "Mobile",
    desc: "React Native, Flutter, stores iOS / Android",
  },
  {
    id: "general",
    label: "Général",
    desc: "Analyse polyvalente basée sur les exigences strictes de l'offre",
  },
];

export function AnalysisOptions({
  targetPosition,
  onPositionChange,
  analysisMode,
  onModeChange,
  onAnalyze,
  canAnalyze,
  isLoading,
}: AnalysisOptionsProps) {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 shadow-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left: Positionnement */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground tracking-tight">
            <Compass className="h-4 w-4 text-accent" />
            <span>Positionnement ciblé</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {POSITIONS.map((pos) => {
              const active = targetPosition === pos.id;
              return (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => onPositionChange(pos.id)}
                  className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-all ${
                    active
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-border bg-background hover:bg-surface-muted"
                  }`}
                >
                  <span
                    className={`text-xs font-semibold ${
                      active ? "text-accent" : "text-foreground"
                    }`}
                  >
                    {pos.label}
                  </span>
                  <span className="text-[10px] text-foreground/50 line-clamp-2 mt-0.5">
                    {pos.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Mode d'analyse */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground tracking-tight">
            <Cpu className="h-4 w-4 text-accent" />
            <span>Moteur d'analyse</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
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
                    analysisMode === "fast" ? "text-amber-500" : "text-foreground/50"
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
                    analysisMode === "smart" ? "text-accent" : "text-foreground/50"
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

          <div className="flex items-center gap-1.5 text-[11px] text-foreground/60 pt-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Vos documents restent strictement locaux sur votre MacBook.</span>
          </div>
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

