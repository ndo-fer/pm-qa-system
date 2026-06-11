import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { testCases, testPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorizeProjectRole } from "@/lib/auth-helpers";

import { z } from "zod";

const testCaseUpdateSchema = z.object({
  caseNumber: z.string().min(1, "Case number is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  steps: z.string().nullable().optional(),
  expectedResult: z.string().nullable().optional(),
  status: z.enum(["pending", "pass", "fail", "blocked"]).optional(),
  actualResult: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  executedBy: z.string().nullable().optional(),
  executedAt: z.string().nullable().optional(),
  erpRole: z.enum(["administrator", "top_user", "user", "matrix"]).nullable().optional(),
  testType: z.enum(["functional", "permission", "workflow", "matrix"]).optional(),
  loginCredentials: z.unknown().nullable().optional(),
  attachmentUrl: z.string().nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = testCaseUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const validatedData = validation.data;

  const existingResult = await db
    .select({
      id: testCases.id,
      projectId: testPlans.projectId
    })
    .from(testCases)
    .innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id))
    .where(eq(testCases.id, id))
    .limit(1);

  if (existingResult.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const targetProjectId = existingResult[0].projectId;

  // Verify role
  const auth = await authorizeProjectRole(targetProjectId, session.user.id, ["admin", "pm", "qa"]);
  if (!auth.authorized) return auth.errorResponse!;

  const [updated] = await db
    .update(testCases)
    .set({
      caseNumber: validatedData.caseNumber,
      description: validatedData.description,
      steps: validatedData.steps,
      expectedResult: validatedData.expectedResult,
      status: validatedData.status,
      actualResult: validatedData.actualResult,
      notes: validatedData.notes,
      executedBy: validatedData.executedBy,
      executedAt: validatedData.executedAt,
      erpRole: validatedData.erpRole,
      testType: validatedData.testType,
      loginCredentials: validatedData.loginCredentials,
      attachmentUrl: validatedData.attachmentUrl,
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
    .select({
      id: testCases.id,
      projectId: testPlans.projectId
    })
    .from(testCases)
    .innerJoin(testPlans, eq(testCases.testPlanId, testPlans.id))
    .where(eq(testCases.id, id))
    .limit(1);

  if (existingResult.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const targetProjectId = existingResult[0].projectId;

  // Verify role
  const auth = await authorizeProjectRole(targetProjectId, session.user.id, ["admin", "pm", "qa"]);
  if (!auth.authorized) return auth.errorResponse!;

  const [deleted] = await db.delete(testCases).where(eq(testCases.id, id)).returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(deleted);
}
