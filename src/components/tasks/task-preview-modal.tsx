"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Database, 
  User, 
  Folder, 
  Calendar, 
  AlertTriangle, 
  CheckSquare, 
  Clock, 
  Settings, 
  Layers, 
  Pencil, 
  X,
  Target,
  Users,
  Activity,
  Send,
  Plus,
  ArrowRightLeft,
  Check
} from "lucide-react";
import { ScreenshotViewer } from "./screenshot-viewer";

interface Project {
  id: string;
  name: string;
}

interface UserType {
  id: string;
  name: string;
}

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

interface TaskActivityLog {
  id: string;
  taskId: string;
  triggeredById: string;
  targetUserId: string | null;
  activityType: "assign" | "progress_update" | "blocker_reported" | "handover_notice" | "blocker_notice";
  note: string | null;
  createdAt: string;
  actorName: string | null;
  targetUserName: string | null;
}

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
  taskType?: string | null;
  srdRef?: string | null;
  frCode?: string | null;
  acceptanceCriteria?: string | null;
  progress?: number;
  blocker?: string | null;
  sprintTarget?: string | null;
  phase?: string | null;
  screenshotUrl?: string | null;
  isArchived?: number | boolean | null;
  erpRole?: string | null;
  contributors?: Contributor[];
}

interface TaskPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  projects: Project[];
  users: UserType[];
  onEdit: (task: Task) => void;
  onRefresh?: () => void;
}

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

const statusColors: Record<string, string> = {
  todo: "bg-slate-100 text-slate-800 border-slate-200",
  in_progress: "bg-sky-100 text-sky-800 border-sky-200",
  review: "bg-amber-100 text-amber-800 border-amber-200",
  done: "bg-emerald-100 text-emerald-850 border-emerald-250",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-650",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-rose-100 text-rose-800 font-bold animate-pulse",
};

const erpRoleLabels: Record<string, string> = {
  all_roles: "All Roles",
  administrator: "Administrator",
  top_user: "Top User",
  user: "User",
};

