import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { testCases, NewTestCase } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const testPlanId = searchParams.get("testPlanId");
  const erpRole = searchParams.get("erpRole");

  const conditions = [];
  if (testPlanId) conditions.push(eq(testCases.testPlanId, testPlanId));
  if (erpRole) conditions.push(eq(testCases.erpRole, erpRole as "administrator" | "top_user" | "user" | "matrix"));

  const allCases = conditions.length > 0
    ? await db.select().from(testCases).where(and(...conditions)).orderBy(testCases.caseNumber)
    : await db.select().from(testCases).orderBy(testCases.caseNumber);

  return NextResponse.json(allCases);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
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

  const existing = await db.select().from(testCases).where(eq(testCases.id, body.id)).limit(1);
  if (existing.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db
    .update(testCases)
    .set({
      actualResult: body.actualResult ?? existing[0].actualResult,
      status: body.status ?? existing[0].status,
      notes: body.notes ?? existing[0].notes,
      executedBy: body.executedBy ?? existing[0].executedBy,
      executedAt: body.executedAt ?? new Date().toISOString(),
      erpRole: body.erpRole ?? existing[0].erpRole,
      testType: body.testType ?? existing[0].testType,
      loginCredentials: body.loginCredentials ?? existing[0].loginCredentials,
    })
    .where(eq(testCases.id, body.id))
    .returning();

  return NextResponse.json(updated[0]);
}
