import * as cheerio from "cheerio";

export const MIN_JOB_TEXT_LENGTH = 100;
export const MAX_JOB_TEXT_LENGTH = 20_000;

export interface ExtractedJob {
  title?: string;
  text: string;
  source: "json-ld" | "html" | "json-ld+html";
}

type JsonObject = Record<string, unknown>;

const BLOCK_SELECTOR =
  "p,div,section,article,header,footer,ul,ol,li,h1,h2,h3,h4,h5,h6,tr,table,blockquote,pre,dl,dt,dd";

const NOISE_SELECTOR = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "iframe",
  "canvas",
  "form",
  "button",
  "nav",
  "footer",
  "header",
  "aside",
  "[role=navigation]",
  "[role=banner]",
  "[role=contentinfo]",
  "[aria-hidden=true]",
  "[hidden]",
].join(",");

const MAIN_CANDIDATES = [
  "[itemtype*='JobPosting']",
  "main",
  "article",
  "[role=main]",
  "#content",
  ".content",
  "body",
];

/** Normalise whitespace while preserving paragraph breaks. */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Convert an HTML fragment to readable plain text (keeps line breaks and bullets). */
export function htmlToText(html: string): string {
  const $ = cheerio.load(`<div id="__root">${decodeIfEntityEncoded(html)}</div>`);
  const root = $("#__root");
  root.find("script,style,noscript,template").remove();
  root.find("br").replaceWith("\n");
  root.find("li").each((_, el) => {
    $(el).prepend("- ");
  });
  root.find(BLOCK_SELECTOR).each((_, el) => {
    $(el).append("\n");
  });
  return normalizeText(root.text());
}

/** Some sites entity-encode HTML in JSON-LD descriptions (e.g. "&lt;p&gt;"): decode it first. */
function decodeIfEntityEncoded(html: string): string {
  if (/<[a-z]/i.test(html) || !/&lt;\/?[a-z]/i.test(html)) return html;
  return cheerio.load(`<textarea>${html}</textarea>`)("textarea").text();
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function isJobPosting(node: unknown): node is JsonObject {
  if (!node || typeof node !== "object") return false;
  const type = (node as JsonObject)["@type"];
  return asArray(type as string | string[]).some(
    (t) => typeof t === "string" && t.toLowerCase() === "jobposting"
  );
}

function findJobPosting(node: unknown, depth = 0): JsonObject | undefined {
  if (!node || typeof node !== "object" || depth > 6) return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (isJobPosting(node)) return node;
  const obj = node as JsonObject;
  for (const key of ["@graph", "mainEntity", "itemListElement", "item"]) {
    const found = findJobPosting(obj[key], depth + 1);
    if (found) return found;
  }
  return undefined;
}

function str(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const obj = value as JsonObject;
    return str(obj.name) ?? str(obj.value) ?? str(obj["@value"]);
  }
  return undefined;
}

function richText(value: unknown): string | undefined {
  const parts = asArray(value as unknown)
    .map((v) => {
      const s = str(v);
      return s ? htmlToText(s) : undefined;
    })
    .filter(Boolean);
  return parts.length ? parts.join("\n") : undefined;
}

function formatLocation(jobLocation: unknown): string | undefined {
  const locations = asArray(jobLocation as unknown)
    .map((loc) => {
      if (!loc || typeof loc !== "object") return str(loc);
      const address = (loc as JsonObject).address;
      if (typeof address === "string") return address;
      if (!address || typeof address !== "object") return str(loc);
      const a = address as JsonObject;
      return [a.addressLocality, a.addressRegion, a.addressCountry]
        .map(str)
        .filter(Boolean)
        .join(", ");
    })
    .filter(Boolean);
  return locations.length ? Array.from(new Set(locations)).join(" / ") : undefined;
}

function formatSalary(baseSalary: unknown): string | undefined {
  if (!baseSalary || typeof baseSalary !== "object") return str(baseSalary);
  const s = baseSalary as JsonObject;
  const currency = str(s.currency) ?? "";
  const value = s.value;
  if (value && typeof value === "object") {
    const v = value as JsonObject;
    const unit = str(v.unitText);
    const range =
      v.minValue !== undefined && v.maxValue !== undefined
        ? `${str(v.minValue)} - ${str(v.maxValue)}`
        : str(v.value) ?? str(v.minValue) ?? str(v.maxValue);
    if (!range) return undefined;
    return [range, currency, unit ? `/ ${unit}` : ""].filter(Boolean).join(" ");
  }
  const flat = str(value);
  return flat ? `${flat} ${currency}`.trim() : undefined;
}

