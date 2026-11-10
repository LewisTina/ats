"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Moon,
  Sun,
  History,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";

interface HeaderProps {
  activeTab: "single" | "compare";
  onTabChange: (tab: "single" | "compare") => void;
  onOpenHistory: () => void;
  historyCount: number;
}

export function Header({
  activeTab,
  onTabChange,
  onOpenHistory,
  historyCount,
}: HeaderProps) {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [aiInfo, setAiInfo] = useState<{
    configured: boolean;
    providerName: string;
  } | null>(null);

  useEffect(() => {
    // Check initial theme
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);

    // Fetch AI configuration status
    fetch("/api/ai-status")
      .then((res) => res.json())
      .then((data) => setAiInfo(data))
      .catch(() => null);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("cv_analyzer_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("cv_analyzer_theme", "light");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/80 backdrop-blur-md overflow-hidden">
      <div className="mx-auto flex gap-2 p-4 sm:px-6 max-w-[1584px] border-x border-border items-center justify-between">
        {/* Left: Branding */}
        <div className="items-center gap-3 hidden sm:flex">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground tracking-tight">
                CV Analyzer
              </span>
            </div>
            <p className="text-xs text-foreground/60 hidden lg:block">
              Analyse locale de candidatures & ATS
            </p>
          </div>
        </div>

        {/* Center: Mode Switcher */}
        <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 shadow-xs">
          <button
            type="button"
            onClick={() => onTabChange("single")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              activeTab === "single"
                ? "bg-foreground text-background shadow-xs"
                : "text-foreground/70 hover:text-foreground"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="truncate overflow-hidden text-ellipsis inline-block">
              Analyse
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange("compare")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              activeTab === "compare"
                ? "bg-foreground text-background shadow-xs"
                : "text-foreground/70 hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="truncate overflow-hidden text-ellipsis inline-block">
              Comparatif Multi-CV
            </span>
          </button>
        </div>

        {/* Right: Actions & Theme */}
        <div className="flex items-center gap-2">
          {/* AI Provider Indicator */}
          {aiInfo && (
            <div
              className={`hidden md:flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border ${
                aiInfo.configured
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border bg-surface-muted text-foreground/60"
              }`}
              title={
                aiInfo.configured
                  ? `Fournisseur IA actif : ${aiInfo.providerName}`
                  : "Mode intelligent inactif (aucune clé API configurée dans .env.local)"
              }
            >
              {aiInfo.configured ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  <span>IA : {aiInfo.providerName.split(" ")[0]}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  <span>Mode Rapide (Local)</span>
                </>
              )}
            </div>
          )}

          {/* History Button */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground/80 hover:bg-surface-muted transition-colors"
            title="Historique des analyses locales"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Historique</span>
            {historyCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                {historyCount}
              </span>
            )}
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-md border border-border bg-surface p-1.5 text-foreground/80 hover:bg-surface-muted transition-colors"
            aria-label="Basculer le thème"
            title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
