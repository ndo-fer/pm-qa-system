"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Target
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
}

interface TaskPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  projects: Project[];
  users: UserType[];
  onEdit: (task: any) => void;
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
  administrator: "Administrator (PDJService)",
  top_user: "Top User (K009)",
  user: "User (K010)",
};

export function TaskPreviewModal({
  open,
  onOpenChange,
  task,
  projects,
  users,
  onEdit,
}: TaskPreviewModalProps) {
  if (!task) return null;

  const project = projects.find((p) => p.id === task.projectId);
  const assignee = users.find((u) => u.id === task.assigneeId);

  const handleEditClick = () => {
    onOpenChange(false);
    onEdit(task);
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
            {task.isArchived && (
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Column 1: Detailed Text Content (Left side) - Takes 7/12 width */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Blocker Banner */}
            {task.blocker && (
              <div className="flex items-start gap-3 text-sm text-red-800 bg-red-50/80 p-4 rounded-xl border border-red-150/60 font-medium shadow-sm animate-pulse">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-650" />
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
              <div className="bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 min-h-[120px] max-h-[300px] overflow-y-auto">
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
              <div className="bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50 min-h-[100px] max-h-[300px] overflow-y-auto">
                {task.acceptanceCriteria ? (
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {task.acceptanceCriteria}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">No acceptance criteria defined.</p>
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

          {/* Column 2: Metadata Side Panel (Right side) - Takes 5/12 width */}
          <div className="md:col-span-5 bg-slate-50/50 dark:bg-slate-900/10 p-5 rounded-xl border border-slate-150/70 dark:border-slate-800/70 space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
              <Database className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-200">S-Curve & Planning</h3>
            </div>

            {/* Progress Display */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-400">
                <span>Progress Percentage</span>
                <span className="font-mono text-blue-700 dark:text-blue-400">{task.progress || 0}%</span>
              </div>
              <div className="w-full bg-slate-200/70 dark:bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-350 shadow-sm" 
                  style={{ width: `${task.progress || 0}%` }}
                />
              </div>
            </div>

            {/* Key-Value Details List */}
            <div className="space-y-3.5 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <User className="w-4 h-4 text-slate-400" />
                  Assignee
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {assignee ? assignee.name : <span className="text-slate-450 italic">Unassigned</span>}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Folder className="w-4 h-4 text-slate-400" />
                  Project
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[200px]" title={project?.name}>
                  {project ? project.name : <span className="text-slate-450 italic">None</span>}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Due Date
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {task.dueDate ? task.dueDate : <span className="text-slate-450 italic font-sans font-normal">-</span>}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Target className="w-4 h-4 text-slate-400" />
                  Sprint Target
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {task.sprintTarget ? task.sprintTarget : <span className="text-slate-450 italic font-normal">-</span>}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Layers className="w-4 h-4 text-slate-400" />
                  Target Phase
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {task.phase ? task.phase : <span className="text-slate-450 italic font-normal">-</span>}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Task Type
                </span>
                <span className="font-semibold text-slate-850 dark:text-slate-250 capitalize">
                  {task.taskType ? task.taskType : <span className="text-slate-450 italic font-normal">-</span>}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100/50 dark:border-slate-800/40">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Database className="w-4 h-4 text-slate-400" />
                  SRD Section Ref
                </span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {task.srdRef ? task.srdRef : <span className="text-slate-450 italic font-sans font-normal">-</span>}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <FileText className="w-4 h-4 text-slate-400" />
                  FR Code
                </span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {task.frCode ? task.frCode : <span className="text-slate-450 italic font-sans font-normal">-</span>}
                </span>
              </div>
            </div>

            {/* Feature Description Snippet */}
            {task.feature && (
              <div className="bg-slate-100/40 dark:bg-slate-900/20 p-3 rounded-lg border border-slate-200/40 text-xs space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Feature Details</span>
                <p className="text-slate-700 dark:text-slate-350 leading-relaxed font-medium">{task.feature}</p>
              </div>
            )}
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
