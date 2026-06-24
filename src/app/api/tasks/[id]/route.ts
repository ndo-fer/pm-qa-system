import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { tasks, projectMembers, taskContributors, users, notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { randomUUID } from "crypto";
import { hasPermission } from "@/lib/permissions";

const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
  taskCode: z.string().nullable().optional(),
  epic: z.string().nullable().optional(),
  feature: z.string().nullable().optional(),
  taskType: z.string().nullable().optional(),
  srdRef: z.string().nullable().optional(),
  frCode: z.string().nullable().optional(),
  acceptanceCriteria: z.string().nullable().optional(),
  progress: z.number().min(0).max(100).optional(),
  blocker: z.string().nullable().optional(),
  sprintTarget: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  isArchived: z.number().optional(),
  erpRole: z.enum(["administrator", "top_user", "user", "all_roles"]).optional(),
  screenshotUrl: z.string().nullable().optional(),
  roleSpecificFeatures: z.unknown().nullable().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.projectId, session.user.projectId))).limit(1);
  if (task.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  
  // Fetch contributors
  const contributors = await db
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
    .where(eq(taskContributors.taskId, id));

  return NextResponse.json({
    ...task[0],
    contributors,
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Zod Validation
  const validationResult = taskUpdateSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ error: "Validation failed", details: validationResult.error.flatten() }, { status: 400 });
  }

  const validatedData = validationResult.data;

  const existing = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.projectId, session.user.projectId))).limit(1);
  if (existing.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify project membership & role
  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, session.user.projectId), eq(projectMembers.userId, session.user.id)))
    .limit(1);
  if (member.length === 0) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  // Role Validation:
  const canUpdateTask = hasPermission(session.user.role, session.user.permissions, "tasks:update");
  const canDeleteTask = hasPermission(session.user.role, session.user.permissions, "tasks:delete");

  if (!canUpdateTask) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to update tasks." }, { status: 403 });
  }

  // If user doesn't have "tasks:delete" (used as an admin proxy), they can only edit specific fields.
  if (!canDeleteTask) {
    const adminFields: Array<keyof typeof validatedData> = [
      "title",
      "priority",
      "dueDate",
      "taskCode",
      "epic",
      "feature",
      "taskType",
      "srdRef",
      "frCode",
      "sprintTarget",
      "phase",
      "isArchived",
      "erpRole",
      "roleSpecificFeatures"
    ];

    for (const field of adminFields) {
      if (validatedData[field] !== undefined && validatedData[field] !== existing[0][field as keyof typeof tasks.$inferSelect]) {
        return NextResponse.json({
          error: `Forbidden: You do not have admin permissions to edit field '${field}'.`
        }, { status: 403 });
      }
    }
  }

  const oldAssigneeId = existing[0].assigneeId;
  const newAssigneeId = validatedData.assigneeId;

  const updated = await db
    .update(tasks)
    .set({
      title: validatedData.title ?? existing[0].title,
      description: validatedData.description !== undefined ? validatedData.description : existing[0].description,
      assigneeId: validatedData.assigneeId !== undefined ? validatedData.assigneeId : existing[0].assigneeId,
      status: validatedData.status ?? existing[0].status,
      priority: validatedData.priority ?? existing[0].priority,
      dueDate: validatedData.dueDate !== undefined ? validatedData.dueDate : existing[0].dueDate,
      taskCode: validatedData.taskCode !== undefined ? validatedData.taskCode : existing[0].taskCode,
      epic: validatedData.epic !== undefined ? validatedData.epic : existing[0].epic,
      feature: validatedData.feature !== undefined ? validatedData.feature : existing[0].feature,
      taskType: validatedData.taskType !== undefined ? validatedData.taskType : existing[0].taskType,
      srdRef: validatedData.srdRef !== undefined ? validatedData.srdRef : existing[0].srdRef,
      frCode: validatedData.frCode !== undefined ? validatedData.frCode : existing[0].frCode,
      acceptanceCriteria: validatedData.acceptanceCriteria !== undefined ? validatedData.acceptanceCriteria : existing[0].acceptanceCriteria,
      progress: validatedData.progress ?? existing[0].progress,
      blocker: validatedData.blocker !== undefined ? validatedData.blocker : existing[0].blocker,
      sprintTarget: validatedData.sprintTarget !== undefined ? validatedData.sprintTarget : existing[0].sprintTarget,
      phase: validatedData.phase !== undefined ? validatedData.phase : existing[0].phase,
      isArchived: validatedData.isArchived !== undefined ? validatedData.isArchived : existing[0].isArchived,
      erpRole: validatedData.erpRole ?? existing[0].erpRole,
      roleSpecificFeatures: validatedData.roleSpecificFeatures !== undefined ? validatedData.roleSpecificFeatures : existing[0].roleSpecificFeatures,
      screenshotUrl: validatedData.screenshotUrl !== undefined ? validatedData.screenshotUrl : existing[0].screenshotUrl,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.projectId, session.user.projectId)))
    .returning();

  if (newAssigneeId !== undefined && newAssigneeId !== oldAssigneeId && newAssigneeId !== null && newAssigneeId !== session.user.id) {
    const senderName = session.user.name || "Seseorang";
    try {
      await db.insert(notifications).values({
        id: randomUUID(),
        recipientId: newAssigneeId,
        senderId: session.user.id,
        taskId: id,
        title: "Perubahan Penugasan Tugas",
        message: `${senderName} menugaskan tugas "${updated[0].title}" kepada Anda.`,
        isRead: false,
      });
    } catch (err) {
      console.error("Failed to create task reassignment notification:", err);
    }
  }

  // 1. QA Feedback Loop
  const oldStatus = existing[0].status as string;
  const newStatus = validatedData.status as string | undefined;
  if (newStatus !== undefined && newStatus !== oldStatus) {
    if (newStatus === "review") {
      try {
        const qas = await db
          .select()
          .from(projectMembers)
          .where(and(eq(projectMembers.projectId, session.user.projectId), eq(projectMembers.role, "qa")));
        if (qas.length > 0) {
          const senderName = session.user.name || "Seseorang";
          const qaNotifs = qas.map((q) => ({
            id: randomUUID(),
            recipientId: q.userId,
            senderId: session.user.id,
            taskId: id,
            title: "Tugas Siap Di-review",
            message: `${senderName} mengajukan tugas "${updated[0].title}" ke kolom review.`,
            isRead: false,
          }));
          await db.insert(notifications).values(qaNotifs);
        }
      } catch (err) {
        console.error("Failed to send QA review notifications:", err);
      }
    } else if (oldStatus === "review" && newStatus !== "review" && newStatus !== "done") {
      if (updated[0].assigneeId && updated[0].assigneeId !== session.user.id) {
        const senderName = session.user.name || "Seseorang";
        const statusLabels: Record<string, string> = {
          todo: "To Do",
          in_progress: "In Progress",
        };
        const targetStatus = statusLabels[newStatus] || newStatus;
        try {
          await db.insert(notifications).values({
            id: randomUUID(),
            recipientId: updated[0].assigneeId,
            senderId: session.user.id,
            taskId: id,
            title: "Tugas Dikembalikan / Gagal QA",
            message: `${senderName} mengembalikan tugas "${updated[0].title}" ke status ${targetStatus}.`,
            isRead: false,
          });
        } catch (err) {
          console.error("Failed to send QA rejection notification:", err);
        }
      }
    }
  }

  // 2. Blocker Cleared
  const oldBlocker = existing[0].blocker;
  const newBlocker = validatedData.blocker;
  const isBlockerCleared = oldBlocker && (newBlocker === null || newBlocker === "");
  if (isBlockerCleared) {
    if (updated[0].assigneeId && updated[0].assigneeId !== session.user.id) {
      const senderName = session.user.name || "Seseorang";
      try {
        await db.insert(notifications).values({
          id: randomUUID(),
          recipientId: updated[0].assigneeId,
          senderId: session.user.id,
          taskId: id,
          title: "Hambatan Diselesaikan (Blocker Cleared)",
          message: `${senderName} telah menghapus hambatan pada tugas "${updated[0].title}". Anda dapat melanjutkan pekerjaan.`,
          isRead: false,
        });
      } catch (err) {
        console.error("Failed to send blocker cleared notification:", err);
      }
    }
  }

  return NextResponse.json(updated[0]);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify project membership & role
  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, session.user.projectId), eq(projectMembers.userId, session.user.id)))
    .limit(1);
  if (member.length === 0) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const canDeleteTask = hasPermission(session.user.role, session.user.permissions, "tasks:delete");
  if (!canDeleteTask) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to delete tasks." }, { status: 403 });
  }

  const existing = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.projectId, session.user.projectId))).limit(1);
  if (existing.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.projectId, session.user.projectId)));
  return NextResponse.json({ success: true });
}

