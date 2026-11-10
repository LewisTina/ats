import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_RESPONSE_BYTES = 3 * 1024 * 1024; // 3 Mo
export const MAX_REDIRECTS = 5;
const ALLOWED_PORTS = new Set(["", "80", "443"]);

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export class FetchJobError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
    this.name = "FetchJobError";
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function inRange(ip: string, cidr: string): boolean {
  const [base, bits] = cidr.split("/");
  const mask = Number(bits) === 0 ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const BLOCKED_V4_RANGES = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
];

/** Returns true if the IP is loopback, private, link-local, reserved or multicast. */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    return BLOCKED_V4_RANGES.some((range) => inRange(ip, range));
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    // IPv4-mapped (::ffff:a.b.c.d)
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    if (lower === "::" || lower === "::1") return true;
    const firstHextet = parseInt(lower.split(":")[0] || "0", 16);
    if ((firstHextet & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((firstHextet & 0xff00) === 0xff00) return true; // ff00::/8 multicast
    if (lower.startsWith("64:ff9b:") || lower.startsWith("2001:db8:")) return true;
    return false;
  }
  return true; // not an IP: treat as unsafe
}

/** Validate URL shape (protocol, port, credentials) — no network access. */
export function validateJobUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new FetchJobError("URL invalide.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new FetchJobError("Seules les URL http(s) sont acceptées.");
  }
  if (url.username || url.password) {
    throw new FetchJobError("Les URL contenant des identifiants ne sont pas acceptées.");
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new FetchJobError("Port non autorisé.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new FetchJobError("Adresse locale non autorisée.");
  }
  return url;
}

/** Resolve the hostname and reject it if any resolved address is private. */
async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new FetchJobError("Adresse réseau privée non autorisée.");
    return;
  }
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new FetchJobError("Nom de domaine introuvable.");
  }
  if (!addresses.length || addresses.some((a) => isPrivateIp(a.address))) {
    throw new FetchJobError("Adresse réseau privée non autorisée.");
  }
}

async function readLimitedBody(res: Response): Promise<Uint8Array> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_RESPONSE_BYTES) {
    throw new FetchJobError("La page est trop volumineuse.", 413);
  }
  if (!res.body) return new Uint8Array();

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new FetchJobError("La page est trop volumineuse.", 413);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function decodeBody(bytes: Uint8Array, contentType: string): string {
  const charset = contentType.match(/charset=["']?([\w-]+)/i)?.[1];
  try {
    return new TextDecoder(charset || "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/**
 * Fetch an HTML page with SSRF protections:
 * http(s) only, standard ports, public IPs only (checked on every redirect),
 * limited redirects, timeout and response size cap.
 */
export async function safeFetchHtml(rawUrl: string): Promise<{ html: string; finalUrl: string }> {
  let url = validateJobUrl(rawUrl);
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);

    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        },
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new FetchJobError("Le site a mis trop de temps à répondre.", 504);
      }
      throw new FetchJobError("Impossible de joindre le site.", 502);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new FetchJobError("Redirection invalide.", 502);
      url = validateJobUrl(new URL(location, url).toString());
      continue;
    }

    if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 999) {
      throw new FetchJobError(
        "Le site bloque la récupération automatique (connexion requise ou protection anti-robot). Copiez-collez le texte de l'offre.",
        422
      );
    }
    if (res.status === 404 || res.status === 410) {
      throw new FetchJobError("Offre introuvable (page supprimée ou expirée).", 404);
    }
    if (!res.ok) {
      throw new FetchJobError(`Le site a répondu avec une erreur (${res.status}).`, 502);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      throw new FetchJobError("L'URL ne pointe pas vers une page HTML.", 415);
    }

    const bytes = await readLimitedBody(res);
    return { html: decodeBody(bytes, contentType), finalUrl: url.toString() };
  }

  throw new FetchJobError("Trop de redirections.", 502);
}
