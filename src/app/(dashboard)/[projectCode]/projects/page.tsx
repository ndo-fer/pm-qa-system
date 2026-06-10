"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectForm } from "@/components/projects/project-form";
import { Plus, Pencil, Trash2, ExternalLink, RotateCw } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";

interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
}

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  planned: "secondary",
  active: "default",
  on_hold: "secondary",
  completed: "default",
};

const statusLabels: Record<string, string> = {
  planned: "Planned",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
};

export default function ProjectsPage() {
  const params = useParams();
  const projectCodeParam = params?.projectCode as string;
  
  const { data: session, update } = useSession();
  const activeProjectId = session?.user?.projectId;
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  async function fetchProjects() {
    setLoading(true);
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchProjects();
  }

  async function handleSwitch(projectId: string, targetProjectCode: string) {
    setSwitchingId(projectId);
    if (update) {
      await update({ projectId, projectCode: targetProjectCode });
      window.location.href = `/${targetProjectCode}/projects`;
    }
  }

  return (
    <AppLayout className="px-4 py-2.5 h-full flex flex-col overflow-hidden">
      <div className="space-y-2 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold">Projects</h1>
            <span className="text-xs text-slate-500 font-medium">Manage ERP projects</span>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton data={projects} filename="projects_list" size="sm" />
            <Button size="sm" className="h-7 text-xs py-1" onClick={() => { setEditingProject(null); setFormOpen(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Project
            </Button>
          </div>
        </div>

        <div className="border rounded-lg bg-white flex-1 overflow-y-auto min-h-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No projects yet. Click "New Project" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-semibold text-slate-700">{project.code}</TableCell>
                    <TableCell>
                      <Link href={`/${project.code}/dashboard`} className="font-medium hover:underline inline-flex items-center gap-1">
                        {project.name}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[project.status] || "secondary"}>
                        {statusLabels[project.status] || project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {project.id === activeProjectId ? (
                        <span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px] px-2 py-0.5 rounded-full">
                          Active Workspace
                        </span>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-6 text-[10px] px-2 py-0.5 font-medium hover:bg-slate-100 hover:text-slate-900" 
                          onClick={() => handleSwitch(project.id, project.code)}
                          disabled={switchingId !== null}
                        >
                          {switchingId === project.id ? (
                            <RotateCw className="w-3 h-3 animate-spin mr-1" />
                          ) : null}
                          Switch Workspace
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>{project.startDate}</TableCell>
                    <TableCell>{project.endDate || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingProject(project); setFormOpen(true); }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(project.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ProjectForm
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editingProject}
        onSuccess={fetchProjects}
      />
    </AppLayout>
  );
}
