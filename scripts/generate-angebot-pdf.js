/**
 * Generates doubatech-angebot-praxis.pdf — Social-Media-Katalog für Praxen.
 * Run: node scripts/generate-angebot-pdf.js
 */
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "doubatech-angebot-praxis.pdf");
const LOGO = path.join(ROOT, "doubatech-logo.png");

const BLUE = rgb(0x46 / 255, 0x8c / 255, 0xff / 255);
const INK = rgb(0x1a / 255, 0x1a / 255, 0x1e / 255);
const MUTED = rgb(0x5a / 255, 0x5d / 255, 0x66 / 255);
const LIGHT = rgb(0xf4 / 255, 0xf6 / 255, 0xfa / 255);
const LINE = rgb(0xe2 / 255, 0xe6 / 255, 0xee / 255);
const WHITE = rgb(1, 1, 1);

const A4 = { w: 595.28, h: 841.89 };
const M = 48;
const TOTAL = 3;

function drawFooter(page, font, pageNum) {
  page.drawLine({
    start: { x: M, y: 42 },
    end: { x: A4.w - M, y: 42 },
    thickness: 0.5,
    color: LINE,
  });
  page.drawText("DOUBATECH · Mohammad Douba", {
    x: M,
    y: 28,
    size: 8,
    font,
    color: MUTED,
  });
  page.drawText(`${pageNum} / ${TOTAL}`, {
    x: A4.w - M - 22,
    y: 28,
    size: 8,
    font,
    color: MUTED,
  });
}

function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrapped(page, text, opts) {
  const {
    x,
    y,
    font,
    size,
    color,
    maxWidth,
    lineHeight = size * 1.45,
  } = opts;
  const lines = wrapText(text, font, size, maxWidth);
  let cy = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cy, size, font, color });
    cy -= lineHeight;
  }
  return cy;
}

function drawBullet(page, text, x, y, font, size, color, maxWidth) {
  page.drawText("•", { x, y, size, font, color });
  return drawWrapped(page, text, {
    x: x + 12,
    y,
    font,
    size,
    color,
    maxWidth: maxWidth - 12,
    lineHeight: size * 1.4,
  });
}

function topBar(page) {
  page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: WHITE });
  page.drawRectangle({ x: 0, y: A4.h - 6, width: A4.w, height: 6, color: BLUE });
}

