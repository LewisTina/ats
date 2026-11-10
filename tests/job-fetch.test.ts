import { describe, expect, it } from "vitest";
import { extractJobFromHtml, htmlToText } from "@/lib/scraping/job-extractor";
import { FetchJobError, isPrivateIp, validateJobUrl } from "@/lib/scraping/safe-fetch";

const LONG_DESC =
  "<p>Nous recherchons un développeur TypeScript expérimenté.</p><ul><li>Next.js</li><li>Node.js</li><li>PostgreSQL</li></ul><p>Au moins 5 ans d'expérience requis sur des projets SaaS.</p>";

describe("job-extractor", () => {
  it("extracts a JobPosting from JSON-LD (inside @graph)", () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "x" },
        {
          "@type": "JobPosting",
          title: "Développeur Full-Stack",
          description: LONG_DESC,
          hiringOrganization: { "@type": "Organization", name: "Acme" },
          jobLocation: { "@type": "Place", address: { addressLocality: "Paris", addressCountry: "FR" } },
          employmentType: ["FULL_TIME"],
        },
      ],
    })}</script></head><body><nav>Menu</nav></body></html>`;

    const job = extractJobFromHtml(html);
    expect(job.source).toBe("json-ld");
    expect(job.title).toBe("Développeur Full-Stack");
    expect(job.text).toContain("Entreprise : Acme");
    expect(job.text).toContain("Localisation : Paris, FR");
    expect(job.text).toContain("- Next.js");
    expect(job.text).not.toContain("<p>");
  });

  it("decodes double-encoded HTML descriptions", () => {
    const encoded = LONG_DESC.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<script type="application/ld+json">{"@type":"JobPosting","title":"Dev","description":"${encoded}"}</script>`;
    const job = extractJobFromHtml(html);
    expect(job.text).not.toMatch(/&lt;|<p>/);
    expect(job.text).toContain("- PostgreSQL");
  });

  it("falls back to main content and strips noise", () => {
    const html = `<html><head><title>Offre Dev</title><script>var x=1</script></head><body>
      <header>Header site</header><nav>Accueil Offres</nav>
      <main><h1>Développeur Backend</h1>${LONG_DESC}</main>
      <footer>Mentions légales</footer></body></html>`;
    const job = extractJobFromHtml(html);
    expect(job.source).toBe("html");
    expect(job.title).toBe("Développeur Backend");
    expect(job.text).toContain("Développeur Backend");
    expect(job.text).not.toContain("Mentions légales");
    expect(job.text).not.toContain("Accueil Offres");
    expect(job.text).not.toContain("var x");
  });

  it("ignores malformed JSON-LD", () => {
    const html = `<script type="application/ld+json">{oops</script><main>${LONG_DESC}</main>`;
    expect(extractJobFromHtml(html).source).toBe("html");
  });

  it("htmlToText keeps line breaks", () => {
    expect(htmlToText("<p>A</p><p>B<br>C</p>")).toBe("A\nB\nC");
  });

  it("merges JSON-LD metadata with full page sections when JSON-LD description is partial", () => {
    const mission =
      "<p>Descriptif de la mission</p><p>Notre client recherche un Développeur React/NextJS afin d'intégrer ses équipes.</p><ul><li>Développer les US</li></ul>";
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@type": "JobPosting",
      title: "Développeur React",
      description: mission,
      hiringOrganization: { name: "Acme" },
      baseSalary: { currency: "EUR", value: { value: 500, unitText: "DAY" } },
    })}</script></head><body><main>
      <p>Publiée le 09/11/2026 Partager cette offre</p>
      <div class="card"><div>${mission}</div></div>
      <div class="card"><h2>Profil recherché</h2><ul><li>5 à 10 ans d'expérience</li><li>Autonomie</li></ul></div>
      <div class="card"><h2>Environnement de travail</h2><p>NextJS 16 / TypeScript / Tailwind / JIRA / GIT</p></div>
      <div class="card"><h2>Découvrir Acme</h2><p>Acme est une ESN fondée en 2011.</p></div>
      <div class="card"><h2>Postulez à cette offre !</h2><p>100% gratuit</p></div>
      <div class="sticky"><p>Développeur React</p><p>Acme</p></div>
    </main></body></html>`;

    const job = extractJobFromHtml(html);
    expect(job.source).toBe("json-ld+html");
    expect(job.text).toContain("Salaire : 500 EUR / DAY");
    expect(job.text).toContain("Profil recherché");
    expect(job.text).toContain("5 à 10 ans d'expérience");
    expect(job.text).toContain("NextJS 16 / TypeScript / Tailwind");
    expect(job.text).not.toContain("Publiée le");
    expect(job.text).not.toContain("ESN fondée");
    expect(job.text).not.toContain("100% gratuit");
    expect(job.text.trim().endsWith("JIRA / GIT")).toBe(true);
  });

  it("removes noise sections in flat layouts", () => {
    const html = `<main><h2>Missions</h2>${LONG_DESC}<h2>Offres similaires</h2><p>Dev Java chez Foo</p><p>Dev Python chez Bar</p><h2>Stack</h2><p>React, Node.js</p></main>`;
    const job = extractJobFromHtml(html);
    expect(job.text).toContain("Stack");
    expect(job.text).toContain("React, Node.js");
    expect(job.text).not.toContain("Dev Java chez Foo");
  });
});

describe("safe-fetch guards", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.20.0.1",
    "192.168.1.10",
    "169.254.169.254",
    "0.0.0.0",
    "::1",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
  ])("blocks private IP %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "151.101.1.69", "2606:4700::1111"])("allows public IP %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });

  it.each([
    "ftp://example.com/job",
    "file:///etc/passwd",
    "http://localhost:3000",
    "http://ollama.local/",
    "http://example.com:11434/",
    "http://user:pass@example.com/",
    "pas une url",
  ])("rejects %s", (url) => {
    expect(() => validateJobUrl(url)).toThrow(FetchJobError);
  });

  it("accepts a regular https URL", () => {
    expect(validateJobUrl("https://www.welcometothejungle.com/fr/jobs/abc").hostname).toBe(
      "www.welcometothejungle.com"
    );
  });
});
