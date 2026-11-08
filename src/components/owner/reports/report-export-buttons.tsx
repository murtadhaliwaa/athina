"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/ar-iq";
import { formatBaghdadDateTime } from "@/lib/time";

type Props = {
  /** اسم الملف بدون امتداد أو مع .csv — يُشتق منه اسم الـ PDF */
  filename: string;
  title: string;
  headers: string[];
  rows: (string | number)[][];
};

function baseName(filename: string) {
  return filename.replace(/\.csv$/i, "").replace(/\.pdf$/i, "") || "report";
}

function escapeCsv(v: string | number) {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName(filename)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function cellText(v: string | number) {
  return String(v);
}

/** رسم التقرير على Canvas (عربي RTL) بدون html2canvas/iframe */
function renderReportCanvas(
  title: string,
  meta: string,
  headers: string[],
  rows: (string | number)[][],
): HTMLCanvasElement {
  const scale = 2;
  const pad = 28;
  const titleSize = 22;
  const metaSize = 12;
  const cellSize = 12;
  const rowH = 34;
  const headerH = 36;
  const gapAfterMeta = 18;
  const width = 1100;
  const cols = Math.max(headers.length, 1);
  const tableW = width - pad * 2;
  const colW = tableW / cols;

  const height =
    pad +
    titleSize +
    8 +
    metaSize +
    gapAfterMeta +
    headerH +
    rows.length * rowH +
    pad;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${titleSize}px Tahoma, "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = "#111111";
  ctx.fillText(title, width / 2, pad + titleSize / 2);

  ctx.font = `400 ${metaSize}px Tahoma, "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = "#555555";
  ctx.fillText(meta, width / 2, pad + titleSize + 8 + metaSize / 2);

  const tableTop = pad + titleSize + 8 + metaSize + gapAfterMeta;
  const tableLeft = pad;

  // رأس الجدول
  ctx.fillStyle = "#f3f3f3";
  ctx.fillRect(tableLeft, tableTop, tableW, headerH);
  ctx.strokeStyle = "#cccccc";
  ctx.lineWidth = 1;
  ctx.strokeRect(tableLeft, tableTop, tableW, headerH);

  ctx.font = `700 ${cellSize}px Tahoma, "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = "#111111";
  for (let c = 0; c < cols; c++) {
    // RTL: العمود 0 على اليمين
    const x = tableLeft + tableW - (c + 0.5) * colW;
    ctx.beginPath();
    ctx.moveTo(tableLeft + tableW - c * colW, tableTop);
    ctx.lineTo(tableLeft + tableW - c * colW, tableTop + headerH);
    ctx.stroke();
    ctx.fillText(headers[c] ?? "", x, tableTop + headerH / 2, colW - 8);
  }

  // الصفوف
  ctx.font = `400 ${cellSize}px Tahoma, "Segoe UI", Arial, sans-serif`;
  for (let r = 0; r < rows.length; r++) {
    const y = tableTop + headerH + r * rowH;
    ctx.fillStyle = r % 2 === 1 ? "#fafafa" : "#ffffff";
    ctx.fillRect(tableLeft, y, tableW, rowH);
    ctx.strokeStyle = "#cccccc";
    ctx.strokeRect(tableLeft, y, tableW, rowH);
    ctx.fillStyle = "#111111";
    for (let c = 0; c < cols; c++) {
      const x = tableLeft + tableW - (c + 0.5) * colW;
      ctx.beginPath();
      ctx.moveTo(tableLeft + tableW - c * colW, y);
      ctx.lineTo(tableLeft + tableW - c * colW, y + rowH);
      ctx.stroke();
      const text = cellText(rows[r]?.[c] ?? "");
      ctx.fillText(text, x, y + rowH / 2, colW - 8);
    }
  }

  return canvas;
}

function addCanvasToPdf(
  pdf: InstanceType<typeof import("jspdf").jsPDF>,
  canvas: HTMLCanvasElement,
) {
  const pageW = pdf.internal.pageSize.getWidth() as number;
  const pageH = pdf.internal.pageSize.getHeight() as number;
  const margin = 8;
  const usableW = pageW - margin * 2;
  const usableH = pageH - margin * 2;
  const imgW = usableW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  if (imgH <= usableH) {
    pdf.addImage(imgData, "JPEG", margin, margin, imgW, imgH);
    return;
  }

  const pageCanvas = document.createElement("canvas");
  const ctx = pageCanvas.getContext("2d");
  if (!ctx) {
    pdf.addImage(imgData, "JPEG", margin, margin, imgW, usableH);
    return;
  }

  const slicePx = Math.floor((usableH / imgW) * canvas.width);
  let y = 0;
  let page = 0;
  while (y < canvas.height) {
    const h = Math.min(slicePx, canvas.height - y);
    pageCanvas.width = canvas.width;
    pageCanvas.height = h;
    ctx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    const sliceData = pageCanvas.toDataURL("image/jpeg", 0.92);
    const sliceHmm = (h * imgW) / canvas.width;
    if (page > 0) pdf.addPage();
    pdf.addImage(sliceData, "JPEG", margin, margin, imgW, sliceHmm);
    y += h;
    page += 1;
  }
}

/** يولّد PDF عربي RTL ويحمّله مباشرة كملف */
async function downloadPdf(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const { jsPDF } = await import("jspdf");

  const generatedAt = formatBaghdadDateTime(new Date());

  const meta = `${t("app.shortName")} — ${generatedAt}`;
  const canvas = renderReportCanvas(title, meta, headers, rows);

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  addCanvasToPdf(pdf, canvas);

  // تنزيل عبر Blob بدل pdf.save() لتفادي سياسات unload
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName(filename)}.pdf`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ReportExportButtons({ filename, title, headers, rows }: Props) {
  const [pending, startTransition] = useTransition();
  const [busyPdf, setBusyPdf] = useState(false);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending || busyPdf}
        className="h-11 rounded-xl border-border bg-transparent px-3 text-sm text-muted-foreground hover:bg-brand-gold/10 hover:text-foreground"
        onClick={() =>
          startTransition(() => downloadCsv(filename, headers, rows))
        }
      >
        {t("reports.exportCsv")}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={pending || busyPdf}
        className="h-11 rounded-xl border-border bg-transparent px-3 text-sm text-muted-foreground hover:bg-brand-gold/10 hover:text-foreground"
        onClick={() => {
          setBusyPdf(true);
          void downloadPdf(filename, title, headers, rows)
            .catch((err) => {
              console.error(err);
            })
            .finally(() => setBusyPdf(false));
        }}
      >
        {busyPdf ? t("app.loading") : t("reports.exportPdf")}
      </Button>
    </div>
  );
}
