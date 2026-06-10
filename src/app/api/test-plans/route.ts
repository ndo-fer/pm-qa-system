import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { testPlans, NewTestPlan, projectMembers, projects } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
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

  const allPlans = await db
    .select()
    .from(testPlans)
    .where(eq(testPlans.projectId, targetProjectId))
    .orderBy(desc(testPlans.createdAt));

  return NextResponse.json(allPlans);
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

  const newPlan: NewTestPlan = {
    id: randomUUID(),
    projectId: targetProjectId,
    name: body.name,
    module: body.module,
    status: body.status || "draft",
  };

  const [created] = await db.insert(testPlans).values(newPlan).returning();

  return NextResponse.json(created, { status: 201 });
}
