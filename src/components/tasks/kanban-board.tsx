"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, ArrowLeft, ArrowRight, AlertTriangle, Archive, ArchiveRestore, Image, GripVertical } from "lucide-react";

interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  taskCode?: string | null;
  epic?: string | null;
  feature?: string | null;
  phase?: string | null;
  progress?: number;
  blocker?: string | null;
  screenshotUrl?: string | null;
  isArchived?: number | boolean | null;
  contributors?: Array<{
    developerId: string;
    name: string;
    email: string;
    role: string;
    individualProgress: number;
    isCurrentActive: boolean;
  }>;
}

interface KanbanBoardProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onPreview: (task: Task) => void;
  onRefresh: () => void;
}

const COLUMNS = [
  {
    id: "todo",
    title: "To Do",
    accentColor: "bg-slate-500",
    colBg: "bg-slate-50/60",
    border: "border-slate-200",
    headerText: "text-slate-700",
    badgeBg: "bg-slate-200/80 text-slate-700",
    emptyIcon: "text-slate-300",
  },
  {
    id: "in_progress",
    title: "In Progress",
    accentColor: "bg-blue-500",
    colBg: "bg-blue-50/40",
    border: "border-blue-200/60",
    headerText: "text-blue-800",
    badgeBg: "bg-blue-100 text-blue-700",
    emptyIcon: "text-blue-200",
  },
  {
    id: "review",
    title: "Review",
    accentColor: "bg-amber-400",
    colBg: "bg-amber-50/40",
    border: "border-amber-200/60",
    headerText: "text-amber-800",
    badgeBg: "bg-amber-100 text-amber-700",
    emptyIcon: "text-amber-200",
  },
  {
    id: "done",
    title: "Done",
    accentColor: "bg-emerald-500",
    colBg: "bg-emerald-50/40",
    border: "border-emerald-200/60",
    headerText: "text-emerald-800",
    badgeBg: "bg-emerald-100 text-emerald-700",
    emptyIcon: "text-emerald-200",
  },
];

const PRIORITY_CONFIG: Record<string, { bar: string; badge: string; label: string }> = {
  urgent: { bar: "bg-rose-500",   badge: "bg-rose-100 text-rose-700 border-rose-200",   label: "Urgent"  },
  high:   { bar: "bg-amber-500",  badge: "bg-amber-100 text-amber-700 border-amber-200", label: "High"    },
  medium: { bar: "bg-blue-400",   badge: "bg-blue-100 text-blue-700 border-blue-200",    label: "Medium"  },
  low:    { bar: "bg-slate-300",  badge: "bg-slate-100 text-slate-600 border-slate-200", label: "Low"     },
};