interface JsonLdJob {
  title?: string;
  /** Structured metadata lines (Poste, Entreprise, Localisation, ...). */
  header: string;
  /** Free-text sections (description, skills, qualifications, ...). */
  body: string;
  /** Plain-text description only, used to anchor it inside the page content. */
  description: string;
  company?: string;
}

function parseJobPosting(job: JsonObject): JsonLdJob {
  const title = str(job.title);
  const header: string[] = [];
  const push = (label: string, value: string | undefined) => {
    if (value) header.push(`${label} : ${value}`);
  };

  push("Poste", title);
  push("Entreprise", str(job.hiringOrganization));
  push("Localisation", formatLocation(job.jobLocation));
  if (str(job.jobLocationType)?.toUpperCase() === "TELECOMMUTE") {
    push("Télétravail", "Oui");
  }
  push("Contrat", asArray(job.employmentType as unknown).map(str).filter(Boolean).join(", ") || undefined);
  push("Salaire", formatSalary(job.baseSalary));
  push("Expérience", richText(job.experienceRequirements));

  const body: string[] = [];
  const sections: Array<[string, unknown]> = [
    ["Description", job.description],
    ["Responsabilités", job.responsibilities],
    ["Compétences", job.skills],
    ["Qualifications", job.qualifications],
    ["Formation", job.educationRequirements],
  ];
  for (const [label, value] of sections) {
    const text = richText(value);
    if (text) body.push("", `${label} :`, text);
  }

  return {
    title,
    header: normalizeText(header.join("\n")),
    body: normalizeText(body.join("\n")),
    description: richText(job.description) ?? "",
    company: str(job.hiringOrganization),
  };
}

function findJsonLdJob($: cheerio.CheerioAPI): JsonLdJob | undefined {
  const scripts = $("script[type='application/ld+json']").toArray();
  for (const script of scripts) {
    const raw = $(script).contents().text().trim();
    if (!raw) continue;
    try {
      // Some sites leave trailing control chars / newlines in strings.
      const data = JSON.parse(raw.replace(/[\u0000-\u001f]+/g, " "));
      const job = findJobPosting(data);
      if (job) return parseJobPosting(job);
    } catch {
      // Malformed JSON-LD: ignore and keep trying.
    }
  }
  return undefined;
}

/** Extract a schema.org JobPosting from JSON-LD scripts only. */
export function extractFromJsonLd($: cheerio.CheerioAPI): ExtractedJob | undefined {
  const job = findJsonLdJob($);
  if (!job) return undefined;
  const text = normalizeText(`${job.header}\n\n${job.body}`);
  return text.length >= MIN_JOB_TEXT_LENGTH ? { title: job.title, text, source: "json-ld" } : undefined;
}

/** Headings of page sections that are never part of the job offer itself. */
const NOISE_HEADING =
  /^(d[ée]couvr|postule|candidat(ez|er)|trouvez|offres? (similaires|proches|qui|susceptibles|recommand)|d'autres offres|autres offres|nos autres|voir (aussi|les offres)|vous (aimerez|pourriez)|ces offres|ils recrutent|entreprises? similaires|partag|share|similar|related|recommended|more jobs|other jobs|apply|newsletter|inscri|cr[ée]e[rz]? (votre|une) alerte|alerte|recevez|cookies?|t[ée]l[ée]charge[rz]? l'app|suivez|follow us|à lire|articles?|blog|faq|questions fr[ée]quentes|signaler)/i;

const HEADING_SELECTOR = "h1,h2,h3,h4";

function headingLevel(el: cheerio.Cheerio<any>): number {
  return Number((el.get(0)?.tagName ?? "h6").slice(1)) || 6;
}

/**
 * Remove page sections whose heading clearly isn't job content
 * (company teaser, "apply now", similar offers, newsletter...).
 */
function removeNoiseSections($: cheerio.CheerioAPI): void {
  $(HEADING_SELECTOR).each((_, node) => {
    const heading = $(node);
    if (!heading.parent().length) return; // already removed with an ancestor
    if (!NOISE_HEADING.test(heading.text().trim())) return;

    // Climb to the largest ancestor that only holds this heading (= its section card).
    let container = heading;
    while (true) {
      const parent = container.parent();
      if (!parent.length || parent.is("body,main,html,[role=main]")) break;
      if (parent.find(HEADING_SELECTOR).length > 1) break;
      container = parent;
    }

    if (container.get(0) === heading.get(0)) {
      // Flat layout: remove the heading and following siblings up to the next same-or-higher heading.
      const level = headingLevel(heading);
      let next = heading.next();
      while (next.length && !(next.is(HEADING_SELECTOR) && headingLevel(next) <= level)) {
        const after = next.next();
        next.remove();
        next = after;
      }
    }
    container.remove();
  });
}

