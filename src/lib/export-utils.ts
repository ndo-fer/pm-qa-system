import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function isPrimitive(val: unknown): boolean {
  return val === null || val === undefined || typeof val === "boolean" || typeof val === "number" || typeof val === "string";
}

function flattenCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) return `[${val.length} items]`;
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function hasNested(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (Array.isArray(val)) return val.length > 0 && val.some(v => typeof v === "object" && v !== null);
  if (typeof val === "object") return true;
  return false;
}

const SKIP_KEYS = new Set(["id", "projectId", "testPlanId", "assigneeId", "executedBy"]);

function getHeaders(data: Record<string, any>[]): string[] {
  return Array.from(
    new Set(data.flatMap(item => Object.keys(item)))
  ).filter(k => !SKIP_KEYS.has(k));
}

export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const headers = getHeaders(data);

  const csvRows = [
    headers.join(","),
    ...data.map(row =>
      headers
        .map(fieldName => {
          const value = row[fieldName];
          const stringVal = flattenCell(value);
          const escaped = stringVal.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
  ];

  const csvContent = "\uFEFF" + csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let cursorY = margin;

  function addPageIfNeeded(needed: number) {
    if (cursorY + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      cursorY = margin;
    }
  }

  function sectionTitle(text: string) {
    addPageIfNeeded(14);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(text, margin, cursorY);
    cursorY += 8;
    doc.setDrawColor(200);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 5;
  }

  function kvRow(label: string, value: string) {
    addPageIfNeeded(7);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", margin, cursorY);
    const labelW = doc.getTextWidth(label + ":  ");
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + labelW, cursorY);
    cursorY += 6;
  }

  const hasComplex = data.some(item =>
    Object.values(item).some(v => hasNested(v))
  );

  if (hasComplex && data.length === 1) {
    const item = data[0];
    const simpleKeys = Object.entries(item).filter(([k, v]) => !SKIP_KEYS.has(k) && !hasNested(v));

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const title = filename.replace(/_/g, " ");
    doc.text(title, margin, cursorY);
    cursorY += 10;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, cursorY);
    cursorY += 12;

    sectionTitle("Project Information");
    for (const [key, val] of simpleKeys) {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
      kvRow(label, flattenCell(val));
    }
    cursorY += 4;

    for (const [key, val] of Object.entries(item)) {
      if (SKIP_KEYS.has(key)) continue;
      if (Array.isArray(val) && val.length > 0) {
        addPageIfNeeded(20);
        sectionTitle(key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()));

        const arrHeaders = getHeaders(val);
        const arrRows = val.map((v: any) =>
          arrHeaders.map(h => flattenCell(v[h]))
        );

        autoTable(doc, {
          head: [arrHeaders],
          body: arrRows,
          startY: cursorY,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.25 },
          headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 249, 250] },
          tableLineColor: [220, 220, 220],
          tableLineWidth: 0.25,
        });
        cursorY = (doc as any).lastAutoTable.finalY + 10;
      } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        addPageIfNeeded(20);
        sectionTitle(key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()));

        const objHeaders = Object.keys(val).filter(k => !SKIP_KEYS.has(k));
        const objRows = [objHeaders.map(h => flattenCell((val as any)[h]))];

        autoTable(doc, {
          head: [objHeaders],
          body: objRows,
          startY: cursorY,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.25 },
          headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 249, 250] },
          tableLineColor: [220, 220, 220],
          tableLineWidth: 0.25,
        });
        cursorY = (doc as any).lastAutoTable.finalY + 10;
      }
    }
  } else {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(filename.replace(/_/g, " "), margin, cursorY);
    cursorY += 10;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, cursorY);
    cursorY += 10;

    const headers = getHeaders(data);
    const rows = data.map(row =>
      headers.map(h => flattenCell(row[h]))
    );

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: cursorY,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 2, lineColor: [220, 220, 220], lineWidth: 0.25 },
      headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      tableLineColor: [220, 220, 220],
      tableLineWidth: 0.25,
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" }
    );
  }

  doc.save(`${filename}.pdf`);
}

export function exportToJSON(data: any, filename: string) {
  if (!data) {
    alert("No data available to export.");
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.json`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
