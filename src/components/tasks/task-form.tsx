/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Database, Users } from "lucide-react";
import { ScreenshotViewer } from "./screenshot-viewer";

interface Project {
  id: string;
  name: string;
  code?: string;
}

interface User {
  id: string;
  name: string;
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
  erpRole?: string | null;
  roleSpecificFeatures?: unknown;
}

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  projects: Project[];
  users: User[];
  onSuccess: () => void;
  modules?: string[];
  defaultEpic?: string;
  defaultProjectCode?: string;
}

const EPICS = ["MST", "INV", "PUR", "SLS", "PRD", "AP", "AR", "FIN", "GL", "RPT", "ADM", "BUG"];
const PHASES = [
  "Phase 1",
  "Phase 2",
  "Phase 3",
  "Phase 4",
  "Phase 5",
  "Phase 6",
  "Phase 7",
  "Phase 8",
  "Phase 9",
];
const ERP_ROLES = [
  { value: "all_roles", label: "All Roles" },
  { value: "administrator", label: "Administrator" },
  { value: "top_user", label: "Top User" },
  { value: "user", label: "User" },
];

export function TaskForm({ open, onOpenChange, task, projects, users, onSuccess, modules, defaultEpic, defaultProjectCode }: TaskFormProps) {
  const activeModules = modules || EPICS;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  
  // Workbook details
  const [taskCode, setTaskCode] = useState("");
  const [epic, setEpic] = useState("");
  const [feature, setFeature] = useState("");
  const [taskType, setTaskType] = useState("");
  const [srdRef, setSrdRef] = useState("");
  const [frCode, setFrCode] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [progress, setProgress] = useState(0);
  const [blocker, setBlocker] = useState("");
  const [sprintTarget, setSprintTarget] = useState("");
  const [phase, setPhase] = useState("");
  const [erpRole, setErpRole] = useState("all_roles");
  const [screenshotUrl, setScreenshotUrl] = useState("");

  const [loading, setLoading] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (newStatus === "todo") {
      setProgress(0);
    } else if (newStatus === "review") {
      setProgress(90);
    } else if (newStatus === "done") {
      setProgress(100);
    } else if (newStatus === "in_progress") {
      setProgress((prev) => Math.min(prev, 90));
    }
  };

  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedAssignee = users.find((u) => u.id === assigneeId);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setProjectId(task.projectId);
      setAssigneeId(task.assigneeId || "");
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate || "");
      setTaskCode(task.taskCode || "");
      setEpic(task.epic || "");
      setFeature(task.feature || "");
      setTaskType(task.taskType || "");
      setSrdRef(task.srdRef || "");
      setFrCode(task.frCode || "");
      setAcceptanceCriteria(task.acceptanceCriteria || "");
      setProgress(task.progress || 0);
      setBlocker(task.blocker || "");
      setSprintTarget(task.sprintTarget || "");
      setPhase(task.phase || "");
      setErpRole(task.erpRole || "all_roles");
      setScreenshotUrl(task.screenshotUrl || "");
    } else {
      setTitle("");
      setDescription("");
      const matchedProject = projects.find((p) => p.code === defaultProjectCode);
      setProjectId(matchedProject?.id || projects[0]?.id || "");
      setAssigneeId("");
      setStatus("todo");
      setPriority("medium");
      setDueDate("");
      setTaskCode("");
      setEpic(defaultEpic || "");
      setFeature("");
      setTaskType("");
      setSrdRef("");
      setFrCode("");
      setAcceptanceCriteria("");
      setProgress(0);
      setBlocker("");
      setSprintTarget("");
      setPhase("");
      setErpRole("all_roles");
      setScreenshotUrl("");
    }
  }, [task, open, projects, defaultEpic, defaultProjectCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const url = task ? `/api/tasks/${task.id}` : "/api/tasks";
      const method = task ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          projectId,
          assigneeId: assigneeId || null,
          status,
          priority,
          dueDate: dueDate || null,
          taskCode: taskCode || null,
          epic: epic || null,
          feature: feature || null,
          taskType: taskType || null,
          srdRef: srdRef || null,
          frCode: frCode || null,
          acceptanceCriteria: acceptanceCriteria || null,
          progress: Number(progress),
          blocker: blocker || null,
          sprintTarget: sprintTarget || null,
          phase: phase || null,
          erpRole: erpRole || "all_roles",
          roleSpecificFeatures: task ? task.roleSpecificFeatures : null,
          screenshotUrl: screenshotUrl || null,
        }),
      });

      if (res.ok) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {task ? "Edit Task Details" : "Create New Task"}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            {task ? "Update task properties and S-Curve progression metadata." : "Add a new task to the project schedule."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Column 1: General Info */}
            <div className="bg-slate-50/60 dark:bg-slate-900/10 p-5 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">General Information</h3>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Task Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="h-9 text-sm" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the task in detail..."
                  className="flex min-h-[120px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</label>
                  <Select value={status} onValueChange={(v) => v && handleStatusChange(v)}>
                    <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</label>
                  <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                    <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due Date</label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-sm w-full" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sprint Target</label>
                  <Input value={sprintTarget} onChange={(e) => setSprintTarget(e.target.value)} placeholder="e.g. Sprint 1" className="h-9 text-sm" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assignee</label>
                <Select value={assigneeId} onValueChange={(v) => setAssigneeId(v || "")}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <span data-slot="select-value" className="flex flex-1 text-left">
                      {assigneeId === "unassigned" || !assigneeId
                        ? "Unassigned"
                        : selectedAssignee
                        ? selectedAssignee.name
                        : "Select assignee"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Project</label>
                <Select value={projectId} onValueChange={(v) => setProjectId(v || "")}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <span data-slot="select-value" className="flex flex-1 text-left">
                      {selectedProject ? selectedProject.name : "Select project"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Screenshot URL input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Screenshot URL (Supports Multiple)</label>
                <Input 
                  value={screenshotUrl} 
                  onChange={(e) => setScreenshotUrl(e.target.value)} 
                  placeholder="https://example.com/image.png, drive:FILE_ID_2" 
                  className="h-9 text-sm" 
                />
                <p className="text-[10px] text-slate-500 leading-normal">
                  Masukkan link gambar atau ID Drive. Pisahkan dengan tanda koma (,) untuk menambahkan lebih dari 1 gambar.
                </p>
              </div>

              {/* Screenshot Preview */}
              {screenshotUrl && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Screenshot Preview</label>
                  <ScreenshotViewer screenshotUrl={screenshotUrl} taskCode={taskCode} taskTitle={title} />
                </div>
              )}
            </div>
            
            {/* Column 2: Workbook metadata */}
            <div className="bg-slate-50/60 dark:bg-slate-900/10 p-5 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">ERP & S-Curve Metadata</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Task Code (ID)</label>
                  <Input value={taskCode} onChange={(e) => setTaskCode(e.target.value)} placeholder="e.g. MST-001" className="h-9 text-sm font-mono" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Task Type</label>
                  <Input value={taskType} onChange={(e) => setTaskType(e.target.value)} placeholder="e.g. Screen, Logic" className="h-9 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Modul</label>
                  <Select value={epic} onValueChange={(v) => setEpic(v || "")}>
                    <SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Pilih Modul" /></SelectTrigger>
                    <SelectContent>
                      {activeModules.map((ep) => (
                        <SelectItem key={ep} value={ep}>{ep}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Phase</label>
                  <Select value={phase} onValueChange={(v) => setPhase(v || "")}>
                    <SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Select Phase" /></SelectTrigger>
                    <SelectContent>
                      {PHASES.map((ph) => (
                        <SelectItem key={ph} value={ph}>{ph}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Feature Description</label>
                <Input value={feature} onChange={(e) => setFeature(e.target.value)} placeholder="e.g. Form Input Supplier" className="h-9 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Progress (%)</label>
                  <Input 
                    type="number" 
                    min="0" 
                    max={status === "in_progress" ? 90 : 100} 
                    value={progress} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (status === "in_progress") {
                        setProgress(Math.min(Math.max(val, 0), 90));
                      } else {
                        setProgress(val);
                      }
                    }} 
                    disabled={status !== "in_progress"}
                    className="h-9 text-sm disabled:opacity-85 disabled:bg-slate-100" 
                  />
                  {status !== "in_progress" && (
                    <p className="text-[10px] text-slate-400 font-medium">Auto-set based on status ({status === "todo" ? "0%" : status === "review" ? "90%" : "100%"})</p>
                  )}
                  {status === "in_progress" && (
                    <p className="text-[10px] text-slate-500 font-medium">Range: 0% - 90%</p>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Blocker Description</label>
                  <Input value={blocker} onChange={(e) => setBlocker(e.target.value)} placeholder="None" className="h-9 text-sm text-red-600 dark:text-red-400 font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SRD Reference (Section)</label>
                  <Input value={srdRef} onChange={(e) => setSrdRef(e.target.value)} placeholder="e.g. 3.2.1" className="h-9 text-sm" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">FR Code</label>
                  <Input value={frCode} onChange={(e) => setFrCode(e.target.value)} placeholder="e.g. FR-MST-01" className="h-9 text-sm font-mono" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acceptance Criteria</label>
                <textarea 
                  value={acceptanceCriteria} 
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  placeholder="Checklist or specs for criteria matching..."
                  className="flex min-h-[120px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
                />
              </div>

            </div>

            {/* ERP Role Context Section */}
            <div className="bg-slate-50/60 dark:bg-slate-900/10 p-5 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">ERP Role Context</h3>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Target ERP Role
                </label>
                <Select value={erpRole} onValueChange={(v) => setErpRole(v || "all_roles")}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Select ERP Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ERP_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400">
                  {erpRole === "all_roles" && "Task applies to all ERP roles"}
                  {erpRole === "administrator" && "Task is specific to Administrator role (PDJService)"}
                  {erpRole === "top_user" && "Task is specific to Top User role (K009)"}
                  {erpRole === "user" && "Task is specific to User role (K010)"}
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6 -mx-6 -mb-6 md:-mx-8 md:-mb-8 p-6 border-t bg-slate-50 dark:bg-slate-900/50">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : task ? "Save Changes" : "Create Task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
