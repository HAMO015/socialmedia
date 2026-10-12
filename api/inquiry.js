function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 20_000) {
        reject(new Error("too-large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("bad-json"));
      }
    });
    req.on("error", reject);
  });
}

function clean(value, max) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanBlock(value, max) {
  return String(value || "")
    .replace(/\r/g, "")
    .trim()
    .slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120;
}

const ALLOWED_SERVICES = ["Telefon-Empfang", "Google-Profil", "Social Media"];

function normalizeServices(value) {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const label = clean(item, 40);
    if (ALLOWED_SERVICES.includes(label) && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { ok: false, error: "Nur POST ist erlaubt." });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Die Anfrage ist unvollständig." });
    return;
  }

  // Honeypot for direct API spam only. The browser form always posts douba_hp:"".
  // Do not treat password-manager autofill of a form field as a completed send —
  // the client clears/ignores that path before POSTing.
  if (clean(body.company, 80) || clean(body.douba_hp, 80)) {
    sendJson(res, 200, { ok: true });
    return;
  }

  const name = clean(body.name, 80);
  const email = clean(body.email, 120);
  const phone = clean(body.phone, 40);
  const praxis = clean(body.praxis, 120);
  const city = clean(body.city, 80);
  const services = normalizeServices(body.services);
  const note = cleanBlock(body.note, 1000);
  const consent = body.consent === true;

  if (name.length < 2) {
    sendJson(res, 400, { ok: false, error: "Bitte den Namen eintragen." });
    return;
  }
  if (!validEmail(email)) {
    sendJson(res, 400, { ok: false, error: "Bitte eine gültige E-Mail eintragen." });
    return;
  }
  if (phone.replace(/\D/g, "").length < 6) {
    sendJson(res, 400, { ok: false, error: "Bitte eine Telefonnummer eintragen." });
    return;
  }
  if (praxis.length < 2) {
    sendJson(res, 400, { ok: false, error: "Bitte den Praxisnamen eintragen." });
    return;
  }
  if (city.length < 2) {
    sendJson(res, 400, { ok: false, error: "Bitte den Ort eintragen." });
    return;
  }
  if (services.length < 1) {
    sendJson(res, 400, { ok: false, error: "Bitte mindestens eine Leistung wählen." });
    return;
  }
  if (!consent) {
    sendJson(res, 400, { ok: false, error: "Bitte die Datenschutzhinweise bestätigen." });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.INQUIRY_TO;
  const from = process.env.INQUIRY_FROM || "DOUBATECH <onboarding@resend.dev>";

  if (!apiKey || !to) {
    sendJson(res, 503, {
      ok: false,
      error: "Der Versand ist noch nicht verbunden. Bitte später noch einmal versuchen.",
    });
    return;
  }

  const text = [
    "Neue Anfrage über douba",
    "",
    `Name: ${name}`,
    `E-Mail: ${email}`,
    `Telefon: ${phone}`,
    `Praxis: ${praxis}`,
    `Ort: ${city}`,
    "",
    "Leistungen:",
    ...services.map((s) => `- ${s}`),
    ...(note ? ["", "Notiz:", note] : []),
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Anfrage ${praxis} — ${name}`,
        text,
      }),
    });

    if (!response.ok) {
      sendJson(res, 502, {
        ok: false,
        error: "Die Anfrage konnte gerade nicht gesendet werden. Bitte noch einmal versuchen.",
      });
      return;
    }
  } catch {
    sendJson(res, 502, {
      ok: false,
      error: "Die Anfrage konnte gerade nicht gesendet werden. Bitte noch einmal versuchen.",
    });
    return;
  }

  sendJson(res, 200, { ok: true });
};
