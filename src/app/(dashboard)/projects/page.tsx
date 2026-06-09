"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { ProjectForm } from "@/components/projects/project-form";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";

interface Project {
  id: string;
  name: string;
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
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No projects yet. Click "New Project" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <Link href={`/projects/${project.id}`} className="font-medium hover:underline inline-flex items-center gap-1">
                        {project.name}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[project.status] || "secondary"}>
                        {statusLabels[project.status] || project.status}
                      </Badge>
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
