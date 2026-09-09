import { jsPDF } from "jspdf";
import type { WorkoutPlanContent, PlanDay, PlanExercise } from "./plan-types";

type Meta = {
  trainerName?: string | null;
  businessName?: string | null;
  certification?: string | null;
  clientName: string;
  version: number;
  approved: boolean;
  trainerNotes?: string | null;
};

/* ---------------------------------- theme --------------------------------- */

const MARGIN = 46;
const INK: RGB = [24, 26, 30];
const MUTED: RGB = [122, 128, 138];
const HAIRLINE: RGB = [226, 229, 234];
const SOFT: RGB = [246, 247, 249];
const ACCENT: RGB = [86, 168, 40]; // readable lime-green on paper
const ACCENT_SOFT: RGB = [232, 244, 222];
const WARN: RGB = [176, 96, 8];

type RGB = [number, number, number];

/* --------------------------------- helpers -------------------------------- */

function firstNumber(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function setsOf(ex: PlanExercise): number {
  return firstNumber(ex.sets) ?? 0;
}

function dayVolume(day: PlanDay) {
  const main = (day.main ?? []).reduce((a, e) => a + setsOf(e), 0);
  const accessory = (day.accessory ?? []).reduce((a, e) => a + setsOf(e), 0);
  return { main, accessory, total: main + accessory };
}

/* ---------------------------------- export -------------------------------- */

export function exportPlanPdf(plan: WorkoutPlanContent, meta: Meta) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - MARGIN * 2;
  const clientName = meta.clientName;

  let y = MARGIN;
  let pageIndex = 0;

  /* ------------------------------ primitives ------------------------------ */

  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

  function newPage() {
    doc.addPage();
    pageIndex += 1;
    y = MARGIN + 26;
    runningHeader();
  }

  function ensure(space: number) {
    if (y + space > pageH - MARGIN - 26) newPage();
  }

  function runningHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ink(MUTED);
    doc.text((plan.title || `${clientName} training plan`).toUpperCase(), MARGIN, MARGIN - 6);
    doc.setFont("helvetica", "normal");
    doc.text(`v${meta.version}`, pageW - MARGIN, MARGIN - 6, { align: "right" });
    stroke(HAIRLINE);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, MARGIN, pageW - MARGIN, MARGIN);
  }

  function footers() {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      ink(MUTED);
      if (i > 1) {
        doc.text(clientName, MARGIN, pageH - MARGIN + 12);
        doc.text(`${i} / ${total}`, pageW - MARGIN, pageH - MARGIN + 12, { align: "right" });
      }
    }
  }

  function text(
    value: string,
    opts: {
      size?: number;
      bold?: boolean;
      gap?: number;
      color?: RGB;
      x?: number;
      width?: number;
      leading?: number;
    } = {},
  ) {
    const {
      size = 9.5,
      bold = false,
      gap = 6,
      color = INK,
      x = MARGIN,
      width = maxW,
      leading = 4.5,
    } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    ink(color);
    const lines = doc.splitTextToSize(value, width) as string[];
    for (const line of lines) {
      ensure(size + leading);
      doc.text(line, x, y);
      y += size + leading;
    }
    y += gap;
  }

  function eyebrow(label: string) {
    ensure(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ink(MUTED);
    doc.text(label.toUpperCase(), MARGIN, y, { charSpace: 1.2 });
    y += 12;
  }

  function sectionTitle(label: string, kicker?: string) {
    ensure(58);
    if (kicker) eyebrow(kicker);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    ink(INK);
    doc.text(label, MARGIN, y);
    y += 8;
    fill(ACCENT);
    doc.rect(MARGIN, y, 34, 2.4, "F");
    y += 20;
  }

  function rule(gap = 14) {
    ensure(gap + 4);
    stroke(HAIRLINE);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y, pageW - MARGIN, y);
    y += gap;
  }

  function pill(label: string, x: number, py: number, tone: "accent" | "soft" = "soft") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const w = doc.getTextWidth(label) + 14;
    fill(tone === "accent" ? ACCENT_SOFT : SOFT);
    doc.roundedRect(x, py - 8, w, 13, 6.5, 6.5, "F");
    ink(tone === "accent" ? ACCENT : MUTED);
    doc.text(label, x + 7, py + 0.6);
    return w + 5;
  }

  /* -------------------------------- charts -------------------------------- */

  // Horizontal stacked bars: sets per session (main vs accessory)
  function volumeChart(days: PlanDay[]) {
    const rows = days.map((d) => ({ label: d.day, ...dayVolume(d) })).filter((r) => r.total > 0);
    if (!rows.length) return;
    const max = Math.max(...rows.map((r) => r.total), 1);
    const labelW = 92;
    const barW = maxW - labelW - 34;
    const rowH = 17;

    ensure(rows.length * rowH + 34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ink(MUTED);
    doc.text("WORKING SETS PER SESSION", MARGIN, y, { charSpace: 1 });
    y += 14;

    for (const r of rows) {
      ensure(rowH + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      ink(INK);
      const label = doc.splitTextToSize(r.label, labelW - 6)[0] as string;
      doc.text(label, MARGIN, y + 7.5);

      const bx = MARGIN + labelW;
      fill(SOFT);
      doc.roundedRect(bx, y, barW, 10, 5, 5, "F");
      const mainW = (r.main / max) * barW;
      const accW = (r.accessory / max) * barW;
      if (mainW > 0) {
        fill(ACCENT);
        doc.roundedRect(bx, y, Math.max(mainW, 4), 10, 5, 5, "F");
      }
      if (accW > 0) {
        fill(ACCENT_SOFT);
        doc.roundedRect(bx + mainW, y, Math.max(accW, 4), 10, 5, 5, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      ink(MUTED);
      doc.text(String(r.total), bx + barW + 8, y + 8);
      y += rowH;
    }

    y += 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    let lx = MARGIN + labelW;
    fill(ACCENT);
    doc.rect(lx, y, 7, 7, "F");
    ink(MUTED);
    doc.text("Main work", lx + 11, y + 6);
    lx += 11 + doc.getTextWidth("Main work") + 14;
    fill(ACCENT_SOFT);
    doc.rect(lx, y, 7, 7, "F");
    doc.text("Accessory", lx + 11, y + 6);
    y += 22;
  }

  // Phase timeline: proportional segments
  function timeline(phases: WorkoutPlanContent["phases"]) {
    const items = (phases ?? []).map((p) => ({
      name: p.name,
      weeks: firstNumber(p.duration) ?? 1,
      duration: p.duration,
    }));
    if (items.length < 1) return;
    const total = items.reduce((a, p) => a + p.weeks, 0) || 1;

    ensure(64);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ink(MUTED);
    doc.text("PROGRAMME TIMELINE", MARGIN, y, { charSpace: 1 });
    y += 14;

    let x = MARGIN;
    items.forEach((p, i) => {
      const w = (p.weeks / total) * maxW - (i < items.length - 1 ? 4 : 0);
      fill(i % 2 === 0 ? ACCENT : ACCENT_SOFT);
      doc.roundedRect(x, y, Math.max(w, 8), 11, 3, 3, "F");
      x += w + 4;
    });
    y += 19;

    x = MARGIN;
    items.forEach((p, i) => {
      const w = (p.weeks / total) * maxW - (i < items.length - 1 ? 4 : 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      ink(INK);
      const nm = doc.splitTextToSize(p.name, Math.max(w, 40))[0] as string;
      doc.text(nm, x, y);
      doc.setFont("helvetica", "normal");
      ink(MUTED);
      doc.text(doc.splitTextToSize(p.duration ?? "", Math.max(w, 40))[0] as string, x, y + 9);
      x += w + 4;
    });
    y += 26;
  }

  // KPI stat row
  function statRow(stats: { label: string; value: string }[]) {
    if (!stats.length) return;
    const gap = 10;
    const w = (maxW - gap * (stats.length - 1)) / stats.length;
    ensure(58);
    stats.forEach((s, i) => {
      const x = MARGIN + i * (w + gap);
      fill(SOFT);
      doc.roundedRect(x, y, w, 46, 8, 8, "F");
      fill(ACCENT);
      doc.rect(x, y + 10, 2.5, 26, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      ink(INK);
      doc.text(doc.splitTextToSize(s.value, w - 24)[0] as string, x + 12, y + 25);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      ink(MUTED);
      doc.text(s.label.toUpperCase(), x + 12, y + 37, { charSpace: 0.8 });
    });
    y += 58;
  }

  /* ------------------------------- cover page ------------------------------ */

  // top accent band
  fill(INK);
  doc.rect(0, 0, pageW, 210, "F");
  fill(ACCENT);
  doc.rect(0, 206, pageW, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(160, 200, 130);
  doc.text("TRAINING PROGRAMME", MARGIN, 74, { charSpace: 1.6 });

  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(
    plan.title || `${clientName} training plan`,
    maxW,
  ) as string[];
  let ty = 106;
  for (const line of titleLines.slice(0, 3)) {
    doc.text(line, MARGIN, ty);
    ty += 28;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(196, 200, 206);
  doc.text(`Prepared for ${clientName}`, MARGIN, Math.min(ty + 6, 186));

  y = 246;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  let px = MARGIN;
  px += pill(`VERSION ${meta.version}`, px, y);
  pill(
    meta.approved ? "APPROVED BY TRAINER" : "DRAFT — PENDING APPROVAL",
    px,
    y,
    meta.approved ? "accent" : "soft",
  );
  y += 26;

  if (meta.trainerName || meta.businessName || meta.certification) {
    text([meta.trainerName, meta.businessName, meta.certification].filter(Boolean).join("  ·  "), {
      size: 9,
      color: MUTED,
      gap: 4,
    });
  }
  text(
    new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }),
    { size: 9, color: MUTED, gap: 14 },
  );

  const s = plan.summary;
  const allDays = (plan.phases ?? []).flatMap((p) => p.days ?? []);
  const totalSets = allDays.reduce((a, d) => a + dayVolume(d).total, 0);
  const totalExercises = allDays.reduce(
    (a, d) => a + (d.main?.length ?? 0) + (d.accessory?.length ?? 0),
    0,
  );

  statRow(
    [
      s?.plan_duration ? { label: "Duration", value: s.plan_duration } : null,
      s?.days_per_week ? { label: "Days / week", value: String(s.days_per_week) } : null,
      { label: "Phases", value: String((plan.phases ?? []).length) },
      totalSets ? { label: "Total sets", value: String(totalSets) } : null,
    ].filter(Boolean) as { label: string; value: string }[],
  );

  timeline(plan.phases ?? []);
  y += 18;

  /* -------------------------------- summary ------------------------------- */

  sectionTitle("Plan summary", "Overview");
  const summaryRows: [string, string][] = (
    [
      ["Primary goal", s?.primary_goal],
      ["Experience level", s?.experience_level],
      ["Session duration", s?.session_duration],
      ["Split", s?.split],
      ["Equipment", s?.equipment],
      ["Key limitations", s?.key_limitations],
      ["Exercises programmed", totalExercises ? String(totalExercises) : ""],
    ] as [string, string | undefined][]
  ).filter(([, v]) => !!v) as [string, string][];

  const keyW = 132;
  summaryRows.forEach(([k, v], i) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(v, maxW - keyW - 14) as string[];
    const h = Math.max(lines.length * 13, 18);
    ensure(h + 4);
    if (i % 2 === 0) {
      fill(SOFT);
      doc.roundedRect(MARGIN - 6, y - 10, maxW + 12, h, 4, 4, "F");
    }
    doc.setFont("helvetica", "bold");
    ink(MUTED);
    doc.setFontSize(8.5);
    doc.text(k, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    ink(INK);
    lines.forEach((ln, li) => doc.text(ln, MARGIN + keyW, y + li * 13));
    y += h;
  });
  y += 16;

  /* --------------------------------- phases ------------------------------- */

  function exerciseTable(title: string, items: PlanExercise[]) {
    if (!items?.length) return;
    ensure(48);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ink(ACCENT);
    doc.text(title.toUpperCase(), MARGIN + 10, y, { charSpace: 1 });
    y += 12;

    for (const ex of items) {
      const detailW = maxW - 20;
      const metaLine =
        `${ex.sets} × ${ex.reps}   ·   Rest ${ex.rest}   ·   ${ex.intensity}` +
        (ex.tempo ? `   ·   Tempo ${ex.tempo}` : "");
      const extras: [string, string, RGB][] = [];
      if (ex.cue) extras.push(["Cue", ex.cue, MUTED]);
      if (ex.regression) extras.push(["Easier", ex.regression, MUTED]);
      if (ex.progression) extras.push(["Harder", ex.progression, MUTED]);
      if (ex.safety_note) extras.push(["Safety", ex.safety_note, WARN]);

      doc.setFontSize(8);
      const extraLines = extras.reduce(
        (a, [k, v]) => a + (doc.splitTextToSize(`${k}: ${v}`, detailW - 12) as string[]).length,
        0,
      );
      const h = 30 + extraLines * 10.5;
      ensure(h + 8);

      fill([255, 255, 255]);
      stroke(HAIRLINE);
      doc.setLineWidth(0.6);
      doc.roundedRect(MARGIN + 10, y - 10, maxW - 10, h, 6, 6, "FD");
      fill(ACCENT);
      doc.roundedRect(MARGIN + 10, y - 10, 2.5, h, 1, 1, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      ink(INK);
      doc.text(doc.splitTextToSize(ex.name, detailW - 12)[0] as string, MARGIN + 22, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      ink(MUTED);
      doc.text(metaLine, MARGIN + 22, y + 12);

      let ey = y + 24;
      for (const [k, v, c] of extras) {
        const lines = doc.splitTextToSize(`${k}: ${v}`, detailW - 12) as string[];
        ink(c);
        for (const ln of lines) {
          doc.text(ln, MARGIN + 22, ey);
          ey += 10.5;
        }
      }
      y += h + 6;
    }
    y += 4;
  }

  function listLine(label: string, values: string[] | undefined) {
    if (!values?.length) return;
    text(`${label}: ${values.join("  ·  ")}`, {
      size: 8.5,
      color: MUTED,
      gap: 6,
      x: MARGIN + 10,
      width: maxW - 10,
    });
  }

  (plan.phases ?? []).forEach((phase, pi) => {
    if (pi > 0 || y > pageH - 320) newPage();
    sectionTitle(phase.name, `Phase ${pi + 1} · ${phase.duration}`);
    if (phase.objective) text(phase.objective, { size: 10, gap: 10 });

    const facts: [string, string][] = (
      [
        ["Progression", phase.progression],
        ["Recovery", phase.recovery],
        ["Advance when", phase.advance_criteria],
      ] as [string, string][]
    ).filter(([, v]) => !!v);

    if (facts.length) {
      doc.setFontSize(8.5);
      const inner = maxW - 24 - 96;
      const heights = facts.map(
        (f) => (doc.splitTextToSize(f[1], inner) as string[]).length * 11.5,
      );
      const boxH = heights.reduce((a, b) => a + b, 0) + 20;
      ensure(boxH + 10);
      fill(SOFT);
      doc.roundedRect(MARGIN, y - 10, maxW, boxH, 8, 8, "F");
      let fy = y + 2;
      facts.forEach(([k, v], i) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        ink(ACCENT);
        doc.text(k.toUpperCase(), MARGIN + 12, fy, { charSpace: 0.6 });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        ink(INK);
        (doc.splitTextToSize(v, inner) as string[]).forEach((ln, li) =>
          doc.text(ln, MARGIN + 108, fy + li * 11.5),
        );
        fy += heights[i] ?? 0;
      });
      y += boxH + 4;
    }

    volumeChart(phase.days ?? []);

    (phase.days ?? []).forEach((day) => {
      const vol = dayVolume(day);
      ensure(70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      ink(INK);
      doc.text(`${day.day} — ${day.focus}`, MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      ink(MUTED);
      doc.text(
        [day.duration, vol.total ? `${vol.total} sets` : ""].filter(Boolean).join("  ·  "),
        pageW - MARGIN,
        y,
        { align: "right" },
      );
      y += 8;
      stroke(HAIRLINE);
      doc.setLineWidth(0.6);
      doc.line(MARGIN, y, pageW - MARGIN, y);
      y += 14;

      listLine("Warm-up", day.warm_up);
      exerciseTable("Main work", day.main ?? []);
      exerciseTable("Accessory work", day.accessory ?? []);
      listLine("Conditioning", day.conditioning);
      listLine("Cool-down", day.cool_down);
      if (day.trainer_notes)
        text(`Notes: ${day.trainer_notes}`, {
          size: 8.5,
          gap: 10,
          x: MARGIN + 10,
          width: maxW - 10,
        });
      y += 6;
    });
  });

  /* ------------------------------- monitoring ------------------------------ */

  const m = plan.monitoring;
  if (m) {
    if (y > pageH - 300) newPage();
    sectionTitle("Progress monitoring", "Tracking");
    const rows: [string, string][] = (
      [
        ["Weekly progression", m.weekly_progression],
        ["Load increases", m.load_increase_guidance],
        ["Deloads", m.deload_guidance],
        ["Adjust if", m.adjust_signals],
        ["Reassessment", m.reassessment_date],
      ] as [string, string][]
    ).filter(([, v]) => !!v);
    rows.forEach(([k, v], i) => {
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(v, maxW - 146) as string[];
      const h = Math.max(lines.length * 13, 18);
      ensure(h + 4);
      if (i % 2 === 0) {
        fill(SOFT);
        doc.roundedRect(MARGIN - 6, y - 10, maxW + 12, h, 4, 4, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      ink(MUTED);
      doc.text(k, MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      ink(INK);
      lines.forEach((ln, li) => doc.text(ln, MARGIN + 132, y + li * 13));
      y += h;
    });
    y += 18;
  }

  function bulletBlock(title: string, kicker: string, items: string[] | undefined) {
    if (!items?.length) return;
    if (y > pageH - 200) newPage();
    sectionTitle(title, kicker);
    for (const n of items) {
      ensure(20);
      fill(ACCENT);
      doc.circle(MARGIN + 3, y - 3, 2, "F");
      text(n, { size: 9, gap: 3, x: MARGIN + 14, width: maxW - 14 });
    }
    y += 12;
  }

  bulletBlock("Programming notes", "Coaching", plan.programming_notes);
  bulletBlock("Information to confirm", "Follow-up", plan.missing_information);

  if (meta.trainerNotes) {
    if (y > pageH - 180) newPage();
    sectionTitle("Trainer notes", "From your coach");
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(meta.trainerNotes, maxW - 28) as string[];
    const h = lines.length * 13 + 22;
    ensure(h + 8);
    fill(ACCENT_SOFT);
    doc.roundedRect(MARGIN, y - 12, maxW, h, 8, 8, "F");
    ink(INK);
    doc.setFont("helvetica", "normal");
    lines.forEach((ln, i) => doc.text(ln, MARGIN + 14, y + 4 + i * 13));
    y += h + 10;
  }

  /* ------------------------------- disclaimer ------------------------------ */

  ensure(70);
  rule(12);
  text(
    "This plan is a professional planning document prepared by a certified trainer with AI assistance. It is not medical advice, diagnosis or treatment. Clients with health concerns should obtain medical clearance before starting.",
    { size: 7.5, color: MUTED },
  );

  footers();

  const safeName = clientName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`${safeName}-plan-v${meta.version}.pdf`);
}