async function main() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(fs.readFileSync(LOGO));
  const contentW = A4.w - 2 * M;

  // ═══════════════ PAGE 1 — Cover ═══════════════
  {
    const page = pdf.addPage([A4.w, A4.h]);
    topBar(page);

    const logoW = 168;
    const logoH = (logo.height / logo.width) * logoW;
    page.drawImage(logo, {
      x: (A4.w - logoW) / 2,
      y: A4.h - 110 - logoH,
      width: logoW,
      height: logoH,
    });

    let y = A4.h - 128 - logoH;
    const title = "Katalog Social Media";
    const tSize = 26;
    page.drawText(title, {
      x: (A4.w - fontBold.widthOfTextAtSize(title, tSize)) / 2,
      y,
      size: tSize,
      font: fontBold,
      color: INK,
    });
    y -= 26;
    const sub = "Für Praxen  ·  monatlich  ·  Freigabe vor Veröffentlichung";
    page.drawText(sub, {
      x: (A4.w - font.widthOfTextAtSize(sub, 11)) / 2,
      y,
      size: 11,
      font,
      color: MUTED,
    });

    y -= 36;
    const boxH = 78;
    page.drawRectangle({
      x: M,
      y: y - boxH + 14,
      width: contentW,
      height: boxH,
      color: LIGHT,
    });
    page.drawRectangle({
      x: M,
      y: y - boxH + 14,
      width: 4,
      height: boxH,
      color: BLUE,
    });
    y = drawWrapped(
      page,
      "Dieses Dokument ist eine Orientierung — kein Vertrag. Der endgültige Umfang wird nach einem kurzen Check gemeinsam festgelegt. Nichts geht live ohne Freigabe Ihrer Praxis.",
      {
        x: M + 16,
        y: y - 4,
        font,
        size: 10,
        color: INK,
        maxWidth: contentW - 28,
        lineHeight: 15,
      }
    );

    y -= 32;
    page.drawText("Monatssätze", { x: M, y, size: 13, font: fontBold, color: INK });
    y -= 18;

    const rates = [
      ["599 €", "Normal — eine Plattform", "8 Beiträge und 2 Videos im Monat. Jede weitere Plattform +199 €."],
      ["999 €", "Premium — drei Plattformen", "8 Beiträge, 4 Videos und KI-Avatar inklusive."],
      ["99 €", "Avatar-Einrichtung", "Einmalig im Normal-Paket. Im Premium ist der Avatar enthalten."],
    ];
    for (const [amount, name, detail] of rates) {
      page.drawText(amount, { x: M, y, size: 12, font: fontBold, color: BLUE });
      page.drawText(name, { x: M + 72, y, size: 11, font: fontBold, color: INK });
      y -= 15;
      y = drawWrapped(page, detail, {
        x: M + 72,
        y,
        font,
        size: 10,
        color: MUTED,
        maxWidth: contentW - 72,
        lineHeight: 14,
      });
      y -= 12;
    }

    y -= 6;
    page.drawText("Eigene Videos der Praxis", {
      x: M,
      y,
      size: 13,
      font: fontBold,
      color: INK,
    });
    y -= 16;
    y = drawWrapped(
      page,
      "Auf Wunsch senden Sie eigene Videos. Schnitt, Bearbeitung und Veröffentlichung übernehmen wir. Ein solches Video ersetzt zwei der acht Beiträge in diesem Monat. Die zwei Videos aus der Basis bleiben.",
      {
        x: M,
        y,
        font,
        size: 10,
        color: MUTED,
        maxWidth: contentW,
        lineHeight: 15,
      }
    );

    y -= 28;
    page.drawLine({
      start: { x: M, y },
      end: { x: A4.w - M, y },
      thickness: 0.5,
      color: LINE,
    });
    y -= 20;
    page.drawText("Mohammad Douba", {
      x: M,
      y,
      size: 10,
      font: fontBold,
      color: INK,
    });
    y -= 14;
    page.drawText("Westfalenstraße 10 · 40472 Düsseldorf", {
      x: M,
      y,
      size: 9,
      font,
      color: MUTED,
    });
    y -= 13;
    page.drawText("info@doubatech.de · +49 163 0040140", {
      x: M,
      y,
      size: 9,
      font,
      color: MUTED,
    });

    drawFooter(page, font, 1);
  }

  // ═══════════════ PAGE 2 — Leistungen ═══════════════
  {
    const page = pdf.addPage([A4.w, A4.h]);
    topBar(page);
    let y = A4.h - 48;

    page.drawText("Was im Monat enthalten ist", {
      x: M,
      y,
      size: 18,
      font: fontBold,
      color: INK,
    });
    y -= 22;

    page.drawText("Normal — 599 € / Monat", {
      x: M,
      y,
      size: 12,
      font: fontBold,
      color: INK,
    });
    y -= 16;
    const included = [
      "Eine Plattform, zum Beispiel Instagram oder Facebook",
      "8 Beiträge mit Texten in ruhigem, praxisgerechtem Ton",
      "2 Videos, einschließlich Schnitt",
      "Veröffentlichung erst nach Freigabe der Praxis",
      "Sie posten nicht selbst — DOUBATECH setzt um",
    ];
    for (const item of included) {
      y = drawBullet(page, item, M, y, font, 10, MUTED, contentW);
      y -= 4;
    }

    y -= 14;
    page.drawText("Weitere Plattform — +199 € / Monat", {
      x: M,
      y,
      size: 12,
      font: fontBold,
      color: INK,
    });
    y -= 16;
    y = drawWrapped(
      page,
      "Dieselben acht Beiträge und zwei Videos erscheinen zusätzlich auf einer weiteren Plattform. Der Inhalt wird einmal produziert und auf jedem gebuchten Kanal veröffentlicht.",
      {
        x: M,
        y,
        font,
        size: 10,
        color: MUTED,
        maxWidth: contentW,
        lineHeight: 15,
      }
    );

    y -= 22;
    page.drawText("Premium — 999 € / Monat", {
      x: M,
      y,
      size: 12,
      font: fontBold,
      color: INK,
    });
    y -= 16;
    y = drawWrapped(
      page,
      "Drei Plattformen, 8 Beiträge, 4 Videos und der KI-Avatar sind enthalten. Gegenüber der Einzelbuchung (997 € plus einmalig 99 € Einrichtung = 1.096 €) sind das 97 € weniger und zwei Videos mehr. Avatar nur mit Ihren Fotos und nach Freigabe.",
      {
        x: M,
        y,
        font,
        size: 10,
        color: MUTED,
        maxWidth: contentW,
        lineHeight: 15,
      }
    );

    y -= 22;
    page.drawText("Eigene Videos", {
      x: M,
      y,
      size: 12,
      font: fontBold,
      color: INK,
    });
    y -= 16;
    y = drawWrapped(
      page,
      "Sie können uns Videos senden. Schnitt, Bearbeitung und Veröffentlichung bis zum Livegang übernehmen wir. Jedes solche Video ersetzt 2 Beiträge in diesem Monat. Beispiel: ein geliefertes Video bedeutet 6 Beiträge, die 2 Videos aus der Basis und Ihr geschnittenes Video.",
      {
        x: M,
        y,
        font,
        size: 10,
        color: MUTED,
        maxWidth: contentW,
        lineHeight: 15,
      }
    );

    y -= 22;
    page.drawText("Nicht enthalten", {
      x: M,
      y,
      size: 12,
      font: fontBold,
      color: INK,
    });
    y -= 16;
    for (const item of [
      "Werbebudget (Ads) und Mediaeinkauf",
      "Telefon-Empfang und Google-Profil — werden gesondert vereinbart",
      "Druck und Offline-Materialien",
      "Heilversprechen oder Aussagen, die gegen das Heilmittelwerbegesetz verstoßen",
    ]) {
      y = drawBullet(page, item, M, y, font, 10, MUTED, contentW);
      y -= 4;
    }

    y -= 16;
    page.drawRectangle({
      x: M,
      y: y - 36,
      width: contentW,
      height: 48,
      color: LIGHT,
    });
    drawWrapped(
      page,
      "Hinweis: Keine erfundenen Patientenzahlen, keine ROI-Versprechen, keine Heilaussagen. Veröffentlichungen nur mit Ihrer Zustimmung.",
      {
        x: M + 12,
        y: y - 10,
        font,
        size: 9,
        color: INK,
        maxWidth: contentW - 24,
        lineHeight: 13,
      }
    );

    drawFooter(page, font, 2);
  }

  // ═══════════════ PAGE 3 — Preise & Kontakt ═══════════════
  {
    const page = pdf.addPage([A4.w, A4.h]);
    topBar(page);
    let y = A4.h - 48;

    page.drawText("Preise — Beispiele", {
      x: M,
      y,
      size: 18,
      font: fontBold,
      color: INK,
    });
    y -= 16;
    y = drawWrapped(
      page,
      "Alle Beträge monatlich. Umsatzsteuer wird gemäß § 19 UStG nicht ausgewiesen (Kleinunternehmer).",
      {
        x: M,
        y,
        font,
        size: 10,
        color: MUTED,
        maxWidth: contentW,
        lineHeight: 15,
      }
    );

    y -= 28;

    const col1 = M;
    const col2 = M + 360;
    page.drawText("Leistung", {
      x: col1,
      y,
      size: 9,
      font: fontBold,
      color: MUTED,
    });
    page.drawText("Betrag", {
      x: col2,
      y,
      size: 9,
      font: fontBold,
      color: MUTED,
    });
    y -= 8;
    page.drawLine({
      start: { x: M, y },
      end: { x: A4.w - M, y },
      thickness: 0.75,
      color: LINE,
    });
    y -= 18;

    function priceRow(label, amount, bold = false) {
      const f = bold ? fontBold : font;
      const c = bold ? INK : MUTED;
      page.drawText(label, { x: col1, y, size: 10, font: f, color: c });
      page.drawText(amount, { x: col2, y, size: 10, font: f, color: c });
      y -= 18;
    }

    page.drawText("Beispiel A — eine Plattform", {
      x: M,
      y,
      size: 11,
      font: fontBold,
      color: INK,
    });
    y -= 20;
    priceRow("Normal, eine Plattform", "599 €");
    y -= 2;
    page.drawLine({
      start: { x: M, y },
      end: { x: A4.w - M, y },
      thickness: 0.5,
      color: LINE,
    });
    y -= 16;
    priceRow("Monatlich gesamt (Beispiel A)", "599 €", true);

    y -= 16;
    page.drawText("Beispiel B — zwei Plattformen", {
      x: M,
      y,
      size: 11,
      font: fontBold,
      color: INK,
    });
    y -= 20;
    priceRow("Erste Plattform", "599 €");
    priceRow("Zweite Plattform", "199 €");
    y -= 2;
    page.drawLine({
      start: { x: M, y },
      end: { x: A4.w - M, y },
      thickness: 0.5,
      color: LINE,
    });
    y -= 16;
    priceRow("Monatlich gesamt (Beispiel B)", "798 €", true);

    y -= 16;
    page.drawText("Beispiel C — drei Plattformen oder Premium", {
      x: M,
      y,
      size: 11,
      font: fontBold,
      color: INK,
    });
    y -= 20;
    priceRow("Drei Plattformen einzeln", "997 €");
    priceRow("Avatar-Einrichtung einmalig", "99 €");
    priceRow("Premium statt dessen", "999 €");
    y -= 2;
    page.drawLine({
      start: { x: M, y },
      end: { x: A4.w - M, y },
      thickness: 0.5,
      color: LINE,
    });
    y -= 16;
    priceRow("Ersparnis mit Premium", "97 €", true);

    y -= 18;
    page.drawRectangle({
      x: M,
      y: y - 40,
      width: contentW,
      height: 52,
      color: LIGHT,
    });
    page.drawRectangle({
      x: M,
      y: y - 40,
      width: 4,
      height: 52,
      color: BLUE,
    });
    drawWrapped(
      page,
      "Normal 599 € · jede weitere Plattform +199 € · Avatar-Einrichtung einmalig 99 €. Premium 999 € mit 3 Plattformen, 4 Videos und Avatar. Drei Plattformen einzeln plus Einrichtung: 1.096 €, Premium spart 97 €.",
      {
        x: M + 14,
        y: y - 12,
        font,
        size: 9,
        color: INK,
        maxWidth: contentW - 26,
        lineHeight: 13,
      }
    );

    y -= 80;
    page.drawText("Nächster Schritt", {
      x: M,
      y,
      size: 13,
      font: fontBold,
      color: INK,
    });
    y -= 16;
    y = drawWrapped(
      page,
      "Kurzer Check der bestehenden Sichtbarkeit und Erreichbarkeit. Danach stimmen wir den konkreten Umfang ab — verbindlich erst nach Ihrer Freigabe.",
      {
        x: M,
        y,
        font,
        size: 10,
        color: MUTED,
        maxWidth: contentW,
        lineHeight: 15,
      }
    );

    y -= 28;
    page.drawText("Kontakt", {
      x: M,
      y,
      size: 13,
      font: fontBold,
      color: INK,
    });
    y -= 18;
    page.drawText("DOUBATECH · Mohammad Douba", {
      x: M,
      y,
      size: 10,
      font: fontBold,
      color: INK,
    });
    y -= 14;
    page.drawText("Westfalenstraße 10, 40472 Düsseldorf", {
      x: M,
      y,
      size: 10,
      font,
      color: MUTED,
    });
    y -= 14;
    page.drawText("info@doubatech.de", {
      x: M,
      y,
      size: 10,
      font,
      color: BLUE,
    });
    y -= 14;
    page.drawText("+49 163 0040140", {
      x: M,
      y,
      size: 10,
      font,
      color: MUTED,
    });

    drawFooter(page, font, 3);
  }

  const bytes = await pdf.save();
  fs.writeFileSync(OUT, bytes);
  console.log("Wrote", OUT, `(${bytes.length} bytes)`);
  console.log("Header:", Buffer.from(bytes.slice(0, 5)).toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
