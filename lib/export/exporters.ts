"use client";
import { formatDate } from "@/lib/utils";

/** CSV export from an array of flat objects. */
export function exportCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

/** Excel export with one or more named sheets. */
export async function exportXLSX(sheets: { name: string; rows: Record<string, any>[] }[], filename: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

export interface ReportPayload {
  title: string;
  range: string;
  totals: Record<string, number>;
  scores: { name: string; score: number; audience: number; reach: number; engagementRate: number; growthPct: number }[];
  healthScore: number;
}

/** Branded PDF summary report. */
export async function exportPDF(payload: ReportPayload, filename: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(payload.title, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(200, 210, 230);
  doc.text(`${payload.range} · Generated ${formatDate(new Date())}`, 14, 22);

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.text(`Overall Health Score: ${payload.healthScore}/100`, 14, 40);

  autoTable(doc, {
    startY: 46,
    head: [["Metric", "Value"]],
    body: Object.entries(payload.totals).map(([k, v]) => [k, new Intl.NumberFormat("en-IN").format(Math.round(v))]),
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235] },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Platform", "Score", "Audience", "Reach", "Eng %", "Growth %"]],
    body: payload.scores.map((s) => [
      s.name,
      String(s.score),
      new Intl.NumberFormat("en-IN").format(s.audience),
      new Intl.NumberFormat("en-IN").format(s.reach),
      s.engagementRate.toFixed(1),
      s.growthPct.toFixed(1),
    ]),
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.save(filename);
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
