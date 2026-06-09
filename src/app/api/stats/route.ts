import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { projects, tasks, testCases, testPlans, milestones } from "@/db/schema";
import { count, eq, and, lt } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectCount = await db.select({ count: count() }).from(projects);
  const taskCount = await db.select({ count: count() }).from(tasks);
  const doneTasks = await db.select({ count: count() }).from(tasks).where(eq(tasks.status, "done"));
  const inProgressTasks = await db.select({ count: count() }).from(tasks).where(eq(tasks.status, "in_progress"));
  const qaCount = await db.select({ count: count() }).from(testCases);
  const passedQA = await db.select({ count: count() }).from(testCases).where(eq(testCases.status, "pass"));
  const failedQA = await db.select({ count: count() }).from(testCases).where(eq(testCases.status, "fail"));
  const planCount = await db.select({ count: count() }).from(testPlans);
  const milestoneCount = await db.select({ count: count() }).from(milestones);

  const today = new Date().toISOString().split("T")[0];
  const overdueTasks = await db
    .select({ count: count() })
    .from(tasks)
    .where(and(eq(tasks.status, "todo"), lt(tasks.dueDate, today)));

  // Get S-Curve data from project
  const project = await db.select().from(projects).limit(1);
  const sCurve = project[0]?.sCurveTarget ? JSON.parse(project[0].sCurveTarget as string) : [];

  return NextResponse.json({
    projects: projectCount[0].count,
    totalTasks: taskCount[0].count,
    doneTasks: doneTasks[0].count,
    inProgressTasks: inProgressTasks[0].count,
    overdueTasks: overdueTasks[0].count,
    totalQA: qaCount[0].count,
    passedQA: passedQA[0].count,
    failedQA: failedQA[0].count,
    testPlans: planCount[0].count,
    milestones: milestoneCount[0].count,
    sCurve,
  });
}
