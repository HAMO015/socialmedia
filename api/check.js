const dns = require("dns").promises;
const { isIP } = require("net");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;
const MAX_BYTES = 800_000;

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function blockedHostname(hostname) {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "0.0.0.0" || host === "::" || host === "[::]") return true;
  return false;
}

function isPrivateIp(ip) {
  const v = String(ip || "").replace(/^\[|\]$/g, "");
  if (!isIP(v)) return true;

  if (isIP(v) === 4) {
    const parts = v.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  const lower = v.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice(7);
    if (isIP(mapped) === 4) return isPrivateIp(mapped);
  }
  return false;
}

async function assertPublicUrl(url) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    const err = new Error("Nur http- und https-Adressen sind erlaubt.");
    err.code = "BAD_URL";
    throw err;
  }
  if (url.username || url.password) {
    const err = new Error("Adressen mit Benutzerdaten sind nicht erlaubt.");
    err.code = "BAD_URL";
    throw err;
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (blockedHostname(host)) {
    const err = new Error("Lokale oder interne Adressen sind nicht erlaubt.");
    err.code = "BAD_URL";
    throw err;
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) {
      const err = new Error("Private oder lokale IP-Adressen sind nicht erlaubt.");
      err.code = "BAD_URL";
      throw err;
    }
    return;
  }
  let records;
  try {
    records = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    const err = new Error("Die Domain konnte nicht aufgelöst werden.");
    err.code = "DNS";
    throw err;
  }
  if (!records.length || records.some((r) => isPrivateIp(r.address))) {
    const err = new Error("Die Domain zeigt auf eine nicht öffentliche Adresse.");
    err.code = "BAD_URL";
    throw err;
  }
}

const SEARCH_TIMEOUT_MS = 6000;
const DIRECTORY_HOST_SUFFIXES = [
  "jameda.de",
  "doctolib.de",
  "doctolib.com",
  "sanego.de",
  "arzt-auskunft.de",
  "gelbeseiten.de",
  "dasoertliche.de",
  "facebook.com",
  "fb.com",
  "instagram.com",
  "wikipedia.org",
  "google.com",
  "google.de",
  "goo.gl",
  "bing.com",
  "duckduckgo.com",
  "youtube.com",
  "youtu.be",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "apple.com",
  "maps.app.goo.gl",
];

function hostLooksDirectory(hostname) {
  const h = String(hostname || "")
    .toLowerCase()
    .replace(/^www\./, "");
  return DIRECTORY_HOST_SUFFIXES.some((d) => h === d || h.endsWith(`.${d}`));
}

function looksLikeUrlInput(raw) {
  const v = String(raw || "").trim();
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (/\s/.test(v)) return false;
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#].*)?$/i.test(v);
}

function normalizeInput(raw) {
  let value = String(raw || "").trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  return url;
}

function decodeDuckRedirect(href) {
  try {
    let h = String(href || "")
      .trim()
      .replace(/&amp;/g, "&");
    if (!h) return null;
    if (h.startsWith("//")) h = `https:${h}`;
    const u = new URL(h, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) {
      const target = decodeURIComponent(uddg);
      return target.startsWith("http") ? target : null;
    }
    if (/duckduckgo\.com$/i.test(u.hostname) || u.hostname.endsWith(".duckduckgo.com")) {
      return null;
    }
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    /* ignore */
  }
  return null;
}

function extractSearchLinks(html) {
  const links = [];
  const patterns = [
    /class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"/gi,
    /href="([^"]+)"[^>]*class="[^"]*result__a[^"]*"/gi,
    /class="[^"]*result-link[^"]*"[^>]*href="([^"]+)"/gi,
    /href="([^"]+)"[^>]*class="[^"]*result-link[^"]*"/gi,
    /href="((?:https?:)?\/\/[^"]*uddg=[^"]+)"/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html))) {
      const decoded = decodeDuckRedirect(m[1]);
      if (decoded) links.push(decoded);
    }
  }
  return [...new Set(links)];
}

