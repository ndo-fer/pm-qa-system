"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, ArrowLeft, ArrowRight, AlertTriangle, Archive, ArchiveRestore } from "lucide-react";

interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  taskCode: string | null;
  epic: string | null;
  feature: string | null;
  phase: string | null;
  progress: number;
  blocker: string | null;
  isArchived?: number | boolean | null;
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
    bg: "bg-slate-50/70", 
    border: "border-slate-200", 
    text: "text-slate-800",
    headerBg: "bg-slate-100",
    borderTop: "border-t-4 border-t-slate-500",
    badgeBg: "bg-slate-200 text-slate-800"
  },
  { 
    id: "in_progress", 
    title: "In Progress", 
    bg: "bg-sky-50/40", 
    border: "border-sky-100", 
    text: "text-sky-900",
    headerBg: "bg-sky-100/70",
    borderTop: "border-t-4 border-t-sky-500",
    badgeBg: "bg-sky-200 text-sky-800"
  },
  { 
    id: "review", 
    title: "Review", 
    bg: "bg-amber-50/40", 
    border: "border-amber-100", 
    text: "text-amber-900",
    headerBg: "bg-amber-100/70",
    borderTop: "border-t-4 border-t-amber-500",
    badgeBg: "bg-amber-200 text-amber-800"
  },
  { 
    id: "done", 
    title: "Done", 
    bg: "bg-emerald-50/40", 
    border: "border-emerald-100", 
    text: "text-emerald-900",
    headerBg: "bg-emerald-100/70",
    borderTop: "border-t-4 border-t-emerald-500",
    badgeBg: "bg-emerald-200 text-emerald-850"
  },
];

