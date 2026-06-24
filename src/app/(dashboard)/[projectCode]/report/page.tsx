"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { ChevronLeft, ChevronRight, FileDown, FileSpreadsheet } from "lucide-react";


// ─── Types ────────────────────────────────────────────────────────────────────
interface Contributor {
  id: string;
  taskId: string;
  developerId: string;
  individualProgress: number;
  isCurrentActive: boolean;
  name: string;
  email: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  startDate: string | null;
  isArchived?: number | boolean | null;
  epic: string | null;
  contributors?: Contributor[];
}

interface User {
  id: string;
  name: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DEV_COLORS = [
  { solid: "#4F46E5", light: "#EEF2FF" }, // Indigo
  { solid: "#0891B2", light: "#ECFEFF" }, // Cyan
  { solid: "#0D9488", light: "#F0FDFA" }, // Teal
  { solid: "#7C3AED", light: "#F5F3FF" }, // Violet
  { solid: "#2563EB", light: "#EFF6FF" }, // Royal Blue
  { solid: "#059669", light: "#ECFDF5" }, // Emerald
  { solid: "#EA580C", light: "#FFF7ED" }, // Orange (balanced, not warning red)
  { solid: "#DB2777", light: "#FDF2F8" }, // Pink
  { solid: "#D97706", light: "#FEF3C7" }, // Amber
  { solid: "#475569", light: "#F1F5F9" }, // Slate
];

const STATUS_COLORS: Record<string, { solid: string; light: string; label: string }> = {
  todo:        { solid: "#64748B", light: "#F1F5F9", label: "To Do" },
  in_progress: { solid: "#3B82F6", light: "#EFF6FF", label: "In Progress" },
  review:      { solid: "#D97706", light: "#FEF3C7", label: "Review" },
  done:        { solid: "#10B981", light: "#ECFDF5", label: "Done" },
};
const DEFAULT_STATUS_COLOR = { solid: "#64748B", light: "#F1F5F9" };

const PRIORITY_COLORS: Record<string, { solid: string; light: string; label: string }> = {
  urgent: { solid: "#E11D48", light: "#FFF1F2", label: "Urgent" },
  high:   { solid: "#EA580C", light: "#FFF7ED", label: "High" },
  medium: { solid: "#3B82F6", light: "#EFF6FF", label: "Medium" },
  low:    { solid: "#64748B", light: "#F1F5F9", label: "Low" },
};
const DEFAULT_PRIORITY_COLOR = { solid: "#64748B", light: "#F1F5F9" };

const EPIC_COLORS = [
  { solid: "#6366F1", light: "#EEF2FF" }, // Indigo
  { solid: "#06B6D4", light: "#ECFEFF" }, // Cyan
  { solid: "#14B8A6", light: "#F0FDFA" }, // Teal
  { solid: "#8B5CF6", light: "#F5F3FF" }, // Violet
  { solid: "#EC4899", light: "#FDF2F8" }, // Pink
  { solid: "#F59E0B", light: "#FEF3C7" }, // Amber
  { solid: "#3B82F6", light: "#EFF6FF" }, // Blue
  { solid: "#10B981", light: "#ECFDF5" }, // Emerald
  { solid: "#F97316", light: "#FFF7ED" }, // Orange
  { solid: "#64748B", light: "#F1F5F9" }, // Slate
];

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "URGENT", high: "HIGH", medium: "MED", low: "LOW",
};

