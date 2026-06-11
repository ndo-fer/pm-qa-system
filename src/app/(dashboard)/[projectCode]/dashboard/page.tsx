import { AppLayout } from "@/components/layout/app-layout";
import { db } from "@/db";
import { projects, tasks, testCases, testPlans, milestones, projectMembers } from "@/db/schema";
import { count, eq, and, lt, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckSquare, AlertCircle, TestTube, Target } from "lucide-react";
import Link from "next/link";
import { calculateSCurveGroup } from "@/lib/s-curve";
import { SCurveChart } from "@/components/projects/s-curve-chart";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

async function getStats(activeProjectId: string, userId: string) {
  const today = new Date().toISOString().split("T")[0];

  const [
    projectCountResult,
    taskCountResult,
    doneTasksResult,
    inProgressTasksResult,
    qaCountResult,
    passedQAResult,
    failedQAResult,
    blockedQAResult,
    planCountResult,
    milestoneCountResult,
    overdueTasksResult,
    sCurveGroup
  ] = await Promise.all([
    db.select({ count: count() }).from(projectMembers).where(eq(projectMembers.userId, userId)),
    db.select({ count: count() }).from(tasks).where(eq(tasks.projectId, activeProjectId)),
    db.select({ count: count() }).from(tasks).where(and(eq(tasks.projectId, activeProjectId), eq(tasks.status, "done"))),
    db.select({ count: count() }).from(tasks).where(and(eq(tasks.projectId, activeProjectId), eq(tasks.status, "in_progress"))),
    db.select({ count: count() }).from(testCases).innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id)).where(eq(testPlans.projectId, activeProjectId)),
    db.select({ count: count() }).from(testCases).innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id)).where(and(eq(testPlans.projectId, activeProjectId), eq(testCases.status, "pass"))),
    db.select({ count: count() }).from(testCases).innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id)).where(and(eq(testPlans.projectId, activeProjectId), eq(testCases.status, "fail"))),
    db.select({ count: count() }).from(testCases).innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id)).where(and(eq(testPlans.projectId, activeProjectId), eq(testCases.status, "blocked"))),
    db.select({ count: count() }).from(testPlans).where(eq(testPlans.projectId, activeProjectId)),
    db.select({ count: count() }).from(milestones).where(eq(milestones.projectId, activeProjectId)),
    db.select({ count: count() }).from(tasks).where(and(eq(tasks.projectId, activeProjectId), eq(tasks.status, "todo"), lt(tasks.dueDate, today))),
    calculateSCurveGroup(activeProjectId),
  ]);

  return {
    projects: projectCountResult[0].count,
    totalTasks: taskCountResult[0].count,
    doneTasks: doneTasksResult[0].count,
    inProgressTasks: inProgressTasksResult[0].count,
    overdueTasks: overdueTasksResult[0].count,
    totalQA: qaCountResult[0].count,
    passedQA: passedQAResult[0].count,
    failedQA: failedQAResult[0].count,
    blockedQA: blockedQAResult[0].count,
    testPlans: planCountResult[0].count,
    milestones: milestoneCountResult[0].count,
    sCurveGroup,
  };
}

async function getRecentTasks(activeProjectId: string) {
  return await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, activeProjectId))
    .orderBy(desc(tasks.createdAt))
    .limit(5);
}

async function getMilestones(activeProjectId: string) {
  return await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, activeProjectId))
    .orderBy(milestones.startDate);
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

