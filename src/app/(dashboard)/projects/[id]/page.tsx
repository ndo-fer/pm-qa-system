"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FolderKanban, CheckSquare, TestTube } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";

interface Project {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

interface TestPlan {
  id: string;
  name: string;
  module: string;
  status: string;
}

const statusLabels: Record<string, string> = {
  planned: "Planned",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
};

const taskStatusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

const taskStatusColors: Record<string, "default" | "secondary" | "destructive"> = {
  todo: "secondary",
  in_progress: "default",
  review: "secondary",
  done: "default",
};

type Tab = "overview" | "tasks" | "qa";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [projectRes, tasksRes, plansRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/tasks?projectId=${id}`),
        fetch(`/api/test-plans?projectId=${id}`),
      ]);

      if (projectRes.ok) setProject(await projectRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (plansRes.ok) setTestPlans(await plansRes.json());
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Project not found</h2>
          <Button variant="link" onClick={() => router.push("/projects")}>
            Back to Projects
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout className="px-4 py-2.5 h-full flex flex-col overflow-hidden">
      <div className="space-y-2 flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={() => router.push("/projects")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold">{project.name}</h1>
            <span className="text-xs text-slate-500 font-medium truncate max-w-sm">{project.description || "No description"}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge>{statusLabels[project.status]}</Badge>
            <ExportButton
              data={() => [{
                ...project,
                tasks: tasks.map(t => ({ taskCode: (t as any).taskCode || t.id.slice(0, 8), title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate })),
                testPlans: testPlans.map(tp => ({ id: tp.id, name: tp.name, module: tp.module, status: tp.status }))
              }]}
              filename={`${project.name.toLowerCase().replace(/\s+/g, '_')}_full_report`}
              label="Export Project Report"
              size="sm"
            />
          </div>
        </div>

        <div className="flex gap-2 border-b flex-shrink-0">
          {(["overview", "tasks", "qa"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors flex items-center ${
                activeTab === tab
                  ? "border-blue-600 text-blue-650"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "overview" && <FolderKanban className="w-3.5 h-3.5 mr-1.5" />}
              {tab === "tasks" && <CheckSquare className="w-3.5 h-3.5 mr-1.5" />}
              {tab === "qa" && <TestTube className="w-3.5 h-3.5 mr-1.5" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === "overview" && (
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</CardTitle></CardHeader>
                <CardContent className="p-3 pt-0"><p className="text-xl font-bold">{project.startDate}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="p-3 pb-1"><CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</CardTitle></CardHeader>
                <CardContent className="p-3 pt-0"><p className="text-xl font-bold">{project.endDate || "Not set"}</p></CardContent>
              </Card>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <ExportButton data={tasks} filename={`${project.name.toLowerCase().replace(/\s+/g, "_")}_tasks`} size="sm" />
              </div>
              <div className="border rounded-lg bg-white overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Title</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Status</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Priority</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-xs text-gray-500">No tasks yet</td>
                      </tr>
                    ) : (
                      tasks.map((task) => (
                        <tr key={task.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-xs font-medium">
                            <Link href={`/tasks?status=${task.status}`} className="hover:text-blue-600 hover:underline">
                              {task.title}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={taskStatusColors[task.status] || "secondary"} className="text-[10px] px-1.5 py-0">
                              {taskStatusLabels[task.status]}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-xs capitalize">{task.priority}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{task.dueDate || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "qa" && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <ExportButton data={testPlans} filename={`${project.name.toLowerCase().replace(/\s+/g, "_")}_test_plans`} size="sm" />
              </div>
              <div className="border rounded-lg bg-white overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Name</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Module</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testPlans.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-xs text-gray-500">No test plans yet</td>
                      </tr>
                    ) : (
                      testPlans.map((plan) => (
                        <tr key={plan.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-xs font-medium">
                            <Link href={`/qa?planId=${plan.id}`} className="hover:text-blue-600 hover:underline">
                              {plan.name}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-xs">{plan.module}</td>
                          <td className="px-3 py-2 text-xs capitalize">{plan.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