export function KanbanBoard({ tasks, onEdit, onPreview, onRefresh }: KanbanBoardProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [draggedOverCol, setDraggedOverCol] = useState<string | null>(null);
  const [columnLimits, setColumnLimits] = useState<Record<string, number>>({
    todo: 10,
    in_progress: 10,
    review: 10,
    done: 10,
  });

  async function handleToggleArchive(task: Task) {
    const isTaskArchived = (task as any).isArchived === 1 || (task as any).isArchived === true;
    setUpdatingId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: isTaskArchived ? 0 : 1 }),
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to toggle archive", err);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleMove(task: Task, direction: "left" | "right") {
    const statusOrder = ["todo", "in_progress", "review", "done"];
    const currentIndex = statusOrder.indexOf(task.status);
    let nextIndex = currentIndex;

    if (direction === "left" && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    } else if (direction === "right" && currentIndex < statusOrder.length - 1) {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex === currentIndex) return;
    const nextStatus = statusOrder[nextIndex];

    let nextProgress = task.progress;
    if (nextStatus === "todo") {
      nextProgress = 0;
    } else if (nextStatus === "review") {
      nextProgress = 90;
    } else if (nextStatus === "done") {
      nextProgress = 100;
    } else if (nextStatus === "in_progress") {
      nextProgress = Math.min(task.progress || 0, 90);
    }

    setUpdatingId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, progress: nextProgress }),
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdatingId(null);
    }
  }

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (draggedOverCol !== colId) {
      setDraggedOverCol(colId);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDraggedOverCol(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    let nextProgress = task.progress;
    if (targetStatus === "todo") {
      nextProgress = 0;
    } else if (targetStatus === "review") {
      nextProgress = 90;
    } else if (targetStatus === "done") {
      nextProgress = 100;
    } else if (targetStatus === "in_progress") {
      nextProgress = Math.min(task.progress || 0, 90);
    }

    setUpdatingId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, progress: nextProgress }),
      });

      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-row gap-2.5 h-full w-full overflow-x-auto overflow-y-hidden pb-1 min-h-0 scrollbar-thin select-none">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        const limit = columnLimits[col.id] || 10;
        const visibleTasks = colTasks.slice(0, limit);
        const isHovered = draggedOverCol === col.id;

        return (
          <div 
            key={col.id} 
            className={`flex flex-col rounded-xl border-2 p-1.5 w-80 min-w-[280px] max-w-[360px] flex-1 max-h-full shadow-sm transition-all duration-200 ${
              isHovered 
                ? "bg-slate-100/95 border-blue-400 border-dashed ring-2 ring-blue-400/10 scale-[1.005]" 
                : `${col.border} ${col.bg}`
            } ${col.borderTop}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column Header */}
            <div className={`flex items-center justify-between p-1.5 rounded-t-lg ${col.headerBg} border-b border-slate-200/60 mb-2`}>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-xs uppercase tracking-wider ${col.text}`}>{col.title}</span>
                <Badge className={`font-mono text-[10px] font-bold ${col.badgeBg} border-none`}>{colTasks.length}</Badge>
              </div>
            </div>

            {/* Tasks Container */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin min-h-0 pb-2">
              {colTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-20 border border-dashed rounded-lg bg-white/50 text-slate-400 text-xs">
                  No tasks here
                </div>
              ) : (
                <>
                  {visibleTasks.map((task) => (
                    <Card 
                      key={task.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => onPreview(task)}
                      className={`shadow-sm border-slate-200/80 hover:border-slate-350 hover:shadow-md transition-all bg-white group relative overflow-hidden cursor-pointer hover:scale-[1.01] active:scale-[0.99] duration-150 ${
                        updatingId === task.id ? "opacity-50 pointer-events-none" : ""
                      } ${
                        task.priority === "urgent" ? "border-l-[3px] border-l-rose-500 shadow-rose-50/10" :
                        task.priority === "high" ? "border-l-[3px] border-l-amber-500 shadow-amber-50/10" :
                        task.priority === "medium" ? "border-l-[3px] border-l-sky-500 shadow-sky-50/10" :
                        "border-l-[3px] border-l-slate-300"
                      }`}
                    >
                      <CardContent className="p-2 space-y-1.5">
                        {/* Compact Header: Code, Epic, Priority */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            {task.taskCode && (
                              <span className="font-mono text-[9px] text-slate-500 font-extrabold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/30">
                                {task.taskCode}
                              </span>
                            )}
                            <span className="text-[9px] font-extrabold text-blue-700 uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/30">
                              {task.epic || "-"}
                            </span>
                          </div>
                          <Badge 
                            variant="outline"
                            className={`text-[9px] uppercase font-extrabold px-1.5 py-0 border-none rounded-sm ${
                              task.priority === "urgent" ? "bg-red-100 text-red-700" :
                              task.priority === "high" ? "bg-amber-100 text-amber-800" :
                              task.priority === "medium" ? "bg-blue-100 text-blue-700" :
                              "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {task.priority}
                          </Badge>
                        </div>

                        {/* Title */}
                        <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                          {task.title}
                        </p>

                        {/* Blocker Alert */}
                        {task.blocker && (
                          <div className="flex items-start gap-1 text-[9px] text-red-600 bg-red-50 p-1.5 rounded border border-red-100/60 font-medium">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5 text-red-500" />
                            <span className="line-clamp-2">Blocker: {task.blocker}</span>
                          </div>
                        )}

                        {/* Progress Bar (if In Progress or Review) */}
                        {(task.status === "in_progress" || task.status === "review") && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                              <span>Progress</span>
                              <span>{task.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1">
                              <div 
                                className="bg-blue-600 h-1 rounded-full transition-all" 
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Compact Footer Actions */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                          {task.feature ? (
                            <span className="text-[10px] text-slate-400 truncate max-w-[130px] font-medium" title={task.feature}>
                              {task.feature}
                            </span>
                          ) : (
                            <span />
                          )}
                          
                          <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-5 h-5 rounded hover:bg-slate-100"
                              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                              title="Edit Task"
                            >
                              <Pencil className="w-3 h-3 text-slate-500 hover:text-slate-800" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-5 h-5 rounded hover:bg-slate-100"
                              onClick={(e) => { e.stopPropagation(); handleToggleArchive(task); }}
                              title={(task as any).isArchived === 1 || (task as any).isArchived === true ? "Restore Task" : "Archive Task"}
                            >
                              {((task as any).isArchived === 1 || (task as any).isArchived === true) ? (
                                <ArchiveRestore className="w-3 h-3 text-amber-600 hover:text-amber-800" />
                              ) : (
                                <Archive className="w-3 h-3 text-slate-500 hover:text-slate-800" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-5 h-5 rounded hover:bg-slate-100"
                              disabled={task.status === "todo"}
                              onClick={(e) => { e.stopPropagation(); handleMove(task, "left"); }}
                              title="Move Left"
                            >
                              <ArrowLeft className="w-3 h-3 text-slate-500" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-5 h-5 rounded hover:bg-slate-100"
                              disabled={task.status === "done"}
                              onClick={(e) => { e.stopPropagation(); handleMove(task, "right"); }}
                              title="Move Right"
                            >
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Column Pagination Controls */}
                  {colTasks.length > limit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[11px] font-extrabold text-blue-600 hover:text-blue-700 py-2 mt-2 bg-blue-50/20 hover:bg-blue-50/50 border-dashed border-blue-200"
                      onClick={() => setColumnLimits(prev => ({ ...prev, [col.id]: colTasks.length }))}
                    >
                      Load More (+{colTasks.length - limit} tasks)
                    </Button>
                  )}
                  {limit > 10 && colTasks.length > 10 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-[11px] font-extrabold text-slate-500 hover:text-slate-700 py-1.5 hover:bg-slate-100 mt-2 border border-slate-200/40 rounded-lg"
                      onClick={() => setColumnLimits(prev => ({ ...prev, [col.id]: 10 }))}
                    >
                      Show Less (Collapse)
                    </Button>
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
