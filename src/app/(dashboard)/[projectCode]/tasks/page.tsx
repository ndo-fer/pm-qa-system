/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Plus, Pencil, Trash2, LayoutGrid, List, RefreshCw, HardDrive, Archive, Image } from "lucide-react";
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

  return (
    <AppLayout className="px-4 py-2.5 h-full flex flex-col overflow-hidden">
      <div className="space-y-2 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold">Tasks</h1>
            <span className="text-xs text-slate-500 font-medium">{tasks.length} total</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md p-0.5 bg-slate-100 mr-2">
              <Button
                variant={viewMode === "board" ? "secondary" : "ghost"}
                size="sm"
                className={`h-7 px-3 text-xs font-medium transition-all ${
                  viewMode === "board" ? "bg-white shadow-sm font-semibold" : ""
                }`}
                onClick={() => setViewMode("board")}
              >
                <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                Board View
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className={`h-7 px-3 text-xs font-medium transition-all ${
                  viewMode === "list" ? "bg-white shadow-sm font-semibold" : ""
                }`}
                onClick={() => setViewMode("list")}
              >
                <List className="w-3.5 h-3.5 mr-1.5" />
                List View
              </Button>
            </div>
            <ExportButton data={filteredTasks} filename="tasks_list" size="sm" />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={syncing}
                onClick={handleSyncSheets}
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-7 text-xs py-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Sheets"}
              </Button>
              {lastSyncedAt && (
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  Last synced: {lastSyncedAt}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={syncingDrive}
              onClick={handleSyncDrive}
              className="text-violet-700 border-violet-200 hover:bg-violet-50 hover:text-violet-800 h-7 text-xs py-1"
            >
              <HardDrive className={`w-3.5 h-3.5 mr-1.5 ${syncingDrive ? "animate-pulse" : ""}`} />
              {syncingDrive ? "Syncing..." : "Sync Drive Photos"}
            </Button>
            <Button size="sm" className="h-7 text-xs py-1" onClick={() => { setEditingTask(null); setFormOpen(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Task
            </Button>
          </div>
        </div>

        {/* Module Summary */}
        <div className="flex flex-row gap-2 overflow-x-auto pb-2 flex-nowrap flex-shrink-0 scrollbar-thin select-none">
          {moduleSummary.map((s, index) => (
            <button
              key={s.name}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() => {
                if (filterEpic === s.name) {
                  // deselect
                  setFilterEpic("");
                } else {
                  // select epic and clear conflicting filters
                  setFilterEpic(s.name);
                  setFilterPhase("");
                  setFilterStatus("");
                  setFilterPriority("");
                }
              }}
              title={moduleFullNames[s.name] || s.name}
              className={`h-14 w-28 hover:w-36 flex-shrink-0 rounded-xl border text-left px-3 py-2 transition-all duration-300 ease-in-out flex flex-col justify-between cursor-grab active:cursor-grabbing group ${
                filterEpic === s.name 
                  ? "bg-blue-600 border-blue-600 text-white font-bold shadow-md shadow-blue-500/25 scale-[1.01]" 
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-350"
              } ${
                draggedIndex === index ? "opacity-40 border-dashed border-slate-400 bg-slate-100" : ""
              } ${
                dragOverIndex === index && draggedIndex !== index ? "border-blue-500 border-2 bg-blue-50/30 scale-95" : ""
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[15px] uppercase font-black tracking-wider truncate mr-1 group-hover:text-[16px] transition-all duration-200" title={s.name}>{s.name}</span>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  filterEpic === s.name 
                    ? "bg-blue-700 text-white" 
                    : "bg-slate-100 text-slate-650"
                }`}>
                  {s.total}
                </span>
              </div>
              {/* Normal state info (Done / Total) */}
              <div className="flex items-center justify-between w-full group-hover:hidden transition-all duration-200">
                <span className={`text-[9px] font-semibold leading-none ${filterEpic === s.name ? "text-blue-100" : "text-slate-500"}`}>
                  {s.done}/{s.total} done
                </span>
                {/* Micro progress line */}
                <div className={`w-8 rounded-full h-1 overflow-hidden ${
                  filterEpic === s.name ? "bg-blue-700/80" : "bg-slate-100"
                }`}>
                  <div 
                    className={`h-1 rounded-full ${filterEpic === s.name ? "bg-white" : "bg-blue-600"}`}
                    style={{ width: `${s.total > 0 ? (s.done / s.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {/* Hover state info (Full Name) */}
              <div className="hidden group-hover:flex items-center justify-between w-full transition-all duration-200">
                <span className={`text-[10px] font-bold truncate leading-none ${
                  filterEpic === s.name ? "text-blue-100" : "text-blue-600"
                }`}>
                  {moduleFullNames[s.name] || s.name}
                </span>
              </div>
            </button>
          ))}
          {/* Add Module Button */}
          <button
            onClick={() => {
              setAddModuleError("");
              setNewModuleName("");
              setAddModuleOpen(true);
            }}
            className="h-14 w-28 flex-shrink-0 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all flex flex-col items-center justify-center gap-1 font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Modul</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <Input
            type="search"
            placeholder="Search title, code, feature..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-60 h-8 text-xs px-2.5"
          />
          <Button
            variant={showArchived ? "default" : "outline"}
            className="h-8 text-xs font-semibold px-2.5"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>
          <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" || v === null ? "" : v)}>
            <SelectTrigger className="w-36 h-8 text-xs px-2.5">
              <span className="text-slate-500 font-semibold mr-1">Status:</span>
              <span data-slot="select-value" className="text-left font-medium">{currentStatusLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority || "all"} onValueChange={(v) => setFilterPriority(v === "all" || v === null ? "" : v)}>
            <SelectTrigger className="w-36 h-8 text-xs px-2.5">
              <span className="text-slate-500 font-semibold mr-1">Priority:</span>
              <span data-slot="select-value" className="text-left font-medium">{currentPriorityLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPhase || "all"} onValueChange={(v) => setFilterPhase(v === "all" || v === null ? "" : v)}>
            <SelectTrigger className="w-36 h-8 text-xs px-2.5">
              <span className="text-slate-500 font-semibold mr-1">Phase:</span>
              <span data-slot="select-value" className="text-left font-medium">{currentPhaseLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {phases.sort().map((phase) => (
                <SelectItem key={phase} value={phase}>{phase}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterErpRole || "all"} onValueChange={(v) => setFilterErpRole(v === "all" || v === null ? "" : v)}>
            <SelectTrigger className="w-36 h-8 text-xs px-2.5">
              <span className="text-slate-500 font-semibold mr-1">ERP Role:</span>
              <span data-slot="select-value" className="text-left font-medium">{filterErpRole || "All"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="all_roles">All Roles</SelectItem>
              <SelectItem value="administrator">Administrator</SelectItem>
              <SelectItem value="top_user">Top User</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAssignee || "all"} onValueChange={(v) => setFilterAssignee(v === "all" || v === null ? "" : v)}>
            <SelectTrigger className="w-40 h-8 text-xs px-2.5">
              <span className="text-slate-500 font-semibold mr-1">Assignee:</span>
              <span data-slot="select-value" className="text-left font-medium">
                {filterAssignee === "unassigned"
                  ? "Unassigned"
                  : filterAssignee
                  ? (users.find((u) => u.id === filterAssignee)?.name || "Selected")
                  : "All"}
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
            <SelectTrigger className="w-44 h-8 text-xs px-2.5">
              <span className="text-slate-500 font-semibold mr-1">Screenshot:</span>
              <span data-slot="select-value" className="text-left font-medium">
                {filterScreenshot === "yes" ? "Has Screenshot" : filterScreenshot === "no" ? "Missing Screenshot" : "All"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="yes">Has Screenshot</SelectItem>
              <SelectItem value="no">Missing Screenshot</SelectItem>
            </SelectContent>
          </Select>
          {(filterEpic || filterPhase || filterStatus || filterPriority || filterAssignee || searchQuery || filterScreenshot !== "all") && (
            <Button
              variant="outline"
              className="h-8 text-xs border-dashed px-2.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
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
              Clear Filters ×
            </Button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden min-h-0">
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
            <div className="border rounded-lg bg-white h-full overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-28">ID</TableHead>
                    <TableHead>Modul</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Loading tasks...</TableCell></TableRow>
                  ) : filteredTasks.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">No tasks found</TableCell></TableRow>
                  ) : (                    filteredTasks.map((task) => (
                      <TableRow 
                        key={task.id} 
                        className="hover:bg-slate-50/75 cursor-pointer transition-colors duration-100"
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
                        <TableCell><Badge variant="secondary" className="font-semibold">{task.epic || "-"}</Badge></TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm font-semibold text-slate-800 truncate">{task.title}</p>
                            {task.feature && <p className="text-xs text-slate-400 truncate">{task.feature}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColors[task.status] || "secondary"} className="font-semibold">
                            {statusLabels[task.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={priorityColors[task.priority] || "secondary"} className="capitalize font-semibold">
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-500">{task.phase || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => { e.stopPropagation(); setEditingTask(task); setFormOpen(true); }}
                            >
                              <Pencil className="w-4 h-4 text-slate-500 hover:text-slate-800" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => { e.stopPropagation(); handleToggleArchive(task); }}
                              title={task.isArchived ? "Restore Task" : "Archive Task"}
                            >
                              <Archive className={`w-4 h-4 ${task.isArchived ? "text-amber-500" : "text-slate-500 hover:text-amber-605"}`} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                            >
                              <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-650" />
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