function getInitials(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function AvatarStack({ contributors = [] }: { contributors?: Task["contributors"] }) {
  if (!contributors || contributors.length === 0) return null;
  const sorted = [...contributors].sort((a, b) => (a.isCurrentActive === b.isCurrentActive ? 0 : a.isCurrentActive ? -1 : 1));
  const displayed = sorted.slice(0, 3);
  const remaining = sorted.length - displayed.length;

  return (
    <div className="flex items-center -space-x-1.5">
      {displayed.map((c) => (
        <div
          key={c.developerId}
          title={`${c.name} — ${c.role}${c.isCurrentActive ? " (active)" : ""} · ${c.individualProgress}%`}
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white border-[1.5px] border-white shadow-sm flex-shrink-0 ${
            c.isCurrentActive ? "bg-blue-500" : "bg-slate-400"
          }`}
        >
          {getInitials(c.name)}
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-5 h-5 rounded-full bg-slate-200 border-[1.5px] border-white flex items-center justify-center text-[8px] font-bold text-slate-600 shadow-sm">
          +{remaining}
        </div>
      )}
    </div>
  );
}

export function KanbanBoard({ tasks, onEdit, onPreview, onRefresh }: KanbanBoardProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [draggedOverCol, setDraggedOverCol] = useState<string | null>(null);
  const [columnLimits, setColumnLimits] = useState<Record<string, number>>({
    todo: 10, in_progress: 10, review: 10, done: 10,
  });

  async function handleToggleArchive(task: Task) {
    const isArchived = task.isArchived === 1 || task.isArchived === true;
    setUpdatingId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: isArchived ? 0 : 1 }),
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error("Failed to toggle archive", err);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleMove(task: Task, direction: "left" | "right") {
    const order = ["todo", "in_progress", "review", "done"];
    const idx = order.indexOf(task.status);
    const nextIdx = direction === "left" ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= order.length) return;
    const nextStatus = order[nextIdx];

    const progressMap: Record<string, number> = { todo: 0, review: 90, done: 100 };
    const nextProgress =
      nextStatus === "in_progress"
        ? Math.min(task.progress || 0, 89)
        : progressMap[nextStatus] ?? task.progress;

    setUpdatingId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, progress: nextProgress }),
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdatingId(null);
    }
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDraggedOverCol(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    const progressMap: Record<string, number> = { todo: 0, review: 90, done: 100 };
    const nextProgress =
      targetStatus === "in_progress"
        ? Math.min(task.progress || 0, 89)
        : progressMap[targetStatus] ?? task.progress;

    setUpdatingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, progress: nextProgress }),
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div
      className="flex flex-row gap-3 w-full overflow-x-auto overflow-y-hidden pb-1 select-none"
      style={{ height: "calc(100vh - 210px)" }}
    >
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        const limit = columnLimits[col.id] || 10;
        const visibleTasks = colTasks.slice(0, limit);
        const isOver = draggedOverCol === col.id;

        return (
          <div
            key={col.id}
            className={`flex flex-col rounded-2xl border min-w-[272px] flex-1 max-h-full transition-all duration-200 ${
              isOver
                ? "border-blue-400 border-dashed bg-blue-50/60 shadow-lg shadow-blue-100/40"
                : `${col.border} ${col.colBg}`
            }`}
            onDragOver={(e) => { e.preventDefault(); if (draggedOverCol !== col.id) setDraggedOverCol(col.id); }}
            onDragLeave={() => setDraggedOverCol(null)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column accent bar */}
            <div className={`${col.accentColor} h-1 rounded-t-2xl flex-shrink-0`} />

            {/* Column Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 flex-shrink-0">
              <span className={`text-xs font-bold uppercase tracking-widest ${col.headerText}`}>
                {col.title}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}>
                {colTasks.length}
              </span>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-2 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {colTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-28 rounded-xl border border-dashed border-slate-200 bg-white/50">
                  <p className="text-xs text-slate-400 font-medium">No tasks here</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">Drag & drop to add</p>
                </div>
              ) : (
                <>
                  {visibleTasks.map((task) => {
                    const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
                    const isArchived = task.isArchived === 1 || task.isArchived === true;
                    const isUpdating = updatingId === task.id;

                    return (
                      <Card
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => onPreview(task)}
                        className={`border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer group relative overflow-hidden hover:-translate-y-0.5 ${
                          isUpdating ? "opacity-50 pointer-events-none" : ""
                        } ${isArchived ? "opacity-60" : ""}`}
                      >
                        {/* Priority accent */}
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${p.bar} rounded-l-xl`} />

                        <CardContent className="pl-4 pr-2.5 pt-2 pb-2">
                          {/* Top row: code + epic + screenshot + priority */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              {task.taskCode && (
                                <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                  {task.taskCode}
                                </span>
                              )}
                              {task.epic && (
                                <span className="text-[9px] font-extrabold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/50 flex-shrink-0">
                                  {task.epic}
                                </span>
                              )}
                              <span
                                title={task.screenshotUrl ? "Has screenshot" : "No screenshot"}
                                className={`inline-flex items-center p-0.5 rounded flex-shrink-0 ${
                                  task.screenshotUrl ? "text-emerald-500" : "text-slate-300"
                                }`}
                              >
                                <Image className="w-3 h-3" />
                              </span>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase flex-shrink-0 ${p.badge}`}>
                              {p.label}
                            </span>
                          </div>

                          {/* Title */}
                          <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2 mb-1">
                            {task.title}
                          </p>

                          {/* Feature subtitle */}
                          {task.feature && (
                            <p className="text-[10px] text-slate-400 truncate mb-1 font-medium leading-none">
                              {task.feature}
                            </p>
                          )}

                          {/* Blocker */}
                          {task.blocker && (
                            <div className="flex items-start gap-1 bg-red-50 border border-red-100 rounded-md px-1.5 py-1 mb-1">
                              <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-px" />
                              <span className="text-[9px] text-red-600 font-medium line-clamp-2 leading-tight">
                                {task.blocker}
                              </span>
                            </div>
                          )}

                          {/* Progress bar */}
                          {(task.status === "in_progress" || task.status === "review") && typeof task.progress === "number" && (
                            <div className="mb-1">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[9px] text-slate-400 font-semibold">Progress</span>
                                <span className="text-[9px] text-slate-600 font-bold">{task.progress}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                <div
                                  className={`h-1 rounded-full transition-all duration-500 ${p.bar}`}
                                  style={{ width: `${task.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
                            <AvatarStack contributors={task.contributors} />

                            {/* Actions - shown on hover */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              <button
                                className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                                title="Edit"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                              <button
                                className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                onClick={(e) => { e.stopPropagation(); handleToggleArchive(task); }}
                                title={isArchived ? "Restore" : "Archive"}
                              >
                                {isArchived
                                  ? <ArchiveRestore className="w-2.5 h-2.5 text-amber-500" />
                                  : <Archive className="w-2.5 h-2.5" />
                                }
                              </button>
                              <button
                                disabled={task.status === "todo"}
                                className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                onClick={(e) => { e.stopPropagation(); handleMove(task, "left"); }}
                                title="Move Left"
                              >
                                <ArrowLeft className="w-2.5 h-2.5" />
                              </button>
                              <button
                                disabled={task.status === "done"}
                                className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                onClick={(e) => { e.stopPropagation(); handleMove(task, "right"); }}
                                title="Move Right"
                              >
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {colTasks.length > limit && (
                    <button
                      className="w-full text-[11px] font-bold text-blue-600 hover:text-blue-700 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-200 transition-colors"
                      onClick={() => setColumnLimits((p) => ({ ...p, [col.id]: colTasks.length }))}
                    >
                      Load {colTasks.length - limit} more…
                    </button>
                  )}
                  {limit > 10 && colTasks.length > 10 && (
                    <button
                      className="w-full text-[11px] font-medium text-slate-500 hover:text-slate-700 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                      onClick={() => setColumnLimits((p) => ({ ...p, [col.id]: 10 }))}
                    >
                      Show less
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
