# CV Analyzer — Analyse ATS & Matching CV / Offre d'emploi

**CV Analyzer** est un utilitaire personnel et local conçu pour analyser la compatibilité d'un CV avec une offre d'emploi, évaluer sa lisibilité par les systèmes ATS (*Applicant Tracking Systems*) et comparer plusieurs versions de CV pour identifier la plus adaptée avant de postuler.

> [!IMPORTANT]
> **Ce projet n'est PAS un SaaS.**
> Il s'exécute exclusivement en local sur votre machine (`http://localhost:3000`). Vos CV, offres d'emploi et données restent strictement confidentiels et ne transitent par aucun serveur externe.

---

## ⚡ Démarrage ultra-rapide avec Ollama (100% Local & Hors-ligne)

Le projet intègre nativement **Ollama** comme fournisseur d'intelligence artificielle prioritaire. Cela vous permet de bénéficier d'une analyse sémantique puissante **sans abonnement, sans clé API payante et sans envoyer vos données sur le Cloud**.

### 1. Installer Ollama sur macOS

Si Ollama n'est pas encore installé sur votre Mac :

```bash
# Via Homebrew (recommandé)
brew install ollama

# Ou téléchargez l'application officielle depuis https://ollama.com/download
```

### 2. Télécharger un modèle

Le modèle recommandé est **`qwen3:8b`** (ou `qwen2.5:7b`, `llama3:8b`, `mistral:7b`) :

```bash
# Télécharger et tester le modèle
ollama pull qwen3:8b
```

### 3. Lancer le service Ollama

Assurez-vous qu'Ollama est actif en arrière-plan :

```bash
ollama serve
```
*(Si vous avez installé l'application macOS Ollama, lancez simplement l'application depuis votre dossier Applications).*

### 4. Configurer le projet pour Ollama

Créez ou modifiez votre fichier `.env` à la racine du projet :

```env
AI_PROVIDER=ollama
AI_MODEL=qwen3:8b

# Aucune clé API n'est nécessaire pour Ollama !
```

> [!TIP]
> **Résilience intégrée :** Le parseur IA intègre un filtrage automatique des balises de réflexion `<think>...</think>`, une normalisation des synonymes en français, et un timeout étendu à 5 minutes adapté aux temps de génération des modèles locaux.

---

## 🚀 Installation & Lancement de l'application

### Prérequis
- **Node.js** (v18.x ou supérieur, testé sur Node 22)
- **pnpm** (ou npm / yarn)

### Installation des dépendances

```bash
pnpm install
```

### Lancement du serveur de développement

```bash
pnpm dev
```

Ouvrez ensuite votre navigateur sur **[http://localhost:3000](http://localhost:3000)**.

---

## 🧭 Fonctionnalités principales

### 1. Analyse mono-CV
- **Import universel** : Glissez-déposez votre CV au format **PDF** ou **DOCX** (max 10 Mo).
- **Aperçu du texte extrait** : Visualisez instantanément le texte brut lu par les parseurs pour vérifier qu'aucun bloc n'a été perdu.
- **Détection des CV scannés** : Alerte explicite si le document ne contient pas de texte sélectionnable (document scanné ou image vectorisée).
- **Saisie de l'offre** : Collez l'annonce ou utilisez l'un des boutons d'offres types prédéfinies (*Full-Stack Senior*, *Front-End / Design System*, *Mobile React Native*).
- **Sélection du positionnement** : *Full-Stack*, *Front-End / Design System*, *Mobile* ou *Général*.
- **Choix du mode d'analyse** :
  - **Mode Rapide (Local)** : 100% déterministe, instantané, sans IA ni connexion réseau.
  - **Mode Intelligent (LLM)** : Analyse déterministe enrichie par votre modèle Ollama local (ou un fournisseur cloud).

### 2. Comparateur multi-versions de CV
- Importez plusieurs déclinaisons de votre profil (ex. *CV Full-Stack*, *CV Front-End*, *CV Mobile*) face à la même offre d'emploi.
- Tableau comparatif côte à côte : Score ATS, Score de matching, exigences bloquantes manquantes et points forts.
- **Recommandation objective** : Le moteur sélectionne la version la plus adaptée en pénalisant en priorité les exigences obligatoires non couvertes avant le simple score brut.

### 3. Les deux scores indépendants
- **Score de lisibilité ATS (sur 100)** : Évalue la qualité d'extraction (35%), la clarté des rubriques standards (25%), la fluidité de lecture (20%) et les coordonnées indispensables (20%).
- **Score de matching (sur 100)** : Évalue l'adéquation technique, la séniorité, les responsabilités et le contexte métier avec détection des exigences indispensables manquées.

### 4. Garde-fous contre les faux équivalents
Le moteur d'analyse déterministe intègre des règles strictes évitant les erreurs fréquentes des ATS :
- `JavaScript` ne valide **pas** `Java`.
- `React` ne valide **pas** automatiquement `React Native`.
- `Docker` ne valide **pas** `Kubernetes`.
- Les années d'expérience globales ne sont pas confondues avec les années sur une technologie précise.

### 5. Historique local
Toutes vos analyses peuvent être conservées dans l'historique local (`localStorage`) de votre navigateur, consultables et rechargeables en un clic sans serveur de base de données.

---

## 🛠️ Configuration des Fournisseurs Alternatifs (Optionnel)

Si vous souhaitez utiliser un fournisseur Cloud à la place d'Ollama, configurez votre fichier `.env` :

```env
# OpenAI
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini

# OpenRouter
AI_PROVIDER=openrouter
AI_API_KEY=sk-or-...
AI_MODEL=anthropic/claude-3.5-sonnet

# Google Gemini
AI_PROVIDER=gemini
AI_API_KEY=AIzaSy...
AI_MODEL=gemini-2.0-flash

# Groq (Inférence ultra-rapide)
AI_PROVIDER=groq
AI_API_KEY=gsk_...
AI_MODEL=llama-3.3-70b-versatile
```

---

## 🧪 Tests & Qualité de code

Le projet dispose d'une suite complète de tests automatisés avec **Vitest** couvrant les parseurs, le moteur de règles, la normalisation des compétences et la résilience Zod :

```bash
# Exécuter les 21 tests automatisés
pnpm test

# Lancer les tests en mode écoute
pnpm test:watch
```

### Compiler pour la production

```bash
pnpm build
pnpm start
```

---

## 🏗️ Stack Technique

- **Framework** : [Next.js 15](https://nextjs.org/) (App Router, Route Handlers)
- **UI / Styles** : [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Design System** : Inspiré de la sobriété et de l'ergonomie de Linear, Raycast et Vercel (Dark & Light mode natifs)
- **Extraction PDF** : `pdfjs-dist` (reconstitution géométrique de l'ordre de lecture)
- **Extraction DOCX** : `mammoth`
- **Validation & Typage** : [TypeScript](https://www.typescriptlang.org/) (Strict), [Zod](https://zod.dev/)
- **Tests** : [Vitest](https://vitest.dev/)
- **IA locale** : [Ollama](https://ollama.com/)
