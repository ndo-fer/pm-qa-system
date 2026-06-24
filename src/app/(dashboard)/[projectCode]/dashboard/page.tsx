import { AppLayout } from "@/components/layout/app-layout";
import { db } from "@/db";
import { projects, tasks, testCases, testPlans, milestones, projectMembers, users } from "@/db/schema";
import { count, eq, and, lt, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckSquare, AlertCircle, TestTube, Target, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { calculateSCurveGroup } from "@/lib/s-curve";
import { SCurveChart } from "@/components/projects/s-curve-chart";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";

async function getStats(activeProjectId: string, userId: string) {
  const today = new Date().toISOString().split("T")[0];

  // Fetch data in fewer queries to prevent connection pool exhaustion
  const [
    projectCountResult,
    allTasks,
    allTestCases,
    planCountResult,
    milestoneCountResult,
    sCurveGroup
  ] = await Promise.all([
    db.select({ count: count() }).from(projectMembers).where(eq(projectMembers.userId, userId)),
    db.select({ status: tasks.status, dueDate: tasks.dueDate }).from(tasks).where(eq(tasks.projectId, activeProjectId)),
    db.select({ status: testCases.status }).from(testCases).innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id)).where(eq(testPlans.projectId, activeProjectId)),
    db.select({ count: count() }).from(testPlans).where(eq(testPlans.projectId, activeProjectId)),
    db.select({ count: count() }).from(milestones).where(eq(milestones.projectId, activeProjectId)),
    calculateSCurveGroup(activeProjectId),
  ]);

  // Calculate task counts
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter(t => t.status === "done").length;
  const inProgressTasks = allTasks.filter(t => t.status === "in_progress").length;
  const overdueTasks = allTasks.filter(t => t.status === "todo" && t.dueDate && t.dueDate < today).length;

  // Calculate QA counts
  const totalQA = allTestCases.length;
  const passedQA = allTestCases.filter(t => t.status === "pass").length;
  const failedQA = allTestCases.filter(t => t.status === "fail").length;
  const blockedQA = allTestCases.filter(t => t.status === "blocked").length;

  return {
    projects: projectCountResult[0].count,
    totalTasks,
    doneTasks,
    inProgressTasks,
    overdueTasks,
    totalQA,
    passedQA,
    failedQA,
    blockedQA,
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

const statusBadgeClass: Record<string, string> = {
  todo: "bg-slate-100 text-slate-600 border-slate-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  review: "bg-amber-50 text-amber-700 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const priorityBadgeClass: Record<string, string> = {
  low: "text-slate-500",
  medium: "text-amber-600",
  high: "text-red-600 font-semibold",
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

  const userRole = member[0].role;
  const personalSCurveGroup = (userRole === "developer")
    ? await calculateSCurveGroup(activeProjectId, userId)
    : null;

  let projectDevelopers: { id: string; name: string }[] = [];
  if (userRole === "admin" || userRole === "pm") {
    projectDevelopers = await db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(
        and(
          eq(projectMembers.projectId, activeProjectId),
          eq(projectMembers.role, "developer")
        )
      );
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentWeek = stats.sCurveGroup.overall.find((w: { weekStart: string; weekEnd: string; plannedCumulative: number; actualCumulative?: number | null }) =>
    w.weekStart <= todayStr && todayStr <= w.weekEnd
  );
  const plannedProgress = currentWeek ? (currentWeek.plannedCumulative * 100).toFixed(1) : "0";

  const totalExecutedQA = stats.passedQA + stats.failedQA + stats.blockedQA;
  const qaPassRate = totalExecutedQA > 0 ? Math.round((stats.passedQA / totalExecutedQA) * 100) : 0;
  const taskProgress = stats.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0;

  const actualProgress = currentWeek?.actualCumulative != null
    ? (currentWeek.actualCumulative * 100).toFixed(1)
    : null;

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Page Header */}
        <div>
          <h1 className="text-[19px] font-bold text-slate-900 tracking-tight leading-tight">
            {activeProject?.name}
          </h1>
          {activeProject?.description && (
            <p className="text-[13px] text-slate-500 mt-0.5">
              {activeProject.description}
            </p>
          )}
        </div>

        {/* Stat Cards — 5 col grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Milestones — Blue */}
          <Card className="border-0 shadow-sm bg-blue-50 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-0 pt-2 px-4">
              <CardTitle className="text-[11px] font-bold text-blue-700/70 uppercase tracking-wider">
                Milestones
              </CardTitle>
              <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
                <Target className="w-3.5 h-3.5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-3xl font-extrabold text-blue-900 leading-none mb-0.5">
                {stats.milestones}
              </div>
              <p className="text-[11px] text-blue-600/70">phases planned</p>
            </CardContent>
          </Card>

          {/* Tasks — Emerald */}
          <Card className="border-0 shadow-sm bg-emerald-50 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-0 pt-2 px-4">
              <CardTitle className="text-[11px] font-bold text-emerald-700/70 uppercase tracking-wider">
                Tasks
              </CardTitle>
              <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
                <CheckSquare className="w-3.5 h-3.5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-3xl font-extrabold text-emerald-900 leading-none mb-0.5">
                {stats.totalTasks}
              </div>
              <p className="text-[11px] text-emerald-700/70">
                <span className="font-semibold">{stats.doneTasks} done</span>
                {" · "}{stats.inProgressTasks} in progress
              </p>
            </CardContent>
          </Card>

          {/* Overdue — Red/Slate conditional */}
          <Card className={`border-0 shadow-sm overflow-hidden ${stats.overdueTasks > 0 ? "bg-red-50" : "bg-slate-50"}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-0 pt-2 px-4">
              <CardTitle className={`text-[11px] font-bold uppercase tracking-wider ${stats.overdueTasks > 0 ? "text-red-700/70" : "text-slate-500"}`}>
                Overdue
              </CardTitle>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm ${stats.overdueTasks > 0 ? "bg-red-500" : "bg-slate-400"}`}>
                <AlertCircle className="w-3.5 h-3.5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className={`text-3xl font-extrabold leading-none mb-0.5 ${stats.overdueTasks > 0 ? "text-red-700" : "text-slate-700"}`}>
                {stats.overdueTasks}
              </div>
              <p className={`text-[11px] ${stats.overdueTasks > 0 ? "text-red-600/70" : "text-slate-400"}`}>
                {stats.overdueTasks > 0 ? "tasks past due date" : "all on track ✓"}
              </p>
            </CardContent>
          </Card>

          {/* QA Pass Rate — Amber */}
          <Card className="border-0 shadow-sm bg-amber-50 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-0 pt-2 px-4">
              <CardTitle className="text-[11px] font-bold text-amber-700/70 uppercase tracking-wider">
                QA Pass Rate
              </CardTitle>
              <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center shadow-sm">
                <TestTube className="w-3.5 h-3.5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className={`text-3xl font-extrabold leading-none mb-0.5 ${qaPassRate >= 80 ? "text-emerald-600" : qaPassRate >= 50 ? "text-amber-700" : "text-red-600"}`}>
                {qaPassRate}%
              </div>
              <p className="text-[11px] text-amber-700/70">
                {stats.passedQA}✓ {stats.failedQA}✗ {stats.blockedQA} blocked
              </p>
            </CardContent>
          </Card>

          {/* S-Curve Progress — Violet */}
          <Card className="border-0 shadow-sm bg-violet-50 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-0 pt-2 px-4">
              <CardTitle className="text-[11px] font-bold text-violet-700/70 uppercase tracking-wider">
                Planned
              </CardTitle>
              <div className="w-7 h-7 bg-violet-500 rounded-lg flex items-center justify-center shadow-sm">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-3xl font-extrabold text-violet-900 leading-none mb-0.5">
                {plannedProgress}%
              </div>
              <p className="text-[11px] text-violet-700/70">
                actual{" "}
                <span className={
                  actualProgress == null
                    ? "text-violet-400"
                    : currentWeek?.actualCumulative != null && currentWeek.actualCumulative >= currentWeek.plannedCumulative
                    ? "text-emerald-600 font-semibold"
                    : "text-red-600 font-semibold"
                }>
                  {actualProgress != null ? `${actualProgress}%` : "—"}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* S-Curve Chart */}
        <SCurveChart
          sCurveGroup={stats.sCurveGroup}
          personalSCurveGroup={personalSCurveGroup || undefined}
          userRole={userRole}
          projectDevelopers={projectDevelopers}
          projectId={activeProjectId}
        />

        {/* Progress + QA Summary side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Task Progress */}
          <Card className="border border-slate-200/70 shadow-sm bg-white">
            <CardHeader className="pb-2 px-5 pt-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-700">Task Progress</CardTitle>
                <Link
                  href={`/${projectCode}/tasks`}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 transition-colors"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${taskProgress}%` }}
                  />
                </div>
                <span className="text-xl font-extrabold text-slate-900 min-w-[3rem] text-right tabular-nums">
                  {taskProgress}%
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  {stats.doneTasks} done
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  {stats.inProgressTasks} in progress
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                  {stats.totalTasks - stats.doneTasks - stats.inProgressTasks} todo
                </span>
              </div>
            </CardContent>
          </Card>

          {/* QA Summary */}
          <Card className="border border-slate-200/70 shadow-sm bg-white">
            <CardHeader className="pb-2 px-5 pt-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-700">QA Summary</CardTitle>
                <Link
                  href={`/${projectCode}/qa`}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 transition-colors"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                <div className="text-center pr-4">
                  <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{stats.testPlans}</div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Test Plans</p>
                </div>
                <div className="text-center px-4">
                  <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{stats.totalQA}</div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Test Cases</p>
                </div>
                <div className="text-center pl-4">
                  <div className={`text-2xl font-extrabold tabular-nums ${qaPassRate >= 80 ? "text-emerald-600" : qaPassRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                    {totalExecutedQA > 0 ? Math.round((stats.passedQA / totalExecutedQA) * 100) : 0}%
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Pass Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Milestones Timeline */}
        <Card className="border border-slate-200/70 shadow-sm bg-white">
          <CardHeader className="px-5 pt-5 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-700">Milestone Timeline</CardTitle>
              <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-200">
                {milestoneList.length} phases
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {milestoneList.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No milestones yet</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {milestoneList.map((ms) => (
                  <Link
                    key={ms.id}
                    href={`/${projectCode}/tasks?phase=${encodeURIComponent(ms.phase)}`}
                    className="flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group"
                  >
                    <div className="w-16 text-[11px] font-mono text-slate-400 font-bold group-hover:text-blue-600 transition-colors flex-shrink-0">
                      {ms.phase}
                    </div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:bg-blue-600 group-hover:scale-125 transition-all flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                        {ms.name}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{ms.module}</p>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium hidden sm:block whitespace-nowrap flex-shrink-0">
                      {ms.startDate} → {ms.endDate}
                    </div>
                    <span className={`text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full flex-shrink-0 ${
                      ms.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      ms.status === 'active' ? 'bg-blue-50 text-blue-700' :
                      ms.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {ms.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="border border-slate-200/70 shadow-sm bg-white">
          <CardHeader className="px-5 pt-5 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-700">Recent Tasks</CardTitle>
              <Link
                href={`/${projectCode}/tasks`}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 transition-colors"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {recentTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No tasks yet</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {task.taskCode && (
                          <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                            {task.taskCode}
                          </span>
                        )}
                        <p className="text-[13px] font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                          {task.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                        {task.epic && <span className="font-medium text-slate-500">{task.epic}</span>}
                        {task.epic && <span>·</span>}
                        <span className={`capitalize ${priorityBadgeClass[task.priority] || ""}`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase tracking-wider ml-3 flex-shrink-0 ${statusBadgeClass[task.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}
                    >
                      {statusLabels[task.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
