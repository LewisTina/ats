"use client";

import React from "react";
import { Briefcase, Eraser, Sparkles } from "lucide-react";

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

export function JobCard({ value, onChange, onClear }: JobCardProps) {
  const charCount = value.length;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-5 shadow-xs transition-all">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-muted text-foreground/80">
            <Briefcase className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            Offre d'emploi
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-foreground/50 font-medium">
            {charCount} caractère{charCount > 1 ? "s" : ""}
          </span>
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 text-[11px] text-foreground/60 hover:text-rose-600 transition-colors"
              title="Effacer le texte"
            >
              <Eraser className="h-3 w-3" />
              <span>Effacer</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Collez ici la description complète de l'offre d'emploi (intitulé, missions, compétences techniques requises, technologies souhaitées, expérience...)..."
          rows={9}
          className="w-full resize-none rounded-lg border border-border bg-background p-3.5 text-xs text-foreground placeholder:text-foreground/40 focus:border-foreground/40 focus:outline-hidden focus:ring-1 focus:ring-foreground/20 leading-relaxed font-sans"
        />

        {/* Quick sample insertion */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
          <span className="flex items-center gap-1 text-[11px] text-foreground/50 font-medium mr-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Exemples types :
          </span>
          {SAMPLE_JOBS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => onChange(sample.text)}
              className="rounded-md border border-border bg-surface-muted/60 px-2 py-1 text-[11px] font-medium text-foreground/75 hover:bg-surface-muted hover:text-foreground transition-colors"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

