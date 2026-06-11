import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { tasks, NewTask, projectMembers, projects, taskContributors, users, notifications } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";

const taskCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  projectId: z.string().optional(),
  projectCode: z.string().optional(),
  description: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().nullable().optional(),
  taskCode: z.string().nullable().optional(),
  epic: z.string().nullable().optional(),
  feature: z.string().nullable().optional(),
  taskType: z.string().nullable().optional(),
  srdRef: z.string().nullable().optional(),
  frCode: z.string().nullable().optional(),
  acceptanceCriteria: z.string().nullable().optional(),
  progress: z.number().min(0).max(100).default(0),
  blocker: z.string().nullable().optional(),
  sprintTarget: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  erpRole: z.enum(["administrator", "top_user", "user", "all_roles"]).default("all_roles"),
  screenshotUrl: z.string().nullable().optional(),
  roleSpecificFeatures: z.unknown().nullable().optional(),
});

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

  if (allTasks.length > 0) {
    const taskIds = allTasks.map((t) => t.id);
    const contributorsList = await db
      .select({
        id: taskContributors.id,
        taskId: taskContributors.taskId,
        developerId: taskContributors.developerId,
        individualProgress: taskContributors.individualProgress,
        isCurrentActive: taskContributors.isCurrentActive,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(taskContributors)
      .innerJoin(users, eq(taskContributors.developerId, users.id))
      .where(inArray(taskContributors.taskId, taskIds));

    const contributorsMap = new Map<string, any[]>();
    for (const c of contributorsList) {
      if (!contributorsMap.has(c.taskId)) {
        contributorsMap.set(c.taskId, []);
      }
      contributorsMap.get(c.taskId)!.push(c);
    }

    const tasksWithContributors = allTasks.map((t) => ({
      ...t,
      contributors: contributorsMap.get(t.id) || [],
    }));
    return NextResponse.json(tasksWithContributors);
  }

  return NextResponse.json([]);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Zod Validation
  const validationResult = taskCreateSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ error: "Validation failed", details: validationResult.error.flatten() }, { status: 400 });
  }

  const validatedData = validationResult.data;

  let targetProjectId = validatedData.projectId || session.user.projectId;
  if (validatedData.projectCode) {
    const project = await db.select().from(projects).where(eq(projects.code, validatedData.projectCode)).limit(1);
    if (project.length > 0) {
      targetProjectId = project[0].id;
    }
  }

  // Verify project membership
  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, targetProjectId), eq(projectMembers.userId, session.user.id)))
    .limit(1);
  if (member.length === 0) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  // Role Validation:
  // Admin & PM can create any tasks.
  // Developer & QA can ONLY create tasks if they are bugs (epic or taskType is 'BUG' / 'bug').
  const userRole = member[0].role;
  if (userRole === "developer" || userRole === "qa") {
    const isBug = 
      String(validatedData.epic).toUpperCase() === "BUG" || 
      String(validatedData.taskType).toUpperCase() === "BUG";
    if (!isBug) {
      return NextResponse.json({ 
        error: "Forbidden: Developer and QA roles are only authorized to create bug reports." 
      }, { status: 403 });
    }
  }

  const newTask: NewTask = {
    id: randomUUID(),
    projectId: targetProjectId,
    title: validatedData.title,
    description: validatedData.description || null,
    assigneeId: validatedData.assigneeId || null,
    status: validatedData.status || "todo",
    priority: validatedData.priority || "medium",
    dueDate: validatedData.dueDate || null,
    taskCode: validatedData.taskCode || null,
    epic: validatedData.epic || null,
    feature: validatedData.feature || null,
    taskType: validatedData.taskType || null,
    srdRef: validatedData.srdRef || null,
    frCode: validatedData.frCode || null,
    acceptanceCriteria: validatedData.acceptanceCriteria || null,
    progress: validatedData.progress || 0,
    blocker: validatedData.blocker || null,
    sprintTarget: validatedData.sprintTarget || null,
    phase: validatedData.phase || null,
    erpRole: validatedData.erpRole || "all_roles",
    roleSpecificFeatures: validatedData.roleSpecificFeatures || null,
    screenshotUrl: validatedData.screenshotUrl || null,
  };

  const [created] = await db.insert(tasks).values(newTask).returning();

  if (created.assigneeId && created.assigneeId !== session.user.id) {
    const senderName = session.user.name || "Seseorang";
    try {
      await db.insert(notifications).values({
        id: randomUUID(),
        recipientId: created.assigneeId,
        senderId: session.user.id,
        taskId: created.id,
        title: "Penugasan Tugas Baru",
        message: `${senderName} menugaskan tugas "${created.title}" kepada Anda.`,
        isRead: false,
      });
    } catch (err) {
      console.error("Failed to create task assignment notification:", err);
    }
  }

  return NextResponse.json(created, { status: 201 });
}