const DAY_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toDate(s: string) { return new Date(s + "T00:00:00"); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function mondayOf(d: Date) {
  const r = new Date(d); r.setHours(0, 0, 0, 0);
  const day = r.getDay(); r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); return r;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReportPage() {
  const params  = useParams();
  const projectCode = params?.projectCode as string;

  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode,    setMode]    = useState<"weekly" | "monthly">("weekly");



  // Filter states
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedEpic, setSelectedEpic] = useState<string>("all");
  const [colorMode, setColorMode] = useState<"developer" | "status" | "priority" | "epic">("developer");

  // Export loading state
  const [pdfLoading, setPdfLoading] = useState(false);

  // Period — default to week of 1 Jun 2026
  const [period, setPeriod] = useState<Date>(() => mondayOf(new Date("2026-06-01")));



  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tr, ur] = await Promise.all([
      fetch(`/api/tasks?projectCode=${projectCode}`),
      fetch("/api/users"),
    ]);
    if (tr.ok) setTasks(await tr.json());
    if (ur.ok) setUsers(await ur.json());
    setLoading(false);
  }, [projectCode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const userIdx  = (userId: string) => users.findIndex(u => u.id === userId);

  const getPrimaryUserId = (t: Task) => {
    if (t.contributors && t.contributors.length > 0) {
      const active = t.contributors.find(c => c.isCurrentActive);
      if (active) return active.developerId;
      return t.contributors[0].developerId;
    }
    return t.assigneeId;
  };

  const getTaskColor = (t: Task) => {
    if (colorMode === "status") {
      return STATUS_COLORS[t.status] ?? DEFAULT_STATUS_COLOR;
    }
    if (colorMode === "priority") {
      return PRIORITY_COLORS[t.priority] ?? DEFAULT_PRIORITY_COLOR;
    }
    if (colorMode === "epic") {
      if (!t.epic) return { solid: "#94A3B8", light: "#F1F5F9" };
      const idx = uniqueEpics.indexOf(t.epic);
      return idx >= 0 ? EPIC_COLORS[idx % EPIC_COLORS.length] : { solid: "#94A3B8", light: "#F1F5F9" };
    }

    // Default: developer / PIC
    const primaryId = getPrimaryUserId(t);
    return primaryId && userIdx(primaryId) >= 0
      ? DEV_COLORS[userIdx(primaryId) % DEV_COLORS.length]
      : { solid: "#9CA3AF", light: "#F3F4F6" };
  };

  const taskStart = (t: Task) => t.startDate ?? "2026-06-01";
  const taskEnd   = (t: Task) => t.dueDate ?? taskStart(t);

  // Extract unique Epics from loaded tasks (excluding null/empty ones)
  const uniqueEpics = Array.from(new Set(tasks.map(t => t.epic).filter(Boolean))) as string[];

  // Only show active tasks WITH a PIC, matching assignee & epic filters, sorted by start date
  const activeTasks = tasks
    .filter(t => !t.isArchived && (t.assigneeId || (t.contributors && t.contributors.length > 0)))
    .filter(t => {
      if (selectedAssignee === "all") return true;
      const isAssignee = t.assigneeId === selectedAssignee;
      const isContributor = t.contributors?.some(c => c.developerId === selectedAssignee);
      return isAssignee || isContributor;
    })
    .filter(t => selectedEpic === "all" || t.epic === selectedEpic)
    .sort((a, b) => {
      const diff = taskStart(a).localeCompare(taskStart(b));
      return diff !== 0 ? diff : taskEnd(a).localeCompare(taskEnd(b));
    });

  // ─── Weekly ───────────────────────────────────────────────────────────────
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(period, i));
  const wEnd      = addDays(period, 6);

  const weekCols = (t: Task) => {
    const s = toDate(taskStart(t)), e = toDate(taskEnd(t));
    const sc = Math.max(0, Math.round((s.getTime() - period.getTime()) / 86400000));
    const ec = Math.min(6, Math.round((e.getTime() - period.getTime()) / 86400000));
    return { sc: sc + 1, ec: ec + 1 };
  };

  const weekVisible = activeTasks.filter(t => {
    const s = toDate(taskStart(t)), e = toDate(taskEnd(t));
    return s <= wEnd && e >= period;
  });

  // ─── Monthly ──────────────────────────────────────────────────────────────
  const mStart = new Date(period.getFullYear(), period.getMonth(), 1);
  const mEnd   = new Date(period.getFullYear(), period.getMonth() + 1, 0);

  const buildWeeks = () => {
    const ws: { s: Date; e: Date }[] = [];
    let cur = mondayOf(mStart);
    while (cur <= mEnd) { ws.push({ s: new Date(cur), e: addDays(cur, 6) }); cur = addDays(cur, 7); }
    return ws;
  };
  const weeks = buildWeeks();

  const monthCols = (t: Task) => {
    const s = toDate(taskStart(t)), e = toDate(taskEnd(t));
    let sc = -1, ec = -1;
    weeks.forEach((w, i) => {
      if (s <= w.e && e >= w.s) { if (sc === -1) sc = i; ec = i; }
    });
    return { sc: sc + 1, ec: ec + 1 };
  };

  const monthVisible = activeTasks.filter(t => {
    const s = toDate(taskStart(t)), e = toDate(taskEnd(t));
    return s <= mEnd && e >= mStart;
  });

  // ─── Navigation ───────────────────────────────────────────────────────────
  const prev = () => setPeriod(d => mode === "weekly" ? addDays(d, -7) : new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const next = () => setPeriod(d => mode === "weekly" ? addDays(d, 7)  : new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const periodLabel = mode === "weekly"
    ? `Week: ${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTH_ABBR[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
    : `Month: ${MONTH_FULL[mStart.getMonth()]} ${mStart.getFullYear()}`;

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = {
    total:     activeTasks.length,
    ongoing:   activeTasks.filter(t => t.status === "in_progress").length,
    completed: activeTasks.filter(t => t.status === "done").length,
    delayed:   activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length,
  };

  // ─── Task block renderer (always inside layout) ───────────────────────────
  const renderBlock = (t: Task, row: number, sc: number, ec: number) => {
    const col       = getTaskColor(t);
    const pLabel    = PRIORITY_LABEL[t.priority] ?? t.priority.toUpperCase();
    const user      = users.find(u => u.id === t.assigneeId);

    const devNames = t.contributors && t.contributors.length > 0
      ? t.contributors.map(c => c.name.split(" ")[0]).join(", ")
      : (user?.name.split(" ")[0] ?? "–");

    const devInitials = t.contributors && t.contributors.length > 0
      ? t.contributors.map(c => c.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()).join("+")
      : (user ? user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : "?");

    const gcs = sc + 1; // +1 for index col
    const gce = ec + 2; // exclusive end

    const startStr = taskStart(t);
    const endStr   = taskEnd(t);

    return (
      <div
        key={`blk-${t.id}`}
        className="gantt-block"
        style={{
          gridColumn: `${gcs} / ${gce}`,
          gridRow: row + 2,
          backgroundColor: col.solid,
          borderRadius: 6,
          margin: "3px 4px",
          padding: "4px 8px 5px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          position: "relative",
          overflow: "visible",
          alignSelf: "stretch",
          cursor: "pointer",
          zIndex: 1,
        }}
      >
        {/* Header Row: PIC & Priority Badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{
              width: 12, height: 12, borderRadius: "50%",
              background: "rgba(255,255,255,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.75)", flexShrink: 0,
            }}>
              {devInitials.slice(0, 2)}
            </div>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 9, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {devNames}
            </span>
          </div>
          <span style={{
            fontSize: 7.5, fontWeight: 800, letterSpacing: "0.4px",
            background: "rgba(0,0,0,0.12)", color: "rgba(255,255,255,0.75)",
            padding: "0.5px 3.5px", borderRadius: 2.5, flexShrink: 0,
          }}>
            {pLabel}
          </span>
        </div>

        {/* Task Title — truncated, full shown in tooltip */}
        <p style={{
          margin: 0, color: "#fff", fontWeight: 700, fontSize: 11,
          lineHeight: 1.25,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}>
          {t.title}
        </p>

        {/* ── Hover Tooltip ── */}
        <div className="gantt-tooltip" style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#0F172A",
          color: "#F8FAFC",
          borderRadius: 8,
          padding: "8px 12px",
          minWidth: 200,
          maxWidth: 300,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          pointerEvents: "none",
          zIndex: 999,
          whiteSpace: "normal",
          lineHeight: 1.4,
          border: `2px solid ${col.solid}`,
        }}>
          {/* Arrow */}
          <div style={{
            position: "absolute",
            bottom: -7, left: "50%",
            transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: `7px solid ${col.solid}`,
          }} />
          {/* Full title */}
          <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: "#F8FAFC", marginBottom: t.description ? 2 : 6 }}>
            {t.title}
          </p>
          {/* Description / abbreviation explanation */}
          {t.description && (
            <p style={{ margin: 0, fontSize: 10, color: "#94A3B8", fontStyle: "italic", marginBottom: 6 }}>
              {t.description}
            </p>
          )}
          {/* Meta row */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 500 }}>
              👤 Developer(s): {t.contributors && t.contributors.length > 0 ? t.contributors.map(c => c.name).join(", ") : (user?.name ?? "Unassigned")}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.5px",
                background: col.solid, color: "#fff",
                padding: "1px 5px", borderRadius: 3,
              }}>
                {pLabel}
              </span>
              <span style={{ fontSize: 10, color: "#64748B", fontWeight: 500 }}>
                📅 {startStr} → {endStr}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Grid renderer ────────────────────────────────────────────────────────
  const renderGrid = () => {
    const visRows  = mode === "weekly" ? weekVisible : monthVisible;
    const colCount = mode === "weekly" ? 7 : weeks.length;
    const headers: string[][] = mode === "weekly"
      ? weekDays.map(d => [DAY_ABBR[d.getDay()], `${String(d.getDate()).padStart(2, "0")} ${MONTH_ABBR[d.getMonth()]}`])
      : weeks.map((w, i) => [`Week ${i + 1}`, `${w.s.getDate()} – ${w.e.getDate()} ${MONTH_ABBR[w.e.getMonth()]}`]);

    return (
      <div style={{
        maxHeight: "65vh",
        overflowY: "auto",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        position: "relative",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `40px repeat(${colCount}, minmax(0, 1fr))`,
        }}>
          {/* ── Header row ── */}
          <div style={{
            gridColumn: 1, gridRow: 1,
            background: "#F1F5F9",
            borderRight: "1px solid #E2E8F0",
            borderBottom: "2px solid #E2E8F0",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "sticky", top: 0, zIndex: 10,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#CBD5E1" }}>#</span>
          </div>
          {headers.map((h, i) => (
            <div key={i} style={{
              gridColumn: i + 2, gridRow: 1,
              background: "#F1F5F9",
              borderRight: i < colCount - 1 ? "1px solid #E2E8F0" : "none",
              borderBottom: "2px solid #E2E8F0",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 1, padding: "6px 4px",
              position: "sticky", top: 0, zIndex: 10,
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#334155", letterSpacing: "0.5px" }}>{h[0]}</span>
              <span style={{ fontSize: 9,  fontWeight: 600, color: "#94A3B8", letterSpacing: "0.3px" }}>{h[1]}</span>
            </div>
          ))}

          {/* ── Empty state ── */}
          {visRows.length === 0 && (
            <div style={{
              gridColumn: `1 / ${colCount + 2}`, gridRow: 2,
              padding: "40px 0", textAlign: "center",
              color: "#94A3B8", fontSize: 13, fontWeight: 500,
            }}>
              No assigned tasks scheduled in this period
            </div>
          )}

          {/* ── Task rows ── */}
          {visRows.map((t, ri) => {
            const { sc, ec } = mode === "weekly" ? weekCols(t) : monthCols(t);
            return (
              <div key={`row-${t.id}`} style={{ display: "contents" }}>
                {/* Index cell */}
                <div style={{
                  gridColumn: 1, gridRow: ri + 2,
                  background: ri % 2 === 0 ? "#fff" : "#FAFBFD",
                  borderRight: "1px solid #E2E8F0",
                  borderTop: ri > 0 ? "1px solid #EEF2F7" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#CBD5E1",
                }}>
                  {ri + 1}
                </div>
                {/* Background cells */}
                {Array.from({ length: colCount }, (_, ci) => (
                  <div key={`bg-${t.id}-${ci}`} style={{
                    gridColumn: ci + 2, gridRow: ri + 2,
                    background: ri % 2 === 0 ? "#fff" : "#FAFBFD",
                    borderRight: ci < colCount - 1 ? "1px solid #EEF2F7" : "none",
                    borderTop: ri > 0 ? "1px solid #EEF2F7" : "none",
                    minHeight: 46,
                  }} />
                ))}
                {/* Task block */}
                {renderBlock(t, ri, sc, ec)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout className="px-4 pt-3 pb-4">
      {/* ── Print styles: export only the gantt card ── */}
      <style>{`
        @media print {
          /* Force ALL background colors & images to print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Hide layout chrome */
          .no-print { display: none !important; }
          aside { display: none !important; }

          /* Reset layout so gantt card fills the page */
          body { background: white !important; margin: 0; padding: 0; }
          .flex.h-screen { display: block !important; height: auto !important; }
          .flex-1.flex.flex-col { display: block !important; }
          main {
            overflow: visible !important;
            padding: 0 !important;
            background: white !important;
          }

          /* Gantt card: remove screen-only decoration */
          .gantt-card {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
          }

          /* Prevent any element from being split across pages */
          .gantt-card > div { overflow: visible !important; }
          .gantt-card div { page-break-inside: avoid !important; break-inside: avoid !important; }

          /* Default @page — overridden dynamically by handleExport */
          @page { size: auto; margin: 10mm; }
        }
      `}</style>

      {/* ── Screen-only page header ── */}
      <div className="no-print flex items-center justify-between pb-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">Report</h1>
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Project Task Timeline</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* ── Export PDF (Canvas 2D renderer — no html2canvas, no CSS issues) ── */}
          <button
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              try {
                const { jsPDF } = await import("jspdf");
                const visRows = mode === "weekly" ? weekVisible : monthVisible;
                const colCount = mode === "weekly" ? 7 : weeks.length;

                // Layout constants (px at 2× for retina sharpness)
                const DPR      = 2;
                const MARGIN   = 24;
                const INDEX_W  = 28;
                const COL_W    = mode === "weekly" ? 80 : 110;
                const ROW_H    = 40;
                const HDR_H    = 44;
                const TITLE_H  = 38;
                const LEGEND_H = 32;

                const totalW = (MARGIN * 2 + INDEX_W + colCount * COL_W);
                const totalH = MARGIN * 2 + TITLE_H + HDR_H + visRows.length * ROW_H + LEGEND_H;

                const canvas = document.createElement("canvas");
                canvas.width  = totalW * DPR;
                canvas.height = totalH * DPR;
                const ctx = canvas.getContext("2d")!;
                ctx.scale(DPR, DPR);

                // ── Background ──
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, totalW, totalH);

                // ── Title ──
                ctx.fillStyle = "#0F172A";
                ctx.font = "bold 15px Arial";
                ctx.textAlign = "left";
                ctx.fillText("PDJ PM — Project Task Timeline", MARGIN, MARGIN + 16);
                ctx.fillStyle = "#94A3B8";
                ctx.font = "10px Arial";
                ctx.fillText(periodLabel, MARGIN, MARGIN + 30);

                // ── Column headers ──
                const headers = mode === "weekly"
                  ? weekDays.map(d => `${DAY_ABBR[d.getDay()]}  ${d.getDate()}/${d.getMonth()+1}`)
                  : weeks.map((w, i) => `Week ${i+1}  ${w.s.getDate()}–${w.e.getDate()} ${MONTH_ABBR[w.e.getMonth()]}`);

                const gridTop = MARGIN + TITLE_H;

                ctx.fillStyle = "#F1F5F9";
                ctx.fillRect(MARGIN, gridTop, totalW - MARGIN * 2, HDR_H);

                // # header
                ctx.strokeStyle = "#E2E8F0"; ctx.lineWidth = 0.5;
                ctx.strokeRect(MARGIN, gridTop, INDEX_W, HDR_H);
                ctx.fillStyle = "#CBD5E1"; ctx.font = "bold 9px Arial"; ctx.textAlign = "center";
                ctx.fillText("#", MARGIN + INDEX_W / 2, gridTop + HDR_H / 2 + 3);

                headers.forEach((h, i) => {
                  const x = MARGIN + INDEX_W + i * COL_W;
                  ctx.strokeStyle = "#E2E8F0"; ctx.lineWidth = 0.5;
                  ctx.strokeRect(x, gridTop, COL_W, HDR_H);
                  ctx.fillStyle = "#334155"; ctx.font = "bold 8px Arial"; ctx.textAlign = "center";
                  const parts = h.split("  ");
                  ctx.fillText(parts[0] ?? "", x + COL_W / 2, gridTop + 16);
                  ctx.fillStyle = "#94A3B8"; ctx.font = "8px Arial";
                  ctx.fillText(parts[1] ?? "", x + COL_W / 2, gridTop + 29);
                });

                // ── Rows ──
                visRows.forEach((t, ri) => {
                  const rowY = gridTop + HDR_H + ri * ROW_H;
                  const { sc, ec } = mode === "weekly" ? weekCols(t) : monthCols(t);
                  const user = users.find(u => u.id === t.assigneeId);
                  const col  = getTaskColor(t);
                  const pLabel  = PRIORITY_LABEL[t.priority] ?? t.priority.toUpperCase();

                  const devNames = t.contributors && t.contributors.length > 0
                    ? t.contributors.map(c => c.name.split(" ")[0]).join(", ")
                    : (user?.name.split(" ")[0] ?? "–");

                  const devInitials = t.contributors && t.contributors.length > 0
                    ? t.contributors.map(c => c.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()).join("+")
                    : (user ? user.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() : "?");

                  // Row background
                  ctx.fillStyle = ri % 2 === 0 ? "#ffffff" : "#FAFBFD";
                  ctx.fillRect(MARGIN, rowY, totalW - MARGIN * 2, ROW_H);
                  ctx.strokeStyle = "#EEF2F7"; ctx.lineWidth = 0.5;
                  ctx.strokeRect(MARGIN, rowY, totalW - MARGIN * 2, ROW_H);

                  // Column dividers
                  for (let ci = 0; ci < colCount; ci++) {
                    ctx.strokeStyle = "#EEF2F7"; ctx.lineWidth = 0.3;
                    ctx.strokeRect(MARGIN + INDEX_W + ci * COL_W, rowY, COL_W, ROW_H);
                  }

                  // Index number
                  ctx.fillStyle = "#CBD5E1"; ctx.font = "bold 9px Arial"; ctx.textAlign = "center";
                  ctx.fillText(String(ri + 1), MARGIN + INDEX_W / 2, rowY + ROW_H / 2 + 3);

                  // Task block
                  const bx = MARGIN + INDEX_W + (sc - 1) * COL_W + 3;
                  const bw = (ec - sc + 1) * COL_W - 6;
                  const by = rowY + 4;
                  const bh = ROW_H - 8;

                  ctx.fillStyle = col.solid;
                  ctx.beginPath();
                  ctx.roundRect(bx, by, bw, bh, 4);
                  ctx.fill();

                  // PIC (top-left)
                  ctx.fillStyle = "rgba(255,255,255,0.75)";
                  ctx.font = "bold 7.5px Arial"; ctx.textAlign = "left";
                  ctx.fillText(`${devInitials.slice(0, 2)} ${devNames}`, bx + 5, by + 10);

                  // Priority (top-right)
                  ctx.font = "bold 7px Arial"; ctx.textAlign = "right";
                  ctx.fillText(pLabel, bx + bw - 5, by + 10);

                  // Task title (center-left)
                  ctx.fillStyle = "#ffffff"; ctx.font = "bold 9px Arial"; ctx.textAlign = "left";
                  let title = t.title;
                  const maxTW = bw - 10;
                  while (ctx.measureText(title).width > maxTW && title.length > 3) title = title.slice(0, -1);
                  if (title !== t.title) title = title.slice(0, -1) + "…";
                  ctx.fillText(title, bx + 5, by + bh / 2 + 4);
                });

                // ── Build PDF ──
                const MM = 0.264583;
                const pdfW = totalW * MM;
                const pdfH = totalH * MM;
                const pdf = new jsPDF({
                  orientation: pdfW > pdfH ? "landscape" : "portrait",
                  unit: "mm",
                  format: [pdfW, pdfH],
                  compress: true,
                });
                pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pdfW, pdfH);

                // Force correct filename — anchor must stay in DOM briefly after click
                // so the browser can process the `download` attribute before removal
                const pdfBlob = pdf.output("blob");
                const pdfUrl  = URL.createObjectURL(pdfBlob);
                const pdfA    = document.createElement("a");
                pdfA.href     = pdfUrl;
                pdfA.download = `PDJ-PM_Gantt_${periodLabel.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
                pdfA.style.display = "none";
                document.body.appendChild(pdfA);
                pdfA.click();
                setTimeout(() => {
                  document.body.removeChild(pdfA);
                  URL.revokeObjectURL(pdfUrl);
                }, 250);
              } finally {
                setPdfLoading(false);
              }
            }}
            className="h-8 px-4 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ minWidth: 120 }}
          >
            {pdfLoading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                Export PDF
              </>
            )}
          </button>

          {/* ── Export XLSX ── */}
          <button
            onClick={async () => {
              try {
                const { utils, write } = await import("xlsx");
                const visRows = mode === "weekly" ? weekVisible : monthVisible;
                const colHeaders = mode === "weekly"
                  ? weekDays.map(d => `${DAY_ABBR[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`)
                  : weeks.map((w, i) => `Week ${i+1} (${w.s.getDate()}/${w.s.getMonth()+1})`);

                const headerRow = ["#", "Task", "PIC", "Priority", "Start", "End", ...colHeaders];
                const dataRows = visRows.map((t, i) => {
                  const user  = users.find(u => u.id === t.assigneeId);
                  const start = taskStart(t);
                  const end   = taskEnd(t);
                  const devNames = t.contributors && t.contributors.length > 0
                    ? t.contributors.map(c => c.name).join(", ")
                    : (user?.name ?? "-");
                  const ganttCols = mode === "weekly"
                    ? weekDays.map(d => { const ds = d.toISOString().slice(0,10); return ds >= start && ds <= end ? "█" : ""; })
                    : weeks.map(w => { const ws2 = w.s.toISOString().slice(0,10); const we2 = w.e.toISOString().slice(0,10); return start <= we2 && end >= ws2 ? "█" : ""; });
                  return [i+1, t.title, devNames, PRIORITY_LABEL[t.priority] ?? t.priority, start, end, ...ganttCols];
                });

                const ws = utils.aoa_to_sheet([headerRow, ...dataRows]);
                ws["!cols"] = [{ wch: 4 }, { wch: 42 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, ...colHeaders.map(() => ({ wch: 10 }))];

                const wb = utils.book_new();
                utils.book_append_sheet(wb, ws, "Gantt Chart");

                // Manual blob download for correct filename in all browsers
                // Anchor must stay in DOM briefly after click so browser processes `download` attr
                const buf  = write(wb, { bookType: "xlsx", type: "array" });
                const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement("a");
                a.href     = url;
                a.download = `PDJ-PM_Gantt_${periodLabel.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
                a.style.display = "none";
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }, 250);
              } catch (e) { console.error("XLSX export failed", e); }
            }}
            className="h-8 px-4 text-xs font-bold rounded-lg flex items-center gap-1.5 bg-emerald-700 text-white hover:bg-emerald-600 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export XLSX
          </button>
        </div>
      </div>

      {/* ── Gantt card (this is what gets printed) ── */}
      <div className="gantt-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">

        {/* Sub-header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px 12px", borderBottom: "1px solid #F1F5F9",
          position: "relative",
        }}>
          {/* Left Controls: Filters for Assignee & Epic (replaced empty spacer) */}
          <div className="no-print" style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            {/* Color Mode Selector */}
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as any)}
              style={{
                padding: "4px 8px", fontSize: 11, fontWeight: 700,
                borderRadius: 6, border: "1px solid #E2E8F0",
                background: "#F8FAFC", color: "#0F172A", cursor: "pointer",
              }}
            >
              <option value="developer">👤 Color: Developer</option>
              <option value="status">📊 Color: Status</option>
              <option value="priority">⚠️ Color: Priority</option>
              <option value="epic">📁 Color: Epic (Module)</option>
            </select>
            {/* Assignee Filter */}
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              style={{
                padding: "4px 8px", fontSize: 11, fontWeight: 700,
                borderRadius: 6, border: "1px solid #E2E8F0",
                background: "#FAFBFD", color: "#475569", cursor: "pointer",
              }}
            >
              <option value="all">All Devs</option>
              {users.filter(u => tasks.some(t => t.assigneeId === u.id || t.contributors?.some(c => c.developerId === u.id))).map(u => (
                <option key={u.id} value={u.id}>{u.name.split(" ")[0]}</option>
              ))}
            </select>

            {/* Epic Filter */}
            <select
              value={selectedEpic}
              onChange={(e) => {
                const epic = e.target.value;
                setSelectedEpic(epic);
                
                if (epic !== "all") {
                  const moduleTasks = tasks.filter(t => t.epic === epic && t.startDate !== null && (t.assigneeId || (t.contributors && t.contributors.length > 0)));
                  if (moduleTasks.length === 0) {
                    alert(`Belum ada timeline untuk modul ${epic}. Modul ini belum ditugaskan ke developer.`);
                  } else {
                    const startDates = moduleTasks.map(t => new Date(t.startDate!)).sort((a,b) => a.getTime() - b.getTime());
                    if (startDates.length > 0) {
                      setPeriod(mondayOf(new Date(startDates[0])));
                    }
                  }
                }
              }}
              style={{
                padding: "4px 8px", fontSize: 11, fontWeight: 700,
                borderRadius: 6, border: "1px solid #E2E8F0",
                background: "#FAFBFD", color: "#475569", cursor: "pointer",
              }}
            >
              <option value="all">All Modules</option>
              {uniqueEpics.map(ep => (
                <option key={ep} value={ep}>{ep}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", color: "#94A3B8", textTransform: "uppercase" }}>
              {mode === "weekly" ? "WEEKLY REPORT" : "MONTHLY REPORT"}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="no-print" onClick={prev}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", display: "flex", alignItems: "center", padding: "2px 3px", borderRadius: 4, transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#475569")}
                onMouseLeave={e => (e.currentTarget.style.color = "#CBD5E1")}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.4px" }}>
                {periodLabel}
              </span>
              <button className="no-print" onClick={next}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", display: "flex", alignItems: "center", padding: "2px 3px", borderRadius: 4, transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#475569")}
                onMouseLeave={e => (e.currentTarget.style.color = "#CBD5E1")}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          {/* Mode toggle — right side */}
          <div className="no-print" style={{ width: 140, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", gap: 2, background: "#F1F5F9", borderRadius: 8, padding: 3 }}>
              {(["weekly", "monthly"] as const).map(m => (
                <button key={m}
                  onClick={() => { setMode(m); if (m === "monthly") setPeriod(new Date(period.getFullYear(), period.getMonth(), 1)); }}
                  style={{
                    padding: "4px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.4px",
                    borderRadius: 6, border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: mode === m ? "#fff" : "transparent",
                    color: mode === m ? "#0F172A" : "#94A3B8",
                    boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
                  }}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Summary bar + PIC legend (moved above grid) ── */}
        <div style={{ padding: "10px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          {/* Stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            {[
              { label: "Total Tasks", val: stats.total,     dot: "#6366F1" },
              { label: "Ongoing",     val: stats.ongoing,   dot: "#F97316" },
              { label: "Completed",   val: stats.completed, dot: "#10B981" },
              { label: "Delayed",     val: stats.delayed,   dot: "#EF4444" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: s.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{s.label}:</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: s.label === "Delayed" && s.val > 0 ? "#EF4444" : "#0F172A" }}>
                  {s.val}
                </span>
              </div>
            ))}
          </div>
          {/* Dynamic Legend */}
          {!loading && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {colorMode === "developer" &&
                users.filter(u => activeTasks.some(t => t.assigneeId === u.id || t.contributors?.some(c => c.developerId === u.id))).map((u) => {
                  const idx = userIdx(u.id);
                  const c = DEV_COLORS[idx % DEV_COLORS.length];
                  return (
                    <div key={u.id} style={{
                      display: "flex", alignItems: "center", gap: 5,
                      background: c.light, borderRadius: 20,
                      padding: "3px 10px 3px 4px",
                      border: `1px solid ${c.solid}22`,
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%", backgroundColor: c.solid,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, fontWeight: 700, color: "#fff",
                      }}>
                        {u.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#334155" }}>{u.name}</span>
                    </div>
                  );
                })
              }
              {colorMode === "status" &&
                Object.entries(STATUS_COLORS).map(([key, item]) => (
                  <div key={key} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: item.light, borderRadius: 20,
                    padding: "3px 10px",
                    border: `1px solid ${item.solid}22`,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.solid }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#334155" }}>{item.label}</span>
                  </div>
                ))
              }
              {colorMode === "priority" &&
                Object.entries(PRIORITY_COLORS).map(([key, item]) => (
                  <div key={key} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: item.light, borderRadius: 20,
                    padding: "3px 10px",
                    border: `1px solid ${item.solid}22`,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.solid }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#334155" }}>{item.label}</span>
                  </div>
                ))
              }
              {colorMode === "epic" &&
                uniqueEpics.map((epic, idx) => {
                  const c = EPIC_COLORS[idx % EPIC_COLORS.length];
                  return (
                    <div key={epic} style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: c.light, borderRadius: 20,
                      padding: "3px 10px",
                      border: `1px solid ${c.solid}22`,
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: c.solid }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#334155" }}>{epic}</span>
                    </div>
                  );
                })
              }
            </div>
          )}
        </div>

        {/* Timeline grid */}
        <div style={{ padding: "12px 16px 16px", position: "relative" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10 }}>
              <div style={{ width: 22, height: 22, border: "2px solid #E2E8F0", borderTopColor: "#3B82F6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>Loading tasks…</span>
            </div>
          ) : renderGrid()}
        </div>


      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Gantt tooltip ── */
        .gantt-tooltip {
          opacity: 0;
          transform: translateX(-50%) translateY(4px);
          transition: opacity 0.15s ease, transform 0.15s ease;
        }
        .gantt-block:hover {
          z-index: 50 !important;
          filter: brightness(1.08);
        }
        .gantt-block:hover .gantt-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      `}</style>
    </AppLayout>
  );
}