/** Extract readable text from the main content area of the page. */
export function extractFromHtml($: cheerio.CheerioAPI): ExtractedJob {
  const title =
    $("meta[property='og:title']").attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    $("title").first().text().trim() ||
    undefined;

  $(NOISE_SELECTOR).remove();
  removeNoiseSections($);

  let best = "";
  for (const selector of MAIN_CANDIDATES) {
    const el = $(selector).first();
    if (!el.length) continue;
    const text = htmlToText(el.html() ?? "");
    if (text.length >= MIN_JOB_TEXT_LENGTH) {
      best = text;
      break;
    }
    if (text.length > best.length) best = text;
  }

  return { title, text: best, source: "html" };
}

const simplify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[-•*\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Find where the JSON-LD description starts inside the page text,
 * so leading page chrome (breadcrumbs, "published on", share links) is dropped.
 * Returns -1 when the description can't be located in the page.
 */
export function findDescriptionStart(pageText: string, description: string): number {
  const pageLines = pageText.split("\n");
  const pageSimple = pageLines.map(simplify);
  const candidates = description
    .split("\n")
    .map(simplify)
    .filter((l) => l.length >= 8)
    .slice(0, 4);

  for (const candidate of candidates) {
    const probe = candidate.slice(0, 60);
    const idx = pageSimple.findIndex((line) => line.includes(probe));
    if (idx !== -1) {
      return pageLines.slice(0, idx).reduce((acc, line) => acc + line.length + 1, 0);
    }
  }
  return -1;
}

/**
 * Extract a job description from a raw HTML page.
 *
 * Many job boards only put part of the offer in their JSON-LD `description`
 * (e.g. the mission, but not "Profil recherché" or the tech stack). So we combine:
 * - JSON-LD for reliable structured metadata (title, company, location, contract, salary);
 * - the page content for the full body, starting where the JSON-LD description begins.
 */
export function extractJobFromHtml(html: string): ExtractedJob {
  const $ = cheerio.load(html);
  const jsonLd = findJsonLdJob($);
  const page = extractFromHtml($);

  let result: ExtractedJob;
  if (!jsonLd) {
    result = page;
  } else {
    const start = jsonLd.description ? findDescriptionStart(page.text, jsonLd.description) : -1;
    const pageBody =
      start >= 0 ? stripTrailingRepeats(page.text.slice(start).trim(), [jsonLd.title, jsonLd.company]) : "";

    if (pageBody.length > jsonLd.body.length) {
      // Page holds the description plus extra sections (profile, stack...).
      const extra = extraSectionsMissingFrom(pageBody, jsonLd.body);
      result = {
        title: jsonLd.title ?? page.title,
        text: normalizeText(`${jsonLd.header}\n\n${pageBody}${extra ? `\n\n${extra}` : ""}`),
        source: "json-ld+html",
      };
    } else {
      result = {
        title: jsonLd.title ?? page.title,
        text: normalizeText(`${jsonLd.header}\n\n${jsonLd.body}`),
        source: "json-ld",
      };
    }

    if (result.text.length < MIN_JOB_TEXT_LENGTH && page.text.length > result.text.length) {
      result = page;
    }
  }

  if (result.text.length > MAX_JOB_TEXT_LENGTH) {
    result.text = result.text.slice(0, MAX_JOB_TEXT_LENGTH).trimEnd() + "\n…";
  }
  return result;
}

/** Drop trailing lines that only repeat the title/company (sticky "apply" bars, footers). */
function stripTrailingRepeats(text: string, values: Array<string | undefined>): string {
  const known = new Set(values.filter(Boolean).map((v) => simplify(v!)));
  const lines = text.split("\n");
  while (lines.length) {
    const last = simplify(lines[lines.length - 1]);
    if (last.length <= 2 || known.has(last)) lines.pop();
    else break;
  }
  return lines.join("\n").trim();
}

/** Keep JSON-LD-only sections (skills, qualifications...) whose content isn't already in the page body. */
function extraSectionsMissingFrom(pageBody: string, jsonLdBody: string): string {
  const pageSimple = simplify(pageBody);
  return jsonLdBody
    .split(/\n(?=(?:Responsabilités|Compétences|Qualifications|Formation) :)/)
    .filter((section) => !section.trimStart().startsWith("Description :"))
    .filter((section) => {
      const lines = section.split("\n").slice(1).map(simplify).filter((l) => l.length >= 4);
      return lines.some((l) => !pageSimple.includes(l));
    })
    .join("\n\n")
    .trim();
}
