/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { TaskForm } from "@/components/tasks/task-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskPreviewModal } from "@/components/tasks/task-preview-modal";
import { Plus, Pencil, Trash2, LayoutGrid, List, RefreshCw, HardDrive, Archive, Image, SearchX, ClipboardList } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { Input } from "@/components/ui/input";

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
  taskType?: string | null;
  srdRef?: string | null;
  frCode?: string | null;
  acceptanceCriteria?: string | null;
  sprintTarget?: string | null;
  screenshotUrl?: string | null;
  isArchived?: number | boolean | null;
  erpRole?: string | null;
}

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface Milestone {
  id: string;
  phase: string;
  name: string;
}

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  todo: "secondary",
  in_progress: "default",
  review: "secondary",
  done: "default",
};

const priorityColors: Record<string, "default" | "secondary" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
  urgent: "destructive",
};

const priorityLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const moduleFullNames: Record<string, string> = {
  MST: "Master Data",
  INV: "Inventory",
  PUR: "Purchasing",
  SLS: "Sales",
  PRD: "Production",
  AP: "Accounts Payable",
  AR: "Accounts Receivable",
  FIN: "Finance",
  GL: "General Ledger",
  RPT: "Reporting",
  ADM: "Administration",
  BUG: "Bugs & Defects",
};

