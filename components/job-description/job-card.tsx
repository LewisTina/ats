"use client";

import React, { useState } from "react";
import { CircleCheck, CloudDownload, Eraser, Link2, LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";
import Panel from "../blocks/panel";

interface JobCardProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
}

const SAMPLE_JOBS = [
  {
    label: "Full-Stack Senior",
    text: `Poste : Développeur Full-Stack Senior (TypeScript / Next.js / Node.js)
Localisation : Paris (Télétravail hybride 2j/semaine)
Contrat : CDI

À propos du rôle :
Nous recherchons un(e) Développeur(se) Full-Stack Senior pour concevoir, développer et faire évoluer notre plateforme SaaS à fort trafic. Vous travaillerez au sein d'une équipe agile en collaboration directe avec le Product Manager et les designers.

Missions et responsabilités :
- Concevoir et implémenter des fonctionnalités complètes de l'interface jusqu'à la base de données.
- Développer des composants UI modernes, accessibles et performants avec Next.js et Tailwind CSS.
- Structurer et maintenir des API REST et GraphQL robustes avec Node.js et TypeScript.
- Optimiser les requêtes sur notre base de données PostgreSQL.
- Participer à l'amélioration de la chaîne CI/CD et à la conteneurisation avec Docker.
- Garantir la qualité du code par des tests unitaires et d'intégration (Jest ou Vitest).

Profil recherché :
- Au moins 5 ans d'expérience professionnelle en développement web.
- Maîtrise indispensable de TypeScript, React, Next.js et Node.js.
- Expérience solide avec PostgreSQL et la modélisation de données (SQL).
- Bonne connaissance de Docker et des pratiques CI/CD.
- Pratique du TDD et des tests automatisés appréciée.
- Anglais technique courant (équipe internationale).
- Connaissance de Kubernetes et d'AWS est un plus.`,
  },
  {
    label: "Front-End / Design System",
    text: `Poste : Développeur Front-End & Design System
Localisation : Remote / Paris
Expérience requise : 4+ ans

Vos missions :
- Construire, documenter et maintenir notre bibliothèque de composants transverses (Design System) avec React, TypeScript et Tailwind CSS.
- Assurer le respect des normes d'accessibilité (WCAG / a11y) et les performances Core Web Vitals.
- Collaborer avec l'équipe Design UI/UX sur Figma pour industrialiser les tokens de design.
- Mettre en place des tests visuels et d'intégration via Storybook et Playwright.

Exigences :
- 4 années d'expérience minimum sur React et TypeScript.
- Expertise avérée sur Tailwind CSS et la conception de Design Systems modulaires.
- Maîtrise obligatoire de Storybook et des pratiques a11y.
- Sens aigu du détail UI/UX, animations fluides et micro-interactions.
- Bon niveau d'anglais souhaité.`,
  },
  {
    label: "Mobile Developer",
    text: `Poste : Développeur Mobile Senior (React Native / Flutter)
Localisation : Lyon / Remote partiel
Séniorité : 3 à 5 ans

Description du poste :
Pour soutenir la croissance de notre application grand public téléchargée par plus de 500 000 utilisateurs, nous recrutons un Développeur Mobile expérimenté.

Responsabilités :
- Développer de nouvelles fonctionnalités cross-platform sur React Native et Flutter.
- Assurer la communication fluide avec nos API REST / GraphQL.
- Gérer le cycle complet de release sur l'App Store (iOS) et Google Play (Android).
- Optimiser la réactivité de l'application, la gestion de la mémoire et la consommation de batterie.

Compétences indispensables :
- Minimum 3 ans d'expérience sur React Native ou Flutter.
- Solides compétences en TypeScript ou Dart.
- Expérience concrète de soumission d'applications sur Google Play et App Store.
- Bonnes pratiques de tests mobiles.
- Autonomie et rigueur dans le code.`,
  },
];

type FetchStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function JobCard({ value, onChange, onClear }: JobCardProps) {
  const charCount = value.length;
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<FetchStatus>({ kind: "idle" });

  const handleFetch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || status.kind === "loading") return;

    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/fetch-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.text) {
        throw new Error(data.error ?? "Impossible de récupérer l'offre.");
      }
      onChange(data.text);
      setStatus({
        kind: "success",
        message: `Offre récupérée${data.title ? ` : ${data.title}` : ""}. Vérifiez le texte avant de lancer l'analyse.`,
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Impossible de récupérer l'offre.",
      });
    }
  };

  return (
    <Panel
      icon={"Briefcase"}
      indication={`${charCount} caractère${charCount > 1 ? "s" : ""}`}
      action={
        <>
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 text-sm text-foreground/60 hover:text-rose-600 transition-colors"
              title="Effacer le texte"
            >
              <Eraser className="h-3 w-3" />
              <span>Effacer</span>
            </button>
          )}
        </>
      }
      title={"Offre d'emploi"}
    >
      {/* Import from URL */}
      <form onSubmit={handleFetch} className="mb-3 flex flex-col gap-1.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (status.kind !== "loading") setStatus({ kind: "idle" });
              }}
              placeholder="https://… URL de l'offre (Welcome to the Jungle, France Travail, site carrière…)"
              aria-label="URL de l'offre d'emploi"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/40 focus:outline-hidden focus:ring-1 focus:ring-foreground/20"
            />
          </div>
          <button
            type="submit"
            disabled={!url.trim() || status.kind === "loading"}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-muted/60 px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-surface-muted hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status.kind === "loading" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CloudDownload className="h-4 w-4" />
            )}
            <span>{status.kind === "loading" ? "Récupération…" : "Récupérer"}</span>
          </button>
        </div>
        {status.kind === "error" && (
          <p role="alert" className="flex items-start gap-1.5 text-xs text-rose-600">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {status.message}
          </p>
        )}
        {status.kind === "success" && (
          <p role="status" className="flex items-start gap-1.5 text-xs text-emerald-600">
            <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {status.message}
          </p>
        )}
      </form>

      <div className="relative flex-1">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Collez ici la description complète de l'offre d'emploi (intitulé, missions, compétences techniques requises, technologies souhaitées, expérience...)..."
          rows={9}
          className="w-full h-full resize-none rounded-lg border border-border bg-background p-3.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-foreground/40 focus:outline-hidden focus:ring-1 focus:ring-foreground/20 leading-relaxed font-sans pb-20"
        />

        {/* Quick sample insertion */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface absolute bottom-2 px-4 py-2 left-2 right-2 rounded-md">
          <span className="flex items-center gap-1 text-sm text-foreground font-medium mr-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Exemples types :
          </span>
          {SAMPLE_JOBS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => onChange(sample.text)}
              className="rounded-md border border-border bg-surface-muted/60 px-2 py-1 text-sm font-medium text-foreground/75 hover:bg-surface-muted hover:text-foreground transition-colors"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}
