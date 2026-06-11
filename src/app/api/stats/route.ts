import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { projects, tasks, testCases, testPlans, milestones, projectMembers } from "@/db/schema";
import { count, eq, and, lt } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeProjectId = session.user.projectId;
  if (!activeProjectId) {
    return NextResponse.json({
      projects: 0,
      totalTasks: 0,
      doneTasks: 0,
      inProgressTasks: 0,
      overdueTasks: 0,
      totalQA: 0,
      passedQA: 0,
      failedQA: 0,
      testPlans: 0,
      milestones: 0,
      sCurve: [],
    });
  }

  const today = new Date().toISOString().split("T")[0];

  const [
    projectCount,
    taskCount,
    doneTasks,
    inProgressTasks,
    qaCountResult,
    passedQAResult,
    failedQAResult,
    planCount,
    milestoneCount,
    overdueTasks
  ] = await Promise.all([
    db.select({ count: count() }).from(projectMembers).where(eq(projectMembers.userId, session.user.id)),
    db.select({ count: count() }).from(tasks).where(eq(tasks.projectId, activeProjectId)),
    db.select({ count: count() }).from(tasks).where(and(eq(tasks.projectId, activeProjectId), eq(tasks.status, "done"))),
    db.select({ count: count() }).from(tasks).where(and(eq(tasks.projectId, activeProjectId), eq(tasks.status, "in_progress"))),
    db.select({ count: count() }).from(testCases).innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id)).where(eq(testPlans.projectId, activeProjectId)),
    db.select({ count: count() }).from(testCases).innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id)).where(and(eq(testPlans.projectId, activeProjectId), eq(testCases.status, "pass"))),
    db.select({ count: count() }).from(testCases).innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id)).where(and(eq(testPlans.projectId, activeProjectId), eq(testCases.status, "fail"))),
    db.select({ count: count() }).from(testPlans).where(eq(testPlans.projectId, activeProjectId)),
    db.select({ count: count() }).from(milestones).where(eq(milestones.projectId, activeProjectId)),
    db.select({ count: count() }).from(tasks).where(and(eq(tasks.projectId, activeProjectId), eq(tasks.status, "todo"), lt(tasks.dueDate, today)))
  ]);

  const qaCount = qaCountResult[0]?.count || 0;
  const passedQA = passedQAResult[0]?.count || 0;
  const failedQA = failedQAResult[0]?.count || 0;

  // Get S-Curve data from active project
  const project = await db.select().from(projects).where(eq(projects.id, activeProjectId)).limit(1);
  let sCurve: unknown[] = [];
  if (project[0]?.sCurveTarget) {
    try {
      sCurve = typeof project[0].sCurveTarget === "string" 
        ? JSON.parse(project[0].sCurveTarget) 
        : project[0].sCurveTarget as unknown[];
    } catch {
      sCurve = project[0].sCurveTarget as unknown[];
    }
  }

  return NextResponse.json({
    projects: projectCount[0].count,
    totalTasks: taskCount[0].count,
    doneTasks: doneTasks[0].count,
    inProgressTasks: inProgressTasks[0].count,
    overdueTasks: overdueTasks[0].count,
    totalQA: qaCount,
    passedQA: passedQA,
    failedQA: failedQA,
    testPlans: planCount[0].count,
    milestones: milestoneCount[0].count,
    sCurve,
  });
}

