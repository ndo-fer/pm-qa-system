import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { testCases, testPlans } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existingResult = await db
    .select({ id: testCases.id })
    .from(testCases)
    .innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id))
    .where(and(eq(testCases.id, id), eq(testPlans.projectId, session.user.projectId)))
    .limit(1);

  if (existingResult.length === 0) {
    return NextResponse.json({ error: "Not found or access denied" }, { status: 404 });
  }

  const [updated] = await db
    .update(testCases)
    .set({
      caseNumber: body.caseNumber,
      description: body.description,
      steps: body.steps,
      expectedResult: body.expectedResult,
      status: body.status,
      actualResult: body.actualResult,
      notes: body.notes,
      executedBy: body.executedBy,
      executedAt: body.executedAt,
    })
    .where(eq(testCases.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existingResult = await db
    .select({ id: testCases.id })
    .from(testCases)
    .innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id))
    .where(and(eq(testCases.id, id), eq(testPlans.projectId, session.user.projectId)))
    .limit(1);

  if (existingResult.length === 0) {
    return NextResponse.json({ error: "Not found or access denied" }, { status: 404 });
  }

  const [deleted] = await db.delete(testCases).where(eq(testCases.id, id)).returning();


  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(deleted);
}
