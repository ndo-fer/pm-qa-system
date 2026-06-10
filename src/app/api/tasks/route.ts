import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { tasks, NewTask, projectMembers, projects } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectIdParam = searchParams.get("projectId");
  const projectCodeParam = searchParams.get("projectCode");
  
  let targetProjectId = session.user.projectId;
  if (projectIdParam) {
    targetProjectId = projectIdParam;
  } else if (projectCodeParam) {
    const project = await db.select().from(projects).where(eq(projects.code, projectCodeParam)).limit(1);
    if (project.length > 0) {
      targetProjectId = project[0].id;
    }
  }

  // Verify membership
  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, targetProjectId), eq(projectMembers.userId, session.user.id)))
    .limit(1);
  if (member.length === 0) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const status = searchParams.get("status");
  const assigneeId = searchParams.get("assigneeId");
  const priority = searchParams.get("priority");
  const epic = searchParams.get("epic");
  const erpRole = searchParams.get("erpRole");

  const conditions = [eq(tasks.projectId, targetProjectId)];
  if (status) conditions.push(eq(tasks.status, status as "todo" | "in_progress" | "review" | "done"));
  if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId));
  if (priority) conditions.push(eq(tasks.priority, priority as "low" | "medium" | "high" | "urgent"));
  if (epic) conditions.push(eq(tasks.epic, epic));
  if (erpRole) conditions.push(eq(tasks.erpRole, erpRole as "administrator" | "top_user" | "user" | "all_roles"));

  const allTasks = await db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));

  return NextResponse.json(allTasks);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  let targetProjectId = body.projectId || session.user.projectId;
  if (body.projectCode) {
    const project = await db.select().from(projects).where(eq(projects.code, body.projectCode)).limit(1);
    if (project.length > 0) {
      targetProjectId = project[0].id;
    }
  }

  const newTask: NewTask = {
    id: randomUUID(),
    projectId: targetProjectId,
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

