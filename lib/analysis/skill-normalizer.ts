export interface SkillDefinition {
  canonical: string;
  category: "frontend" | "backend" | "mobile" | "database" | "devops" | "testing" | "architecture" | "tools" | "general";
  aliases: string[];
  // RegEx pattern to match strictly (preventing false matches like Java in JavaScript)
  matchPattern?: RegExp;
}

export const SKILL_CATALOG: SkillDefinition[] = [
  // Mobile (check before generic React / languages)
  {
    canonical: "React Native",
    category: "mobile",
    aliases: ["react-native", "reactnative", "rn"],
    matchPattern: /\b(react[\s\-_]?native|reactnative)\b/i,
  },
  {
    canonical: "Flutter",
    category: "mobile",
    aliases: ["flutter", "dart/flutter"],
    matchPattern: /\bflutter\b/i,
  },
  {
    canonical: "Swift",
    category: "mobile",
    aliases: ["swift", "swiftui"],
    matchPattern: /\b(swift|swiftui)\b/i,
  },
  {
    canonical: "Kotlin",
    category: "mobile",
    aliases: ["kotlin", "jetpack compose"],
    matchPattern: /\b(kotlin|jetpack\s+compose)\b/i,
  },
  {
    canonical: "iOS",
    category: "mobile",
    aliases: ["ios"],
    matchPattern: /\bios\b/i,
  },
  {
    canonical: "Android",
    category: "mobile",
    aliases: ["android"],
    matchPattern: /\bandroid\b/i,
  },

  // Frontend
  {
    canonical: "React",
    category: "frontend",
    aliases: ["reactjs", "react.js"],
    // Crucial: Must NOT match React Native
    matchPattern: /\b(react|react\.js|reactjs)(?!\s*[\-_]?\s*native)\b/i,
  },
  {
    canonical: "Next.js",
    category: "frontend",
    aliases: ["nextjs", "next.js", "next 13", "next 14", "next 15"],
    matchPattern: /\b(next\.js|nextjs|next\s*1[3456])\b/i,
  },
  {
    canonical: "Vue.js",
    category: "frontend",
    aliases: ["vue", "vuejs", "vue.js", "vue 3", "nuxt", "nuxtjs"],
    matchPattern: /\b(vue|vuejs|vue\.js|nuxt|nuxtjs)\b/i,
  },
  {
    canonical: "Angular",
    category: "frontend",
    aliases: ["angular", "angularjs", "angular 2+"],
    matchPattern: /\b(angular|angularjs)\b/i,
  },
  {
    canonical: "TypeScript",
    category: "frontend",
    aliases: ["typescript", "ts"],
    matchPattern: /\b(typescript|type\s*script)\b/i,
  },
  {
    canonical: "JavaScript",
    category: "frontend",
    aliases: ["javascript", "js", "es6", "es2020", "esnext", "ecmascript"],
    matchPattern: /\b(javascript|ecmascript|es6|es20\d\d)\b/i,
  },
  {
    canonical: "Tailwind CSS",
    category: "frontend",
    aliases: ["tailwind", "tailwindcss"],
    matchPattern: /\b(tailwind|tailwindcss|tailwind\s*css)\b/i,
  },
  {
    canonical: "HTML / CSS",
    category: "frontend",
    aliases: ["html", "css", "html5", "css3", "sass", "scss"],
    matchPattern: /\b(html5?|css3?|sass|scss)\b/i,
  },
  {
    canonical: "Redux",
    category: "frontend",
    aliases: ["redux", "redux toolkit", "rtk"],
    matchPattern: /\b(redux|redux\s+toolkit|rtk)\b/i,
  },
  {
    canonical: "Design System",
    category: "frontend",
    aliases: ["design system", "storybook", "ui library", "shadcn", "radix ui"],
    matchPattern: /\b(design\s*system|storybook|shadcn|radix[\s\-_]ui|ui\s*components?)\b/i,
  },

  // Backend
  {
    canonical: "Node.js",
    category: "backend",
    aliases: ["node", "nodejs", "node.js"],
    matchPattern: /\b(node\.js|nodejs|node(?:\s+js)?)\b/i,
  },
  {
    canonical: "Java",
    category: "backend",
    aliases: ["java", "spring", "spring boot"],
    // Crucial: Must NOT match JavaScript or JavaFX
    matchPattern: /\b(java(?!\s*script|\s*fx)|spring(?:\s+boot)?)\b/i,
  },
  {
    canonical: "Python",
    category: "backend",
    aliases: ["python", "python3", "django", "fastapi", "flask"],
    matchPattern: /\b(python3?|django|fastapi|flask)\b/i,
  },
  {
    canonical: "Go",
    category: "backend",
    aliases: ["golang", "go language"],
    matchPattern: /\b(golang|go\s+language)\b/i,
  },
  {
    canonical: "Rust",
    category: "backend",
    aliases: ["rust", "rust-lang"],
    matchPattern: /\b(rust|rust\-lang)\b/i,
  },
  {
    canonical: "PHP",
    category: "backend",
    aliases: ["php", "laravel", "symfony"],
    matchPattern: /\b(php|laravel|symfony)\b/i,
  },
  {
    canonical: "C# / .NET",
    category: "backend",
    aliases: ["c#", ".net", "dotnet", "asp.net"],
    matchPattern: /\b(c#|\.net|dotnet|asp\.net)\b/i,
  },
  {
    canonical: "GraphQL",
    category: "backend",
    aliases: ["graphql", "apollo"],
    matchPattern: /\b(graphql|apollo\s+client|apollo\s+server)\b/i,
  },
  {
    canonical: "REST API",
    category: "backend",
    aliases: ["rest", "api rest", "restful", "rest api", "openapi", "swagger"],
    matchPattern: /\b(restful|rest\s*api|apis?\s*rest|openapi|swagger)\b/i,
  },

  // Databases
  {
    canonical: "PostgreSQL",
    category: "database",
    aliases: ["postgres", "postgresql", "pgsql"],
    matchPattern: /\b(postgres|postgresql|pgsql)\b/i,
  },
  {
    canonical: "MySQL",
    category: "database",
    aliases: ["mysql", "mariadb"],
    matchPattern: /\b(mysql|mariadb)\b/i,
  },
  {
    canonical: "MongoDB",
    category: "database",
    aliases: ["mongodb", "mongo"],
    matchPattern: /\b(mongo|mongodb)\b/i,
  },
  {
    canonical: "Redis",
    category: "database",
    aliases: ["redis"],
    matchPattern: /\bredis\b/i,
  },
  {
    canonical: "SQL",
    category: "database",
    aliases: ["sql", "rdbms"],
    matchPattern: /\b(sql|rdbms)\b/i,
  },
  {
    canonical: "Prisma",
    category: "database",
    aliases: ["prisma", "drizzle", "typeorm"],
    matchPattern: /\b(prisma|drizzle(?:\s*orm)?|typeorm)\b/i,
  },

  // DevOps & Cloud
  {
    canonical: "Docker",
    category: "devops",
    aliases: ["docker", "docker compose"],
    // Crucial: Docker is NOT Kubernetes
    matchPattern: /\b(docker|docker\-compose|docker\s*compose)\b/i,
  },
  {
    canonical: "Kubernetes",
    category: "devops",
    aliases: ["k8s", "kubernetes", "helm"],
    matchPattern: /\b(kubernetes|k8s|helm)\b/i,
  },
  {
    canonical: "AWS",
    category: "devops",
    aliases: ["amazon web services", "aws", "s3", "lambda", "ec2"],
    matchPattern: /\b(aws|amazon\s+web\s+services|ec2|s3|lambda)\b/i,
  },
  {
    canonical: "GCP",
    category: "devops",
    aliases: ["google cloud", "google cloud platform", "gcp"],
    matchPattern: /\b(gcp|google\s+cloud(?:\s+platform)?)\b/i,
  },
  {
    canonical: "Azure",
    category: "devops",
    aliases: ["microsoft azure", "azure"],
    matchPattern: /\b(azure|microsoft\s+azure)\b/i,
  },
  {
    canonical: "CI/CD",
    category: "devops",
    aliases: [
      "ci/cd",
      "cicd",
      "integration continue",
      "intégration continue",
      "continuous integration",
      "continuous deployment",
      "deploiement continu",
      "déploiement continu",
      "gitlab ci",
      "github actions",
    ],
    matchPattern: /\b(ci[\/\-_]cd|cicd|int[ée]gration\s+continue|d[ée]ploiement\s+continu|continuous\s+integration|github\s+actions|gitlab\s+ci)\b/i,
  },
  {
    canonical: "Linux",
    category: "devops",
    aliases: ["linux", "bash", "shell", "unix"],
    matchPattern: /\b(linux|bash|shell|unix)\b/i,
  },
  {
    canonical: "Terraform",
    category: "devops",
    aliases: ["terraform", "iac", "infrastructure as code"],
    matchPattern: /\b(terraform|infrastructure\s+as\s+code|iac)\b/i,
  },

  // Testing
  {
    canonical: "Jest",
    category: "testing",
    aliases: ["jest"],
    matchPattern: /\bjest\b/i,
  },
  {
    canonical: "Vitest",
    category: "testing",
    aliases: ["vitest"],
    matchPattern: /\bvitest\b/i,
  },
  {
    canonical: "Cypress",
    category: "testing",
    aliases: ["cypress"],
    matchPattern: /\bcypress\b/i,
  },
  {
    canonical: "Playwright",
    category: "testing",
    aliases: ["playwright"],
    matchPattern: /\bplaywright\b/i,
  },
  {
    canonical: "TDD",
    category: "testing",
    aliases: ["tdd", "test driven development", "tests unitaires", "unit tests"],
    matchPattern: /\b(tdd|test[\s\-_]driven|tests?\s+unitaires?|unit\s+tests?|e2e\s+tests?)\b/i,
  },

  // Architecture & Tools
  {
    canonical: "Git",
    category: "tools",
    aliases: ["git", "github", "gitlab"],
    matchPattern: /\b(git|github|gitlab)\b/i,
  },
  {
    canonical: "Architecture Logicielle",
    category: "architecture",
    aliases: ["architecture", "clean architecture", "ddd", "microservices", "design patterns"],
    matchPattern: /\b(clean\s*architecture|hexagonal[e]?|microservices?|domain[\s\-_]driven|ddd|architecture\s+logicielle)\b/i,
  },
  {
    canonical: "Méthodologie Agile / Scrum",
    category: "general",
    aliases: ["agile", "scrum", "kanban", "jira"],
    matchPattern: /\b(agile|scrum|kanban|sprint|jira)\b/i,
  },
];

/**
 * Normalizes an arbitrary skill term to its canonical name if known.
 */
export function normalizeSkill(rawSkill: string): string {
  const clean = rawSkill.trim().toLowerCase();
  for (const skill of SKILL_CATALOG) {
    if (skill.canonical.toLowerCase() === clean) {
      return skill.canonical;
    }
    for (const alias of skill.aliases) {
      if (alias.toLowerCase() === clean) {
        return skill.canonical;
      }
    }
    if (skill.matchPattern && skill.matchPattern.test(clean)) {
      return skill.canonical;
    }
  }
  return rawSkill.trim();
}

/**
 * Detects all known technical skills in a body of text with exact boundary checks.
 */
export function extractSkillsFromText(text: string): string[] {
  const detected = new Set<string>();

  for (const skill of SKILL_CATALOG) {
    const pattern = skill.matchPattern;
    if (pattern && pattern.test(text)) {
      detected.add(skill.canonical);
    }
  }

  return Array.from(detected);
}

/**
 * Checks whether a given target skill is demonstrated or mentioned in the text.
 * Handles synonyms and prevents false positives (e.g. Java in JavaScript, React in React Native).
 */
export function isSkillPresentInText(
  skillName: string,
  text: string
): { present: boolean; matchedAlias?: string; snippet?: string } {
  const canonical = normalizeSkill(skillName);
  const def = SKILL_CATALOG.find((s) => s.canonical === canonical);

  if (def && def.matchPattern) {
    const match = text.match(def.matchPattern);
    if (match && typeof match.index === "number") {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + match[0].length + 60);
      const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
      return { present: true, matchedAlias: match[0], snippet: `…${snippet}…` };
    }
  }

  // Fallback for custom skills not in catalog: strict word boundary regex
  const escaped = skillName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fallbackRegex = new RegExp(`(^|[^a-zA-Z0-9_#\\+])${escaped}([^a-zA-Z0-9_#\\+]|$)`, "i");
  const match = text.match(fallbackRegex);
  if (match && typeof match.index === "number") {
    const start = Math.max(0, match.index - 50);
    const end = Math.min(text.length, match.index + match[0].length + 60);
    const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
    return { present: true, snippet: `…${snippet}…` };
  }

  return { present: false };
}
