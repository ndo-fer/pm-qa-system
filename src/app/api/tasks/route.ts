import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { tasks, NewTask } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");
  const assigneeId = searchParams.get("assigneeId");
  const priority = searchParams.get("priority");
  const epic = searchParams.get("epic");
  const erpRole = searchParams.get("erpRole");

  const conditions = [];
  if (projectId) conditions.push(eq(tasks.projectId, projectId));
  if (status) conditions.push(eq(tasks.status, status as "todo" | "in_progress" | "review" | "done"));
  if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId));
  if (priority) conditions.push(eq(tasks.priority, priority as "low" | "medium" | "high" | "urgent"));
  if (epic) conditions.push(eq(tasks.epic, epic));
  if (erpRole) conditions.push(eq(tasks.erpRole, erpRole as "administrator" | "top_user" | "user" | "all_roles"));

  const allTasks = conditions.length > 0
    ? await db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt))
    : await db.select().from(tasks).orderBy(desc(tasks.createdAt));

  return NextResponse.json(allTasks);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const newTask: NewTask = {
    id: randomUUID(),
    projectId: body.projectId,
    title: body.title,
    description: body.description || null,
    assigneeId: body.assigneeId || null,
    status: body.status || "todo",
    priority: body.priority || "medium",
    dueDate: body.dueDate || null,
    taskCode: body.taskCode || null,
    epic: body.epic || null,
    feature: body.feature || null,
    taskType: body.taskType || null,
    srdRef: body.srdRef || null,
    frCode: body.frCode || null,
    acceptanceCriteria: body.acceptanceCriteria || null,
    progress: body.progress || 0,
    blocker: body.blocker || null,
    sprintTarget: body.sprintTarget || null,
    phase: body.phase || null,
    erpRole: body.erpRole || "all_roles",
    roleSpecificFeatures: body.roleSpecificFeatures || null,
  };

  const [created] = await db.insert(tasks).values(newTask).returning();
  return NextResponse.json(created, { status: 201 });
}