export default async function DashboardPage({ params }: { params: Promise<{ projectCode: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { projectCode } = await params;
  const activeProject = (await db.select().from(projects).where(eq(projects.code, projectCode)).limit(1))[0];
  if (!activeProject) {
    redirect(`/${session.user.projectCode}/projects`);
  }

  const userId = session.user.id;
  const member = await db.select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, activeProject.id),
        eq(projectMembers.userId, userId)
      )
    )
    .limit(1);

  if (member.length === 0) {
    redirect(`/${session.user.projectCode}/projects`);
  }

  const activeProjectId = activeProject.id;

  const stats = await getStats(activeProjectId, userId);
  const recentTasks = await getRecentTasks(activeProjectId);
  const milestoneList = await getMilestones(activeProjectId);

  // Current week from S-Curve — use string comparison to avoid UTC timezone mismatch
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD" in UTC, which matches stored dates
  const currentWeek = stats.sCurveGroup.overall.find((w: { weekStart: string; weekEnd: string; plannedCumulative: number; actualCumulative?: number | null }) =>
    w.weekStart <= todayStr && todayStr <= w.weekEnd
  );
  const plannedProgress = currentWeek ? (currentWeek.plannedCumulative * 100).toFixed(1) : "0";

  const totalExecutedQA = stats.passedQA + stats.failedQA + stats.blockedQA;
  const qaPassRate = totalExecutedQA > 0 ? Math.round((stats.passedQA / totalExecutedQA) * 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-xs text-gray-500">{activeProject?.name}{activeProject?.description ? ` — ${activeProject.description}` : ""}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Milestones</CardTitle>
              <Target className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.milestones}</div>
              <p className="text-xs text-gray-500">{stats.milestones} phases</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
              <CheckSquare className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-gray-500">
                {stats.doneTasks} done, {stats.inProgressTasks} in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.overdueTasks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">QA Pass Rate</CardTitle>
              <TestTube className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {qaPassRate}%
              </div>
              <p className="text-xs text-gray-500">
                {stats.passedQA} pass, {stats.failedQA} fail, {stats.blockedQA} blocked ({stats.totalQA} total)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Planned</CardTitle>
              <FolderKanban className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plannedProgress}%</div>
              <p className="text-xs text-gray-500">
                achieved{" "}
                <span className={
                  currentWeek?.actualCumulative == null
                    ? "text-gray-400"
                    : currentWeek.actualCumulative >= currentWeek.plannedCumulative
                    ? "text-green-600 font-semibold"
                    : "text-red-500 font-semibold"
                }>
                  {currentWeek?.actualCumulative != null
                    ? `${(currentWeek.actualCumulative * 100).toFixed(1)}%`
                    : "—"}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* S-Curve Tracking Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SCurveChart sCurveGroup={stats.sCurveGroup} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all"
                    style={{ width: `${stats.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {stats.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.doneTasks} of {stats.totalTasks} tasks completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>QA Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Test Plans</span>
                  <span className="font-medium">{stats.testPlans}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Test Cases</span>
                  <span className="font-medium">{stats.totalQA}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pass Rate</span>
                  <span className="font-medium">
                    {stats.totalQA > 0 ? Math.round((stats.passedQA / stats.totalQA) * 100) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Milestones Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Milestone Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {milestoneList.map((ms) => (
                <Link
                  key={ms.id}
                  href={`/${projectCode}/tasks?phase=${encodeURIComponent(ms.phase)}`}
                  className="flex items-center gap-4 p-2.5 rounded-lg hover:bg-slate-50/80 border border-transparent hover:border-slate-100 transition-all cursor-pointer group"
                >
                  <div className="w-20 text-xs font-mono text-slate-550 font-bold group-hover:text-blue-600 transition-colors">{ms.phase}</div>
                  <div className="w-2 h-2 rounded-full bg-blue-600 group-hover:scale-125 transition-transform" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{ms.name}</p>
                    <p className="text-xs text-slate-500">{ms.module}</p>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {ms.startDate} → {ms.endDate}
                  </div>
                  <Badge variant="secondary" className="font-semibold text-[10px] group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">{ms.status}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <p className="text-gray-500 text-sm">No tasks yet</p>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {task.taskCode && <span className="font-mono text-xs text-gray-500">{task.taskCode}</span>}
                        <p className="text-sm font-medium">{task.title}</p>
                      </div>
                      <p className="text-xs text-gray-500 capitalize">
                        {task.epic && `${task.epic} · `}{task.priority} priority
                      </p>
                    </div>
                    <Badge variant={statusColors[task.status] || "secondary"}>
                      {statusLabels[task.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Link href={`/${projectCode}/tasks`} className="text-sm text-blue-600 hover:underline">
                View all tasks →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