async function searchViaInstantAnswer(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const hrefs = [];
    if (data.AbstractURL) hrefs.push(data.AbstractURL);
    if (Array.isArray(data.Results)) {
      for (const row of data.Results) {
        if (row && row.FirstURL) hrefs.push(row.FirstURL);
      }
    }
    const walkTopics = (topics) => {
      if (!Array.isArray(topics)) return;
      for (const t of topics) {
        if (t && t.FirstURL) hrefs.push(t.FirstURL);
        if (t && t.Topics) walkTopics(t.Topics);
      }
    };
    walkTopics(data.RelatedTopics);
    return hrefs;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function pickPublicSite(hrefs) {
  const candidates = [];
  for (const href of hrefs) {
    let parsed;
    try {
      parsed = new URL(href);
    } catch {
      continue;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
    if (blockedHostname(parsed.hostname) || hostLooksDirectory(parsed.hostname)) continue;
    candidates.push(parsed);
  }
  for (const candidate of candidates.slice(0, 8)) {
    try {
      await assertPublicUrl(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function searchViaWikidata(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const searchUrl =
      "https://www.wikidata.org/w/api.php?" +
      new URLSearchParams({
        action: "wbsearchentities",
        search: query,
        language: "de",
        uselang: "de",
        type: "item",
        limit: "5",
        format: "json",
        origin: "*",
      }).toString();
    const searchRes = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!searchRes.ok) return [];
    const searchJson = await searchRes.json();
    const ids = (searchJson.search || []).map((row) => row.id).filter(Boolean);
    if (!ids.length) return [];

    const entityUrl =
      "https://www.wikidata.org/w/api.php?" +
      new URLSearchParams({
        action: "wbgetentities",
        ids: ids.join("|"),
        props: "claims",
        format: "json",
        origin: "*",
      }).toString();
    const entityRes = await fetch(entityUrl, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!entityRes.ok) return [];
    const entityJson = await entityRes.json();
    const hrefs = [];
    for (const id of ids) {
      const claims = entityJson.entities?.[id]?.claims?.P856;
      if (!Array.isArray(claims)) continue;
      for (const claim of claims) {
        const value = claim?.mainsnak?.datavalue?.value;
        if (typeof value === "string" && /^https?:\/\//i.test(value)) hrefs.push(value);
      }
    }
    return hrefs;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchPracticeSite(query) {
  const queries = [query, `${query} Website`];

  for (const q of queries) {
    const instant = await searchViaInstantAnswer(q);
    const pickedInstant = await pickPublicSite(instant);
    if (pickedInstant) return pickedInstant;
  }

  for (const q of queries) {
    const wiki = await searchViaWikidata(q);
    const pickedWiki = await pickPublicSite(wiki);
    if (pickedWiki) return pickedWiki;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${query} Website`)}`,
      {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": UA,
          Accept: "text/html",
          "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        },
      }
    );
    if (res.ok) {
      const html = await res.text();
      const picked = await pickPublicSite(extractSearchLinks(html));
      if (picked) return picked;
    }
  } catch (e) {
    if (e && e.name === "AbortError") {
      const err = new Error("Die Suche hat zu lange gedauert.");
      err.code = "SEARCH";
      throw err;
    }
  } finally {
    clearTimeout(timer);
  }

  return null;
}

function notFoundResult(query) {
  return {
    ok: true,
    found: false,
    reachable: false,
    query: query || "",
    url: "",
    resolvedHost: "",
    score: null,
    present: [],
    missing: [],
    checks: [],
    message:
      "Keine eigene Praxis-Website automatisch gefunden. Bitte die Website-Adresse eintragen — das ist zuverlässiger als die Namenssuche.",
  };
}

function yesNo(ok) {
  return ok ? "ja" : "nein";
}

function linkStatus(ok) {
  return ok ? "Link da" : "kein Link";
}

function foundNot(ok) {
  return ok ? "gefunden" : "nicht gefunden";
}

function stripTags(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function buildScorePayload(items, extras = {}) {
  const total = items.length;
  const yesCount = items.filter((i) => i.ok).length;
  const score = total ? Math.round((yesCount / total) * 100) : 0;
  return {
    ok: true,
    found: true,
    reachable: extras.reachable !== false,
    url: extras.url || "",
    resolvedHost: extras.resolvedHost || "",
    resolvedFrom: extras.resolvedFrom || "url",
    query: extras.query || "",
    score,
    scoreLabel: "Digital-Stand",
    scoreDetail: `So viel der üblichen Punkte ist da: ${yesCount} von ${total}`,
    note: "Gezählt werden die üblichen öffentlichen Punkte auf der Website, kein Vergleich mit echten Nachbarpraxen.",
    present: items.filter((i) => i.ok).map((i) => ({ label: i.label, value: i.value })),
    missing: items.filter((i) => !i.ok).map((i) => ({ label: i.label, value: i.value })),
    checks: items.map((i) => ({ label: i.label, value: i.value, ok: i.ok })),
    ...(extras.message ? { message: extras.message } : {}),
    ...(extras.resolutionNote ? { resolutionNote: extras.resolutionNote } : {}),
  };
}

function unreachableResult(message, attemptedUrl) {
  const items = [
    { label: "Website erreichbar", value: "nein", ok: false },
    { label: "HTTPS", value: "nein", ok: false },
    { label: "Seitentitel", value: "nein", ok: false },
    { label: "Handy-Ansicht (viewport)", value: "nein", ok: false },
    { label: "Telefon oder E-Mail", value: "nicht gefunden", ok: false },
    { label: "Impressum-Link", value: "kein Link", ok: false },
    { label: "Datenschutz-Link", value: "kein Link", ok: false },
    { label: "Instagram-Link", value: "kein Link", ok: false },
    { label: "Facebook-Link", value: "kein Link", ok: false },
    { label: "LinkedIn / YouTube / TikTok", value: "kein Link", ok: false },
    { label: "WhatsApp-Link", value: "kein Link", ok: false },
    { label: "Online-Termin", value: "kein Hinweis", ok: false },
  ];
  return buildScorePayload(items, {
    reachable: false,
    url: attemptedUrl || "",
    message: message || "Die Website war nicht erreichbar.",
  });
}

function analyzeHtml(html, finalUrl) {
  const clean = stripTags(html);
  const lower = `${clean}\n${html}`.toLowerCase();

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
  title = title
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
  const hasTitle = title.length > 0;
  const titleShort = title.length > 80 ? `${title.slice(0, 77)}…` : title;

  const hasHttps = finalUrl.protocol === "https:";
  const hasViewport = /<meta[^>]+name\s*=\s*["']viewport["'][^>]*>/i.test(html);

  const hasPhone = /href\s*=\s*["']tel:/i.test(html);
  const hasEmail = /href\s*=\s*["']mailto:/i.test(html);
  const hasContact = hasPhone || hasEmail;

  const hasImpressum =
    /href\s*=\s*["'][^"']*impressum[^"']*["']/i.test(html) ||
    />(?:\s*)impressum(?:\s*)</i.test(html);

  const hasDatenschutz =
    /href\s*=\s*["'][^"']*(datenschutz|datenschutzerkl|privacy-policy|privacy)[^"']*["']/i.test(html) ||
    />(?:\s*)datenschutz(?:\s*)</i.test(html);

  const hasInstagram = /instagram\.com\//i.test(html) || /href\s*=\s*["'][^"']*instagram[^"']*["']/i.test(html);
  const hasFacebook =
    /(?:facebook\.com|fb\.com|fb\.me)\//i.test(html) || /href\s*=\s*["'][^"']*facebook[^"']*["']/i.test(html);
  const hasVideoSocial =
    /(?:linkedin\.com|youtube\.com|youtu\.be|tiktok\.com)\//i.test(html);
  const hasWhatsapp =
    /(?:wa\.me\/|api\.whatsapp\.com|whatsapp\.com\/)/i.test(html) ||
    /href\s*=\s*["'][^"']*whatsapp[^"']*["']/i.test(html);
  const hasBooking =
    /(?:doctolib|jameda|samedi|terminland|terminsystem|online[-_]?termin|termin[-_]?buchen|terminbuchung|online[-_]?booking)/i.test(
      lower
    );

  const items = [
    { label: "Website erreichbar", value: "ja", ok: true },
    { label: "HTTPS", value: yesNo(hasHttps), ok: hasHttps },
    {
      label: "Seitentitel",
      value: hasTitle ? `ja${titleShort ? ` — ${titleShort}` : ""}` : "nein",
      ok: hasTitle,
    },
    { label: "Handy-Ansicht (viewport)", value: yesNo(hasViewport), ok: hasViewport },
    { label: "Telefon oder E-Mail", value: foundNot(hasContact), ok: hasContact },
    { label: "Impressum-Link", value: linkStatus(hasImpressum), ok: hasImpressum },
    { label: "Datenschutz-Link", value: linkStatus(hasDatenschutz), ok: hasDatenschutz },
    { label: "Instagram-Link", value: linkStatus(hasInstagram), ok: hasInstagram },
    { label: "Facebook-Link", value: linkStatus(hasFacebook), ok: hasFacebook },
    {
      label: "LinkedIn / YouTube / TikTok",
      value: linkStatus(hasVideoSocial),
      ok: hasVideoSocial,
    },
    { label: "WhatsApp-Link", value: linkStatus(hasWhatsapp), ok: hasWhatsapp },
    {
      label: "Online-Termin",
      value: hasBooking ? "Hinweis gefunden" : "kein Hinweis",
      ok: hasBooking,
    },
  ];

  return buildScorePayload(items, { reachable: true, url: finalUrl.href });
}

async function fetchHtml(startUrl) {
  let current = startUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await assertPublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(current.href, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
        },
      });
    } catch (e) {
      if (e && e.name === "AbortError") {
        const err = new Error("Die Website hat zu lange nicht geantwortet.");
        err.code = "TIMEOUT";
        throw err;
      }
      const err = new Error("Die Website war nicht erreichbar.");
      err.code = "FETCH";
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) {
        const err = new Error("Die Weiterleitung der Website war ungültig.");
        err.code = "REDIRECT";
        throw err;
      }
      let next;
      try {
        next = new URL(loc, current);
      } catch {
        const err = new Error("Die Weiterleitung der Website war ungültig.");
        err.code = "REDIRECT";
        throw err;
      }
      current = next;
      continue;
    }

    if (!res.ok) {
      const err = new Error(`Die Website antwortete mit Status ${res.status}.`);
      err.code = "HTTP";
      throw err;
    }

    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (type && !type.includes("text/html") && !type.includes("application/xhtml")) {
      const err = new Error("Unter dieser Adresse lag keine HTML-Seite.");
      err.code = "TYPE";
      throw err;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const slice = buf.subarray(0, MAX_BYTES);
    const html = slice.toString("utf8");
    if (!html || !/<html|<!doctype html|<head|<body/i.test(html)) {
      const err = new Error("Unter dieser Adresse lag keine erkennbare HTML-Seite.");
      err.code = "TYPE";
      throw err;
    }
    return { html, finalUrl: current };
  }
  const err = new Error("Zu viele Weiterleitungen.");
  err.code = "REDIRECT";
  throw err;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Methode nicht erlaubt." });
    return;
  }

  let raw = "";
  if (req.method === "GET") {
    try {
      const q = new URL(req.url, "http://localhost").searchParams;
      raw = q.get("q") || q.get("url") || q.get("website") || "";
    } catch {
      raw = "";
    }
  } else {
    try {
      const text = await readBody(req);
      if (text) {
        const json = JSON.parse(text);
        raw = json.q || json.url || json.website || json.query || "";
      }
    } catch {
      sendJson(res, 400, { ok: false, error: "Ungültige Anfrage." });
      return;
    }
  }

  raw = String(raw || "").trim();
  if (raw.length < 3) {
    sendJson(res, 400, {
      ok: false,
      error: "Bitte Praxisname und Ort oder eine Website-Adresse angeben.",
    });
    return;
  }

  let startUrl = null;
  let resolvedFrom = "url";
  let query = raw;
  let resolutionNote = "";

  if (looksLikeUrlInput(raw)) {
    startUrl = normalizeInput(raw);
    if (!startUrl) {
      sendJson(res, 400, {
        ok: false,
        error: "Bitte eine gültige Website-Adresse angeben (z. B. www.praxis.de).",
      });
      return;
    }
  } else {
    resolvedFrom = "name";
    try {
      startUrl = await searchPracticeSite(raw);
    } catch (e) {
      const miss = notFoundResult(raw);
      if (e && e.message === "Die Suche hat zu lange gedauert.") {
        miss.message =
          "Die automatische Suche hat zu lange gedauert. Bitte die Website-Adresse eintragen.";
      }
      sendJson(res, 200, miss);
      return;
    }
    if (!startUrl) {
      sendJson(res, 200, notFoundResult(raw));
      return;
    }
    resolutionNote = `Automatisch gefundene Website: ${startUrl.hostname.replace(/^www\./, "")} — bitte prüfen, ob das die richtige Praxis-Seite ist. Die direkte Website-Adresse ist zuverlässiger.`;
  }

  try {
    await assertPublicUrl(startUrl);
    const { html, finalUrl } = await fetchHtml(startUrl);
    const host = finalUrl.hostname.replace(/^www\./, "");
    const payload = analyzeHtml(html, finalUrl);
    payload.resolvedFrom = resolvedFrom;
    payload.query = query;
    payload.resolvedHost = host;
    if (resolutionNote) {
      payload.resolutionNote = resolutionNote.replace(startUrl.hostname.replace(/^www\./, ""), host);
      payload.message = payload.resolutionNote;
    }
    sendJson(res, 200, payload);
  } catch (e) {
    if (e && e.code === "BAD_URL") {
      if (resolvedFrom === "name") {
        sendJson(res, 200, notFoundResult(raw));
        return;
      }
      sendJson(res, 400, {
        ok: false,
        error: e.message || "Die Adresse ist nicht erlaubt.",
      });
      return;
    }
    if (resolvedFrom === "name") {
      // Found a candidate URL but could not fetch it — ask for the site, no fake score.
      sendJson(res, 200, {
        ...notFoundResult(raw),
        message: `Eine mögliche Website (${startUrl.hostname.replace(/^www\./, "")}) wurde gefunden, war aber nicht prüfbar. Bitte die korrekte Website-Adresse eintragen.`,
      });
      return;
    }
    const message =
      e && e.message ? e.message : "Die Website war nicht erreichbar.";
    sendJson(res, 200, unreachableResult(message, startUrl.href));
  }
};
