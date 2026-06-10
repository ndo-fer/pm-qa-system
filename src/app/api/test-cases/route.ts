import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { testCases, NewTestCase, testPlans, projectMembers, projects } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const testPlanId = searchParams.get("testPlanId");
  const erpRole = searchParams.get("erpRole");
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

  const conditions = [];
  conditions.push(eq(testPlans.projectId, targetProjectId));
  if (testPlanId) conditions.push(eq(testCases.testPlanId, testPlanId));
  if (erpRole) conditions.push(eq(testCases.erpRole, erpRole as "administrator" | "top_user" | "user" | "matrix"));

  const allCases = await db
    .select({
      id: testCases.id,
      testPlanId: testCases.testPlanId,
      caseNumber: testCases.caseNumber,
      description: testCases.description,
      steps: testCases.steps,
      expectedResult: testCases.expectedResult,
      actualResult: testCases.actualResult,
      status: testCases.status,
      notes: testCases.notes,
      executedBy: testCases.executedBy,
      executedAt: testCases.executedAt,
      erpRole: testCases.erpRole,
      testType: testCases.testType,
      loginCredentials: testCases.loginCredentials,
    })
    .from(testCases)
    .innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id))
    .where(and(...conditions))
    .orderBy(testCases.caseNumber);

  return NextResponse.json(allCases);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  
  // Verify ownership of the test plan
  const plan = await db
    .select()
    .from(testPlans)
    .where(eq(testPlans.id, body.testPlanId))
    .limit(1);
  if (plan.length === 0) {
    return NextResponse.json({ error: "Test plan not found" }, { status: 400 });
  }

  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, plan[0].projectId), eq(projectMembers.userId, session.user.id)))
    .limit(1);
  if (member.length === 0) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const newCase: NewTestCase = {
    id: randomUUID(),
    testPlanId: body.testPlanId,
    caseNumber: body.caseNumber,
    description: body.description,
    steps: body.steps || null,
    expectedResult: body.expectedResult || null,
    status: body.status || "pending",
    erpRole: body.erpRole || null,
    testType: body.testType || "functional",
    loginCredentials: body.loginCredentials || null,
  };

  const [created] = await db.insert(testCases).values(newCase).returning();
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existingResult = await db
    .select({
      id: testCases.id,
      actualResult: testCases.actualResult,
      status: testCases.status,
      notes: testCases.notes,
      executedBy: testCases.executedBy,
      executedAt: testCases.executedAt,
      erpRole: testCases.erpRole,
      testType: testCases.testType,
      loginCredentials: testCases.loginCredentials,
      projectId: testPlans.projectId,
    })
    .from(testCases)
    .innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id))
    .where(eq(testCases.id, body.id))
    .limit(1);

  if (existingResult.length === 0) {
    return NextResponse.json({ error: "Test case not found" }, { status: 404 });
  }

  const existing = existingResult[0];

  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, existing.projectId), eq(projectMembers.userId, session.user.id)))
    .limit(1);
  if (member.length === 0) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const updated = await db
    .update(testCases)
    .set({
      actualResult: body.actualResult ?? existing.actualResult,
      status: body.status ?? existing.status,
      notes: body.notes ?? existing.notes,
      executedBy: body.executedBy ?? existing.executedBy,
      executedAt: body.executedAt ?? new Date().toISOString(),
      erpRole: body.erpRole ?? existing.erpRole,
      testType: body.testType ?? existing.testType,
      loginCredentials: body.loginCredentials ?? existing.loginCredentials,
    })
    .where(eq(testCases.id, body.id))
    .returning();

  return NextResponse.json(updated[0]);
}

