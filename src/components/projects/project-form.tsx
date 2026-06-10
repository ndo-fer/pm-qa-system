"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
}

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSuccess: () => void;
}

export function ProjectForm({ open, onOpenChange, project, onSuccess }: ProjectFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("planned");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setCode(project.code || "");
      setDescription(project.description || "");
      setStartDate(project.startDate);
      setEndDate(project.endDate || "");
      setStatus(project.status);
      setFile(null);
    } else {
      setName("");
      setCode("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setStatus("planned");
      setFile(null);
    }
  }, [project, open]);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      let res;
      if (!project && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", name);
        formData.append("code", code);
        formData.append("description", description);
        formData.append("startDate", startDate);
        formData.append("endDate", endDate || "");

        res = await fetch("/api/projects/import", {
          method: "POST",
          body: formData,
        });
      } else {
        const url = project ? `/api/projects/${project.id}` : "/api/projects";
        const method = project ? "PUT" : "POST";

        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name, 
            code, 
            description, 
            startDate, 
            endDate: endDate || null, 
            status 
          }),
        });
      }

      if (res.ok) {
        onSuccess();
        onOpenChange(false);
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menyimpan proyek");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan koneksi");
    }
    setLoading(false);
  }


  const statusColors: Record<string, string> = {
    planned: "bg-gray-500",
    active: "bg-green-500",
    on_hold: "bg-yellow-500",
    completed: "bg-blue-500",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle>
          <DialogDescription>
            {project ? "Update project details" : "Create a new project"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Code</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ERP-PM" required />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {!project && (
            <div className="space-y-2 border border-dashed border-gray-300 rounded-md p-3 bg-gray-50/50">
              <label className="text-sm font-medium block">Excel Template Plan (Opsional)</label>
              <Input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1 bg-white cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Mengunggah Excel akan mengimpor Milestone, Target S-Curve, Developer Tasks, dan QA Test Cases secara otomatis. Unduh template:{" "}
                <a 
                  href="/templates/project_import_template.xlsx" 
                  download 
                  className="text-blue-500 hover:underline inline-flex items-center font-medium cursor-pointer"
                >
                  project_import_template.xlsx
                </a>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : project ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
