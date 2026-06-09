import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (task.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task[0]);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const existing = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (existing.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db
    .update(tasks)
    .set({
      title: body.title ?? existing[0].title,
      description: body.description ?? existing[0].description,
      assigneeId: body.assigneeId ?? existing[0].assigneeId,
      status: body.status ?? existing[0].status,
      priority: body.priority ?? existing[0].priority,
      dueDate: body.dueDate ?? existing[0].dueDate,
      taskCode: body.taskCode ?? existing[0].taskCode,
      epic: body.epic ?? existing[0].epic,
      feature: body.feature ?? existing[0].feature,
      taskType: body.taskType ?? existing[0].taskType,
      srdRef: body.srdRef ?? existing[0].srdRef,
      frCode: body.frCode ?? existing[0].frCode,
      acceptanceCriteria: body.acceptanceCriteria ?? existing[0].acceptanceCriteria,
      progress: body.progress ?? existing[0].progress,
      blocker: body.blocker ?? existing[0].blocker,
      sprintTarget: body.sprintTarget ?? existing[0].sprintTarget,
      phase: body.phase ?? existing[0].phase,
      isArchived: body.isArchived !== undefined ? body.isArchived : existing[0].isArchived,
      erpRole: body.erpRole ?? existing[0].erpRole,
      roleSpecificFeatures: body.roleSpecificFeatures ?? existing[0].roleSpecificFeatures,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tasks.id, id))
    .returning();

  return NextResponse.json(updated[0]);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (existing.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(tasks).where(eq(tasks.id, id));
  return NextResponse.json({ success: true });
}