export default function TasksPage() {
  const { data: session } = useSession();
  const params = useParams();
  const projectCode = params?.projectCode as string;
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [milestoneList, setMilestoneList] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  const [modules, setModules] = useState<string[]>([
    "MST", "INV", "PUR", "SLS", "PRD", "AP", "AR", "FIN", "GL", "RPT", "ADM", "BUG"
  ]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterEpic, setFilterEpic] = useState("");
  const [filterScreenshot, setFilterScreenshot] = useState("all");

  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [newModuleName, setNewModuleName] = useState("");
  const [addModuleError, setAddModuleError] = useState("");
  const [filterPhase, setFilterPhase] = useState("");
  const [filterErpRole, setFilterErpRole] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "board">("board");
  const [syncing, setSyncing] = useState(false);
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  // Drag and Drop state for modules
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Module chips scroll state
  const chipsRef = useRef<HTMLDivElement>(null);
  const [chipsCanScrollLeft, setChipsCanScrollLeft] = useState(false);
  const [chipsCanScrollRight, setChipsCanScrollRight] = useState(true);

  const handleChipsScroll = () => {
    const el = chipsRef.current;
    if (!el) return;
    setChipsCanScrollLeft(el.scrollLeft > 4);
    setChipsCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  // Set default filter to current logged-in developer
  useEffect(() => {
    if (session?.user) {
      const userRole = (session.user as { role?: string }).role;
      const userId = (session.user as { id?: string }).id;
      if (userRole === "developer" && userId) {
        setFilterAssignee(userId);
      }
    }
  }, [session]);

  const currentStatusLabel = statusLabels[filterStatus] || "All";
  const currentPriorityLabel = priorityLabels[filterPriority] || "All";
  const currentPhaseLabel = filterPhase || "All";

  async function handleSyncSheets() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "all" }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastSyncedAt(new Date().toLocaleTimeString());
        alert(`Google Sheets sync success!\nScope: ${data.scope}\nDatabase tasks: ${data.dbCount}\nSheets rows processed: ${data.sheetCount}\nTest Plans: ${data.testPlansCount}\nTest Cases: ${data.testCasesCount}`);
        fetchData();
      } else {
        alert(`Sync error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to sync with Google Sheets");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncDrive() {
    setSyncingDrive(true);
    try {
      const res = await fetch("/api/drive/sync");
      const data = await res.json();
      if (res.ok) {
        alert(`Drive photos sync complete!\nFiles found: ${data.totalFiles}\nTasks matched: ${data.tasksMatched}`);
        fetchData();
      } else {
        alert(`Drive sync error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to sync with Google Drive");
    } finally {
      setSyncingDrive(false);
    }
  }

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const fetchData = useCallback(async () => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    if (filterErpRole) queryParams.set("erpRole", filterErpRole);
    if (projectCode) queryParams.set("projectCode", projectCode);
    
    const [tasksRes, projectsRes, usersRes, milestonesRes] = await Promise.all([
      fetch(`/api/tasks?${queryParams.toString()}`),
      fetch("/api/projects"),
      fetch("/api/users"),
      fetch(`/api/milestones?projectCode=${projectCode}`),
    ]);
    if (tasksRes.ok) setTasks(await tasksRes.json());
    if (projectsRes.ok) setProjects(await projectsRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    if (milestonesRes.ok) setMilestoneList(await milestonesRes.json());
    setLoading(false);
  }, [filterErpRole, projectCode]);

  useEffect(() => {
    fetchData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const phaseParam = params.get("phase");
      if (phaseParam) {
        setFilterPhase(phaseParam);
      }
      const epicParam = params.get("epic");
      if (epicParam) {
        setFilterEpic(epicParam);
      }
      const statusParam = params.get("status");
      if (statusParam) {
        setFilterStatus(statusParam);
      }

      // Load modules order
      const stored = localStorage.getItem(`modules_order_${projectCode}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const defaultModules = ["MST", "INV", "PUR", "SLS", "PRD", "AP", "AR", "FIN", "GL", "RPT", "ADM", "BUG"];
            const merged = [...parsed];
            defaultModules.forEach((m) => {
              if (!merged.includes(m)) {
                merged.push(m);
              }
            });
            setModules(merged);
          }
        } catch (e) {
          console.error("Failed to parse modules order from localStorage", e);
        }
      }
    }
  }, [fetchData, projectCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (tasks.length > 0) {
      const taskIdParam = searchParams.get("taskId");
      if (taskIdParam) {
        const taskToPreview = tasks.find((t) => t.id === taskIdParam);
        if (taskToPreview) {
          setPreviewTask(taskToPreview);
          setPreviewOpen(true);
          
          // Clear query parameter from the URL to prevent reopening on reload
          const cleanUrl = window.location.pathname;
          window.history.replaceState({ path: cleanUrl }, "", cleanUrl);
        }
      }
    }
  }, [searchParams, tasks]);

  // Database data is fetched scoping to the selected project
  async function handleDelete(id: string) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleToggleArchive(task: Task) {
    const isTaskArchived = task.isArchived === 1 || task.isArchived === true;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: isTaskArchived ? 0 : 1 }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to toggle archive", err);
    }
  }

  const filteredTasks = tasks.filter((t) => {
    const isTaskArchived = t.isArchived === 1 || t.isArchived === true;
    if (!showArchived && isTaskArchived) return false;

    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterEpic && t.epic !== filterEpic) return false;
    if (filterScreenshot === "yes" && !t.screenshotUrl) return false;
    if (filterScreenshot === "no" && t.screenshotUrl) return false;
    if (filterPhase && t.phase !== filterPhase) return false;
    if (filterErpRole && t.erpRole !== filterErpRole) return false;
    if (filterAssignee) {
      if (filterAssignee === "unassigned") {
        if (t.assigneeId !== null && t.assigneeId !== "") return false;
      } else {
        if (t.assigneeId !== filterAssignee) return false;
      }
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = t.title?.toLowerCase().includes(query);
      const codeMatch = t.taskCode?.toLowerCase().includes(query);
      const featureMatch = t.feature?.toLowerCase().includes(query);
      if (!titleMatch && !codeMatch && !featureMatch) return false;
    }
    return true;
  });

  // Derive phases from milestones (authoritative source)
  const phases = milestoneList.length > 0
    ? milestoneList.map((m) => m.phase).filter(Boolean)
    : Array.from(new Set(tasks.map((t) => t.phase).filter(Boolean))) as string[];


  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDragOverIndex(null);
      return;
    }

    const reorderedModules = [...modules];
    const [draggedItem] = reorderedModules.splice(draggedIndex, 1);
    reorderedModules.splice(targetIndex, 0, draggedItem);
    
    setModules(reorderedModules);
    localStorage.setItem(`modules_order_${projectCode}`, JSON.stringify(reorderedModules));
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Summary by module — only count non-archived tasks so chip numbers match the board
  const moduleSummary = modules.map((mod) => {
    const moduleTasks = tasks.filter((t) => {
      const archived = t.isArchived === 1 || t.isArchived === true;
      return t.epic === mod && !archived;
    });
    const done = moduleTasks.filter((t) => t.status === "done").length;
    const inProgress = moduleTasks.filter((t) => t.status === "in_progress").length;
    return { name: mod, total: moduleTasks.length, done, inProgress, todo: moduleTasks.length - done - inProgress };
  });

  // Per-epic color palette for module chips
  const moduleColors: Record<string, { bg: string; text: string; activeBg: string; activeText: string; ring: string; badge: string; badgeActive: string; progressBg: string }> = {
    MST: { bg: 'bg-amber-50 border-amber-200/80', text: 'text-amber-700', activeBg: 'bg-amber-600 border-amber-600', activeText: 'text-amber-100', ring: 'ring-amber-500/40', badge: 'bg-amber-100 text-amber-700', badgeActive: 'bg-amber-700 text-white', progressBg: 'bg-amber-500' },
    INV: { bg: 'bg-emerald-50 border-emerald-200/80', text: 'text-emerald-700', activeBg: 'bg-emerald-600 border-emerald-600', activeText: 'text-emerald-100', ring: 'ring-emerald-500/40', badge: 'bg-emerald-100 text-emerald-700', badgeActive: 'bg-emerald-700 text-white', progressBg: 'bg-emerald-500' },
    PUR: { bg: 'bg-violet-50 border-violet-200/80', text: 'text-violet-700', activeBg: 'bg-violet-600 border-violet-600', activeText: 'text-violet-100', ring: 'ring-violet-500/40', badge: 'bg-violet-100 text-violet-700', badgeActive: 'bg-violet-700 text-white', progressBg: 'bg-violet-500' },
    SLS: { bg: 'bg-sky-50 border-sky-200/80', text: 'text-sky-700', activeBg: 'bg-sky-600 border-sky-600', activeText: 'text-sky-100', ring: 'ring-sky-500/40', badge: 'bg-sky-100 text-sky-700', badgeActive: 'bg-sky-700 text-white', progressBg: 'bg-sky-500' },
    PRD: { bg: 'bg-orange-50 border-orange-200/80', text: 'text-orange-700', activeBg: 'bg-orange-600 border-orange-600', activeText: 'text-orange-100', ring: 'ring-orange-500/40', badge: 'bg-orange-100 text-orange-700', badgeActive: 'bg-orange-700 text-white', progressBg: 'bg-orange-500' },
    AP: { bg: 'bg-rose-50 border-rose-200/80', text: 'text-rose-700', activeBg: 'bg-rose-600 border-rose-600', activeText: 'text-rose-100', ring: 'ring-rose-500/40', badge: 'bg-rose-100 text-rose-700', badgeActive: 'bg-rose-700 text-white', progressBg: 'bg-rose-500' },
    AR: { bg: 'bg-teal-50 border-teal-200/80', text: 'text-teal-700', activeBg: 'bg-teal-600 border-teal-600', activeText: 'text-teal-100', ring: 'ring-teal-500/40', badge: 'bg-teal-100 text-teal-700', badgeActive: 'bg-teal-700 text-white', progressBg: 'bg-teal-500' },
    FIN: { bg: 'bg-indigo-50 border-indigo-200/80', text: 'text-indigo-700', activeBg: 'bg-indigo-600 border-indigo-600', activeText: 'text-indigo-100', ring: 'ring-indigo-500/40', badge: 'bg-indigo-100 text-indigo-700', badgeActive: 'bg-indigo-700 text-white', progressBg: 'bg-indigo-500' },
    GL: { bg: 'bg-cyan-50 border-cyan-200/80', text: 'text-cyan-700', activeBg: 'bg-cyan-600 border-cyan-600', activeText: 'text-cyan-100', ring: 'ring-cyan-500/40', badge: 'bg-cyan-100 text-cyan-700', badgeActive: 'bg-cyan-700 text-white', progressBg: 'bg-cyan-500' },
    RPT: { bg: 'bg-fuchsia-50 border-fuchsia-200/80', text: 'text-fuchsia-700', activeBg: 'bg-fuchsia-600 border-fuchsia-600', activeText: 'text-fuchsia-100', ring: 'ring-fuchsia-500/40', badge: 'bg-fuchsia-100 text-fuchsia-700', badgeActive: 'bg-fuchsia-700 text-white', progressBg: 'bg-fuchsia-500' },
    ADM: { bg: 'bg-slate-100 border-slate-300/80', text: 'text-slate-700', activeBg: 'bg-slate-600 border-slate-600', activeText: 'text-slate-100', ring: 'ring-slate-500/40', badge: 'bg-slate-200 text-slate-700', badgeActive: 'bg-slate-700 text-white', progressBg: 'bg-slate-500' },
    BUG: { bg: 'bg-red-50 border-red-200/80', text: 'text-red-700', activeBg: 'bg-red-600 border-red-600', activeText: 'text-red-100', ring: 'ring-red-500/40', badge: 'bg-red-100 text-red-700', badgeActive: 'bg-red-700 text-white', progressBg: 'bg-red-500' },
  };
  const defaultColor = { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700', activeBg: 'bg-blue-600 border-blue-600', activeText: 'text-blue-100', ring: 'ring-blue-500/40', badge: 'bg-slate-100 text-slate-600', badgeActive: 'bg-blue-700 text-white', progressBg: 'bg-blue-500' };

  // Derive current project name for subtitle
  const currentProject = projects.find((p) => p.id === projectCode);

  return (
    <AppLayout className="px-4 pt-3 pb-0">
      <div className="flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">Tasks</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {currentProject && (
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{currentProject.name}</span>
              )}
              {currentProject && <span className="text-slate-300 text-xs">·</span>}
              <span className="text-[11px] text-slate-500">
                <span className="font-bold text-slate-700">{filteredTasks.length}</span>
                <span className="text-slate-400"> / {tasks.length} tasks</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Toggle */}
            <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              <button
                className={`h-7 px-2.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                  viewMode === "board" ? "bg-white shadow-sm text-slate-900 border border-slate-200/80" : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setViewMode("board")}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Board
              </button>
              <button
                className={`h-7 px-2.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                  viewMode === "list" ? "bg-white shadow-sm text-slate-900 border border-slate-200/80" : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setViewMode("list")}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
            </div>

            <div className="w-px h-5 bg-slate-200" />

            {/* Sync buttons */}
            <button
              disabled={syncing}
              onClick={handleSyncSheets}
              className="h-7 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sheets"}
            </button>
            <button
              disabled={syncingDrive}
              onClick={handleSyncDrive}
              className="h-7 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 text-violet-600 hover:bg-violet-50 border border-transparent hover:border-violet-200 transition-all disabled:opacity-60"
            >
              <HardDrive className={`w-3.5 h-3.5 ${syncingDrive ? "animate-pulse" : ""}`} />
              {syncingDrive ? "Syncing…" : "Drive"}
            </button>

            <div className="w-px h-5 bg-slate-200" />

            <ExportButton data={filteredTasks} filename="tasks_list" size="sm" />

            <Button
              size="sm"
              className="h-7 text-xs font-bold px-3 bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/25"
              onClick={() => { setEditingTask(null); setFormOpen(true); }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Task
            </Button>
          </div>
        </div>

        {/* Module Chips + Filter — sticky at top when header scrolls away */}
        <div className="sticky top-0 z-20 -mx-4 bg-white border-b border-slate-100">
          <div className="relative px-4 py-2">
            {/* Left fade — shown when scrolled right */}
            <div className={`absolute left-4 top-0 bottom-0 w-12 bg-gradient-to-r from-white/95 to-transparent z-10 pointer-events-none transition-opacity duration-200 ${
              chipsCanScrollLeft ? "opacity-100" : "opacity-0"
            }`} />
            {/* Right fade — shown when more chips to the right */}
            <div className={`absolute right-4 top-0 bottom-0 w-12 bg-gradient-to-l from-white/95 to-transparent z-10 pointer-events-none transition-opacity duration-200 ${
              chipsCanScrollRight ? "opacity-100" : "opacity-0"
            }`} />

            {/* Scrollable chips row — scrollbar hidden */}
            <div
              ref={chipsRef}
              onScroll={handleChipsScroll}
              className="flex flex-row gap-1.5 overflow-x-auto flex-nowrap select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {moduleSummary.map((s, index) => {
                const colors = moduleColors[s.name] || defaultColor;
                const isActive = filterEpic === s.name;
                const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                return (
                  <button
                    key={s.name}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    onClick={() => {
                      if (filterEpic === s.name) {
                        setFilterEpic("");
                      } else {
                        setFilterEpic(s.name);
                        setFilterPhase("");
                        setFilterStatus("");
                        setFilterPriority("");
                      }
                    }}
                    title={`${moduleFullNames[s.name] || s.name} — ${s.done}/${s.total} done`}
                    className={`h-[58px] w-[108px] hover:w-[140px] flex-shrink-0 rounded-xl border text-left px-2.5 py-2 transition-all duration-300 ease-in-out flex flex-col justify-between cursor-grab active:cursor-grabbing group ${
                      isActive
                        ? `${colors.activeBg} shadow-md ring-2 ${colors.ring}`
                        : `${colors.bg} ${colors.text} hover:shadow-sm hover:scale-[1.01]`
                    } ${
                      draggedIndex === index ? "opacity-30 scale-95 border-dashed" : ""
                    } ${
                      dragOverIndex === index && draggedIndex !== index ? "ring-2 ring-blue-400/50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-sm font-black tracking-wider uppercase truncate flex-1 mr-1 ${
                        isActive ? "text-white" : colors.text
                      }`}>{s.name}</span>
                      <span className={`text-[11px] font-bold px-1.5 py-0 rounded ${
                        isActive ? colors.badgeActive : colors.badge
                      }`}>
                        {s.total}
                      </span>
                    </div>
                    {/* Normal state: show progress % — hidden on hover */}
                    <div className="w-full group-hover:hidden">
                      <div className={`w-full rounded-full h-1 overflow-hidden mb-0.5 ${
                        isActive ? "bg-white/25" : "bg-slate-200/60"
                      }`}>
                        <div
                          className={`h-1 rounded-full transition-all duration-500 ${isActive ? "bg-white" : colors.progressBg}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-semibold leading-none ${
                        isActive ? "text-white/70" : "text-slate-400"
                      }`}>{pct}% done</span>
                    </div>
                    {/* Hover state: show full module name */}
                    <div className="hidden group-hover:block w-full">
                      <span className={`text-[10px] font-bold leading-tight truncate block ${
                        isActive ? "text-white/90" : colors.text
                      }`}>
                        {moduleFullNames[s.name] || s.name}
                      </span>
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => { setAddModuleError(""); setNewModuleName(""); setAddModuleOpen(true); }}
                className="h-[58px] w-[90px] flex-shrink-0 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex flex-col items-center justify-center gap-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold">Add Module</span>
              </button>
            </div>
          </div>
        </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap bg-white/0 px-4 pt-2 pb-2 border-b border-slate-100">
          <Input
            type="search"
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-52 h-8 text-xs bg-white border-slate-200 focus-visible:ring-blue-500/30 rounded-lg"
          />
          <div className="w-px h-5 bg-slate-200" />
          <button
            className={`h-8 text-xs font-semibold px-3 rounded-lg border transition-all flex items-center gap-1.5 ${
              showArchived
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? "Hide Archived" : "Archived"}
          </button>
          <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus((v ?? "all") === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-32 h-8 text-xs bg-white border-slate-200">
              <span className="text-slate-400 font-medium mr-1">Status:</span>
              <span data-slot="select-value" className="text-left font-semibold text-slate-700">{currentStatusLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority || "all"} onValueChange={(v) => setFilterPriority((v ?? "all") === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-32 h-8 text-xs bg-white border-slate-200">
              <span className="text-slate-400 font-medium mr-1">Priority:</span>
              <span data-slot="select-value" className="text-left font-semibold text-slate-700">{currentPriorityLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPhase || "all"} onValueChange={(v) => setFilterPhase((v ?? "all") === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-28 h-8 text-xs bg-white border-slate-200">
              <span className="text-slate-400 font-medium mr-1">Phase:</span>
              <span data-slot="select-value" className="text-left font-semibold text-slate-700">{currentPhaseLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {phases.sort().map((phase) => (
                <SelectItem key={phase} value={phase}>{phase}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterErpRole || "all"} onValueChange={(v) => setFilterErpRole((v ?? "all") === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-28 h-8 text-xs bg-white border-slate-200">
              <span className="text-slate-400 font-medium mr-1">Role:</span>
              <span data-slot="select-value" className="text-left font-semibold text-slate-700">{filterErpRole || "All"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="all_roles">All Roles</SelectItem>
              <SelectItem value="administrator">Administrator</SelectItem>
              <SelectItem value="top_user">Top User</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAssignee || "all"} onValueChange={(v) => setFilterAssignee((v ?? "all") === "all" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-36 h-8 text-xs bg-white border-slate-200">
              <span className="text-slate-400 font-medium mr-1">Assignee:</span>
              <span data-slot="select-value" className="text-left font-semibold text-slate-700">
                {filterAssignee === "unassigned" ? "Unassigned" : filterAssignee ? (users.find((u) => u.id === filterAssignee)?.name || "Selected") : "All"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterScreenshot} onValueChange={(val) => setFilterScreenshot(val || "all")}>
            <SelectTrigger className="w-32 h-8 text-xs bg-white border-slate-200">
              <span className="text-slate-400 font-medium mr-1">Photo:</span>
              <span data-slot="select-value" className="text-left font-semibold text-slate-700">
                {filterScreenshot === "yes" ? "Has" : filterScreenshot === "no" ? "Missing" : "All"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="yes">Has Screenshot</SelectItem>
              <SelectItem value="no">Missing Screenshot</SelectItem>
            </SelectContent>
          </Select>
          {(filterEpic || filterPhase || filterStatus || filterPriority || filterAssignee || searchQuery || filterScreenshot !== "all") && (
            <>
              <div className="w-px h-6 bg-slate-200" />
            <button
              className="h-8 text-xs px-3 rounded-lg font-semibold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all flex items-center gap-1"
              onClick={() => {
                setFilterEpic("");
                setFilterPhase("");
                setFilterStatus("");
                setFilterPriority("");
                setFilterAssignee("");
                setSearchQuery("");
                setFilterScreenshot("all");
              }}
            >
              Clear ×
            </button>
            </>
          )}
          </div>
        </div>

        {/* Content Area */}
        <div className="pb-4">
          {viewMode === "board" ? (
            <KanbanBoard
              tasks={filteredTasks}
              onEdit={(task) => {
                setEditingTask(task);
                setFormOpen(true);
              }}
              onPreview={(task) => {
                setPreviewTask(task);
                setPreviewOpen(true);
              }}
              onRefresh={fetchData}
            />
          ) : (
            <div className="border border-slate-200 rounded-xl bg-white h-full overflow-y-auto shadow-sm">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-50/80 backdrop-blur-sm z-10 border-b border-slate-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-28 text-xs uppercase tracking-wider font-semibold text-slate-500">ID</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-slate-500">Module</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-slate-500">Title</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-slate-500">Status</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-slate-500">Priority</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-slate-500">Phase</TableHead>
                    <TableHead className="w-24 text-xs uppercase tracking-wider font-semibold text-slate-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                          <span className="text-sm text-slate-400 font-medium">Loading tasks...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20">
                        <div className="flex flex-col items-center gap-3 max-w-xs mx-auto">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                            {searchQuery ? (
                              <SearchX className="w-7 h-7 text-slate-400" />
                            ) : (
                              <ClipboardList className="w-7 h-7 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              {searchQuery ? "No matching tasks" : "No tasks found"}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {searchQuery
                                ? `No tasks match "${searchQuery}". Try adjusting your search.`
                                : "Try changing your filters or create a new task to get started."
                              }
                            </p>
                          </div>
                          {!searchQuery && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-1 text-xs"
                              onClick={() => { setEditingTask(null); setFormOpen(true); }}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1.5" />
                              Create Task
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow
                        key={task.id}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors duration-100 border-b border-slate-100 last:border-b-0"
                        onClick={() => {
                          setPreviewTask(task);
                          setPreviewOpen(true);
                        }}
                      >
                        <TableCell className="font-mono text-xs font-semibold text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <span>{task.taskCode || "-"}</span>
                            {task.screenshotUrl ? (
                              <span
                                title="Has screenshot references"
                                className="inline-flex items-center justify-center p-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200/30"
                              >
                                <Image className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span
                                title="Missing screenshot reference"
                                className="inline-flex items-center justify-center p-0.5 rounded bg-slate-50 text-slate-400 border border-slate-200/30"
                              >
                                <Image className="w-3.5 h-3.5 opacity-40" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="font-semibold text-[11px]">{task.epic || "-"}</Badge></TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                            {task.feature && <p className="text-xs text-slate-400 truncate mt-0.5">{task.feature}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColors[task.status] || "secondary"} className="font-semibold text-[11px]">
                            {statusLabels[task.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={priorityColors[task.priority] || "secondary"} className="capitalize font-semibold text-[11px]">
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-500">{task.phase || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); setEditingTask(task); setFormOpen(true); }}
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); handleToggleArchive(task); }}
                              title={task.isArchived ? "Restore Task" : "Archive Task"}
                            >
                              <Archive className={`w-3.5 h-3.5 ${task.isArchived ? "text-amber-500" : "text-slate-400 hover:text-amber-500"}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        projects={projects}
        users={users}
        onSuccess={fetchData}
        modules={modules}
        defaultEpic={filterEpic}
        defaultProjectCode={projectCode}
      />

      <TaskPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        task={previewTask}
        projects={projects}
        users={users}
        onEdit={(task) => {
          setEditingTask(task);
          setFormOpen(true);
        }}
        onRefresh={fetchData}
      />

      <Dialog open={addModuleOpen} onOpenChange={setAddModuleOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Tambah Modul Baru</DialogTitle>
            <DialogDescription>
              Masukkan kode modul baru (misalnya: TAX, HRD). Kode harus unik dan singkat.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Input
              value={newModuleName}
              onChange={(e) => {
                setNewModuleName(e.target.value.toUpperCase());
                setAddModuleError("");
              }}
              placeholder="Kode Modul (misal: HRD)"
              className="h-10 text-sm font-bold uppercase tracking-wider"
              maxLength={10}
            />
            {addModuleError && (
              <p className="text-xs text-red-650 font-bold">{addModuleError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAddModuleOpen(false)}>Batal</Button>
            <Button 
              type="button"
              onClick={() => {
                const cleaned = newModuleName.trim().toUpperCase();
                if (cleaned) {
                  if (modules.includes(cleaned)) {
                    setAddModuleError("Modul sudah ada!");
                  } else {
                    const newModules = [...modules, cleaned];
                    setModules(newModules);
                    localStorage.setItem(`modules_order_${projectCode}`, JSON.stringify(newModules));
                    setAddModuleOpen(false);
                    setNewModuleName("");
                    setAddModuleError("");
                  }
                } else {
                  setAddModuleError("Nama modul tidak boleh kosong.");
                }
              }}
            >
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
