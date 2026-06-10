import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify membership
  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, session.user.id)))
    .limit(1);
  if (member.length === 0) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (project.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project[0]);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify membership
  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, session.user.id)))
    .limit(1);
  if (member.length === 0) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const body = await request.json();
  const existing = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (existing.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db
    .update(projects)
    .set({
      name: body.name ?? existing[0].name,
      code: body.code ?? existing[0].code,
      description: body.description ?? existing[0].description,
      startDate: body.startDate ?? existing[0].startDate,
      endDate: body.endDate ?? existing[0].endDate,
      status: body.status ?? existing[0].status,
      sCurveTarget: body.sCurveTarget ?? existing[0].sCurveTarget,
      sCurveActual: body.sCurveActual ?? existing[0].sCurveActual,
    })
    .where(eq(projects.id, id))
    .returning();

  return NextResponse.json(updated[0]);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify membership
  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, session.user.id)))
    .limit(1);
  if (member.length === 0) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const existing = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (existing.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(projects).where(eq(projects.id, id));

  return NextResponse.json({ success: true });
}