export function TaskPreviewModal({
  open,
  onOpenChange,
  task: initialTask,
  projects,
  users,
  onEdit,
  onRefresh,
}: TaskPreviewModalProps) {
  const [task, setTask] = useState<Task | null>(initialTask);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [activities, setActivities] = useState<TaskActivityLog[]>([]);
  
  // Form states
  const [newContributorId, setNewContributorId] = useState("");
  const [handoverTargetId, setHandoverTargetId] = useState("");
  const [handoverType, setHandoverType] = useState<"handover_notice" | "blocker_notice">("handover_notice");
  const [handoverNote, setHandoverNote] = useState("");
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [editingContribId, setEditingContribId] = useState<string | null>(null);
  const [tempProgress, setTempProgress] = useState<number>(0);
  const [submittingContrib, setSubmittingContrib] = useState(false);
  const [submittingNotice, setSubmittingNotice] = useState(false);

  // Sync state with incoming prop task changes
  useEffect(() => {
    setTask(initialTask);
    if (initialTask) {
      setContributors(initialTask.contributors || []);
    }
  }, [initialTask]);

  const loadContributorsAndActivities = useCallback(async () => {
    const taskId = initialTask?.id;
    if (!taskId) return;
    setLoading(true);
    try {
      const [taskRes, actRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}`),
        fetch(`/api/tasks/${taskId}/activities`),
      ]);

      if (taskRes.ok) {
        const updatedTask = await taskRes.json();
        setTask(updatedTask);
        setContributors(updatedTask.contributors || []);
      }
      if (actRes.ok) {
        setActivities(await actRes.json());
      }
    } catch (err) {
      console.error("Failed to load task relations:", err);
    } finally {
      setLoading(false);
    }
  }, [initialTask?.id]);

  // Fetch logs and relations when the dialog opens
  useEffect(() => {
    if (open && initialTask?.id) {
      loadContributorsAndActivities();
    }
  }, [open, initialTask?.id, loadContributorsAndActivities]);

  if (!task) return null;

  const project = projects.find((p) => p.id === task.projectId);
  const assignee = users.find((u) => u.id === task.assigneeId);

  const handleEditClick = () => {
    onOpenChange(false);
    onEdit(task);
  };

  async function handleAddContributor() {
    if (!task || !newContributorId) return;
    setSubmittingContrib(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/contributors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developerId: newContributorId }),
      });
      if (res.ok) {
        setNewContributorId("");
        loadContributorsAndActivities();
        if (onRefresh) onRefresh();
      } else {
        const data = await res.json();
        alert(`Gagal menambah kontributor: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setSubmittingContrib(false);
    }
  }

  async function handleUpdateContribProgress(contrib: Contributor, progressVal: number) {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/contributors`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developerId: contrib.developerId, progress: progressVal }),
      });
      if (res.ok) {
        setEditingContribId(null);
        loadContributorsAndActivities();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSetActiveContributor(contrib: Contributor) {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/contributors`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developerId: contrib.developerId, isCurrentActive: true }),
      });
      if (res.ok) {
        loadContributorsAndActivities();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSendNotice() {
    if (!task || !handoverTargetId || !handoverNote) return;
    setSubmittingNotice(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: handoverTargetId,
          noticeType: handoverType,
          note: handoverNote,
        }),
      });
      if (res.ok) {
        setHandoverNote("");
        setHandoverTargetId("");
        loadContributorsAndActivities();
        if (onRefresh) onRefresh();
        alert("Notifikasi/Handover berhasil dikirim!");
      } else {
        const data = await res.json();
        alert(`Gagal mengirim notice: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal memproses notice.");
    } finally {
      setSubmittingNotice(false);
    }
  }

  // Get initials for letters/logos
  const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0 bg-slate-50 dark:bg-slate-900 border-slate-200 overflow-hidden">
        {/* Header Section */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {task.taskCode && (
              <span className="font-mono text-xs font-black bg-slate-150 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-2.5 py-0.5 rounded border border-slate-200/50">
                {task.taskCode}
              </span>
            )}
            {task.epic && (
              <Badge variant="outline" className="text-xs uppercase font-extrabold px-2.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                Modul: {task.epic}
              </Badge>
            )}
            <Badge className={`text-xs uppercase font-extrabold px-2.5 py-0.5 ${statusColors[task.status] || "bg-slate-100 text-slate-800"}`}>
              {statusLabels[task.status] || task.status}
            </Badge>
            <Badge className={`text-xs uppercase font-extrabold px-2.5 py-0.5 ${priorityColors[task.priority] || "bg-slate-100 text-slate-800"}`}>
              Priority: {task.priority}
            </Badge>
            {!!task.isArchived && (
              <Badge className="text-xs uppercase font-extrabold px-2.5 py-0.5 bg-amber-500 text-white border-none">
                Archived
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-snug">
            {task.title}
          </DialogTitle>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="font-medium">Target ERP Role:</span>
            <Badge variant="secondary" className="font-semibold text-[11px] py-0 px-2">
              {erpRoleLabels[task.erpRole || "all_roles"] || task.erpRole}
            </Badge>
          </div>
        </DialogHeader>

        {/* Content Section (Scrollable) */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Column 1: Left panel (Description, Criteria, History) - Takes 7/12 */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Blocker Banner */}
              {task.blocker && (
                <div className="flex items-start gap-3 text-sm text-red-805 bg-red-50/85 p-4 rounded-xl border border-red-150/60 font-medium shadow-sm animate-pulse">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                  <div className="space-y-1">
                    <span className="font-bold block uppercase text-xs tracking-wider text-red-900">Blocker Active</span>
                    <p className="text-sm text-red-800">{task.blocker}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">Description</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150/80 dark:border-slate-800/50 min-h-[120px] max-h-[300px] overflow-y-auto shadow-sm">
                  {task.description ? (
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {task.description}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">No description provided for this task.</p>
                  )}
                </div>
              </div>

              {/* Acceptance Criteria */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">Acceptance Criteria</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150/80 dark:border-slate-800/50 min-h-[100px] max-h-[300px] overflow-y-auto shadow-sm">
                  {task.acceptanceCriteria ? (
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {task.acceptanceCriteria}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">No acceptance criteria defined.</p>
                  )}
                </div>
              </div>

              {/* Activity Timeline (Logs) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">Activity Timeline</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150/80 dark:border-slate-800/50 min-h-[150px] max-h-[300px] overflow-y-auto shadow-sm space-y-3">
                  {activities.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">No activity logs recorded yet.</p>
                  ) : (
                    <div className="relative border-l border-slate-200 dark:border-slate-800 ml-2.5 pl-4 space-y-4 py-2">
                      {activities.map((act) => (
                        <div key={act.id} className="relative text-xs">
                          {/* Dot marker */}
                          <span className={`absolute -left-[21.5px] top-1.5 w-2.5 h-2.5 rounded-full border border-white ${
                            act.activityType === "blocker_notice" ? "bg-red-500" :
                            act.activityType === "handover_notice" ? "bg-amber-500" :
                            act.activityType === "progress_update" ? "bg-sky-500" :
                            "bg-slate-400"
                          }`} />
                          
                          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-0.5">
                            <span className="font-semibold text-slate-550 dark:text-slate-305">
                              {new Date(act.createdAt).toLocaleString()}
                            </span>
                          </div>
                          
                          <p className="text-slate-750 dark:text-slate-250 leading-normal">
                            <strong className="text-slate-850 dark:text-slate-100">{act.actorName || "Unknown"}</strong>
                            {" "}
                            {act.activityType === "assign" && "ditambahkan sebagai kontributor."}
                            {act.activityType === "progress_update" && `memperbarui progress developer.`}
                            {act.activityType === "handover_notice" && (
                              <span>menyerahkan tugas kepada <strong className="text-slate-850 dark:text-slate-100">{act.targetUserName}</strong>.</span>
                            )}
                            {act.activityType === "blocker_notice" && (
                              <span>melaporkan terhambat (blocked) oleh <strong className="text-slate-850 dark:text-slate-100">{act.targetUserName}</strong>.</span>
                            )}
                          </p>
                          {act.note && (
                            <div className="mt-1 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800/40 text-slate-600 dark:text-slate-400 italic">
                              {`"${act.note}"`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* UI Screenshot viewer */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">UI Design Screenshot</h3>
                </div>
                <div className="p-1">
                  <ScreenshotViewer screenshotUrl={task.screenshotUrl} taskCode={task.taskCode} taskTitle={task.title} />
                </div>
              </div>
            </div>

            {/* Column 2: Right panel (Metadata, Contributors, Handovers) - Takes 5/12 */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Metadata Panel */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-150/80 dark:border-slate-800/70 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Database className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-200">S-Curve & Planning</h3>
                </div>

                {/* Progress Display */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-400">
                    <span>Average Task Progress</span>
                    <span className="font-mono text-blue-700 dark:text-blue-400">{task.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200/70 dark:bg-slate-800 rounded-full h-2">
                    <div 
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-350 shadow-sm" 
                      style={{ width: `${task.progress || 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block italic leading-tight">
                    *Rerata progress dihitung otomatis dari kontribusi semua developer ($100/N).
                  </span>
                </div>

                {/* Metadata List */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Active Developer
                    </span>
                    <span className="font-bold text-slate-805 dark:text-slate-200">
                      {assignee ? assignee.name : <span className="text-slate-450 italic font-normal">Unassigned</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Folder className="w-3.5 h-3.5 text-slate-400" />
                      Project
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[150px]" title={project?.name}>
                      {project ? project.name : <span className="text-slate-450 italic font-normal">None</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Due Date
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {task.dueDate ? task.dueDate : <span className="text-slate-450 italic font-normal">-</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Target className="w-3.5 h-3.5 text-slate-400" />
                      Sprint Target
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {task.sprintTarget ? task.sprintTarget : <span className="text-slate-450 italic font-normal">-</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      Target Phase
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {task.phase ? task.phase : <span className="text-slate-450 italic font-normal">-</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Task Type
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {task.taskType ? task.taskType : <span className="text-slate-450 italic font-normal">-</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Database className="w-3.5 h-3.5 text-slate-400" />
                      SRD Section Ref
                    </span>
                    <span className="font-mono font-semibold text-slate-850 dark:text-slate-200">
                      {task.srdRef ? task.srdRef : <span className="text-slate-450 italic font-normal">-</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      FR Code
                    </span>
                    <span className="font-mono font-semibold text-slate-850 dark:text-slate-200">
                      {task.frCode ? task.frCode : <span className="text-slate-450 italic font-normal">-</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Collaborators List & Action Panel */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-150/80 dark:border-slate-800/70 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Users className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-200">Task Contributors</h3>
                </div>

                {/* Display Contributors */}
                <div className="space-y-3">
                  {contributors.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No contributors assigned yet.</p>
                  ) : (
                    contributors.map((c) => {
                      const isEditing = editingContribId === c.id;
                      return (
                        <div key={c.id} className="flex flex-col border border-slate-100 dark:border-slate-800 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Avatar letter initials logo */}
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${
                                c.isCurrentActive ? "bg-blue-600 shadow-sm" : "bg-slate-405"
                              }`}>
                                {getInitials(c.name)}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-205 flex items-center gap-1.5">
                                  {c.name}
                                  {c.isCurrentActive && (
                                    <Badge className="bg-blue-100 text-blue-750 border-none font-bold text-[9px] py-0 px-1">Active</Badge>
                                  )}
                                </h4>
                                <span className="text-[9px] text-slate-405 dark:text-slate-500 capitalize">{c.role}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {!c.isCurrentActive && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetActiveContributor(c)}
                                  className="h-6 text-[10px] font-bold text-blue-650 hover:bg-blue-50"
                                >
                                  Make Active
                                </Button>
                              )}
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={tempProgress}
                                    onChange={(e) => setTempProgress(parseInt(e.target.value) || 0)}
                                    className="w-12 h-6 text-xs text-center p-0"
                                  />
                                  <Button
                                    size="icon"
                                    className="w-6 h-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => handleUpdateContribProgress(c, tempProgress)}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-6 h-6 text-slate-500"
                                    onClick={() => setEditingContribId(null)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] font-bold"
                                  onClick={() => {
                                    setEditingContribId(c.id);
                                    setTempProgress(c.individualProgress);
                                  }}
                                >
                                  Progres: {c.individualProgress}%
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Contributor Selector Form */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                  <div className="flex-1 min-w-0">
                    <Select value={newContributorId} onValueChange={(val) => setNewContributorId(val || "")}>
                      <SelectTrigger className="w-full h-8 text-xs">
                        <span data-slot="select-value" className="text-left font-medium truncate">
                          {users.find((u) => u.id === newContributorId)?.name || "Pilih Developer"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter((u) => !contributors.some((c) => c.developerId === u.id))
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    disabled={!newContributorId || submittingContrib}
                    onClick={handleAddContributor}
                    className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800 gap-1 shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    Tambah
                  </Button>
                </div>
              </div>

              {/* Handover Notice & Blocker Form */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-150/80 dark:border-slate-800/70 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <ArrowRightLeft className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-200">Handovers & Blockers</h3>
                </div>

                <div className="space-y-3">
                  {/* Select Receiver */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Kirim Ke Developer</label>
                    <Select value={handoverTargetId} onValueChange={(val) => setHandoverTargetId(val || "")}>
                      <SelectTrigger className="w-full h-8 text-xs">
                        <span data-slot="select-value" className="text-left font-medium truncate">
                          {contributors.find((c) => c.developerId === handoverTargetId)?.name || "Pilih Rekan Developer"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {contributors.map((c) => (
                          <SelectItem key={c.developerId} value={c.developerId}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Switch Handover vs Blocker */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={handoverType === "handover_notice" ? "default" : "outline"}
                      onClick={() => setHandoverType("handover_notice")}
                      className={`h-8 text-[10px] font-extrabold uppercase ${
                        handoverType === "handover_notice" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
                      }`}
                    >
                      Handover Tugas
                    </Button>
                    <Button
                      type="button"
                      variant={handoverType === "blocker_notice" ? "default" : "outline"}
                      onClick={() => setHandoverType("blocker_notice")}
                      className={`h-8 text-[10px] font-extrabold uppercase ${
                        handoverType === "blocker_notice" ? "bg-red-600 hover:bg-red-700 text-white" : ""
                      }`}
                    >
                      Blocked Warning
                    </Button>
                  </div>

                  {/* Note */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Catatan Custom</label>
                    <Textarea
                      placeholder={handoverType === "handover_notice" ? "Tulis tugas apa saja yang perlu dilanjutkan..." : "Detail hambatan/blocker..."}
                      value={handoverNote}
                      onChange={(e) => setHandoverNote(e.target.value)}
                      className="text-xs h-16 min-h-[60px]"
                    />
                  </div>

                  {/* Send Button */}
                  <Button
                    type="button"
                    disabled={!handoverTargetId || submittingNotice}
                    onClick={handleSendNotice}
                    className={`w-full h-8 text-xs font-semibold gap-1.5 shadow-sm text-white ${
                      handoverType === "handover_notice" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Kirim & Alert WA
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Dialog Footer Actions */}
        <DialogFooter className="p-6 border-t bg-slate-100 dark:bg-slate-900/50 flex-shrink-0 mx-0 mb-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5">
            <X className="w-4 h-4" />
            Close
          </Button>
          <Button type="button" onClick={handleEditClick} className="gap-1.5 bg-blue-600 hover:bg-blue-750 text-white font-semibold shadow-sm">
            <Pencil className="w-4 h-4" />
            Edit Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
