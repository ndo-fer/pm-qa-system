import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { testPlans, testCases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authorizeProjectRole } from "@/lib/auth-helpers";
import { z } from "zod";

const testPlanUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  module: z.enum(["Pemasok", "Pelanggan", "Barang", "Katalog Lain", "Pengaturan", "Keuangan", "Kinerja"]).optional(),
  status: z.enum(["draft", "active", "completed"]).optional(),
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

  const validation = testPlanUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const validatedData = validation.data;

  // Find test plan to verify project context
  const planList = await db.select().from(testPlans).where(eq(testPlans.id, id)).limit(1);
  if (planList.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const targetProjectId = planList[0].projectId;

  // Authorize user role
  const auth = await authorizeProjectRole(targetProjectId, session.user.id, ["admin", "pm", "qa"]);
  if (!auth.authorized) return auth.errorResponse!;

  const [updated] = await db
    .update(testPlans)
    .set({
      name: validatedData.name,
      module: validatedData.module,
      status: validatedData.status,
    })
    .where(eq(testPlans.id, id))
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

  // Find test plan to verify project context
  const planList = await db.select().from(testPlans).where(eq(testPlans.id, id)).limit(1);
  if (planList.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const targetProjectId = planList[0].projectId;

  // Authorize user role
  const auth = await authorizeProjectRole(targetProjectId, session.user.id, ["admin", "pm", "qa"]);
  if (!auth.authorized) return auth.errorResponse!;

  let deleted: typeof testPlans.$inferSelect | null = null;
  try {
    await db.transaction(async (tx) => {
      // 1. Delete associated test cases first to respect DB foreign key constraints
      await tx.delete(testCases).where(eq(testCases.testPlanId, id));
      // 2. Delete the test plan itself
      const [res] = await tx.delete(testPlans).where(eq(testPlans.id, id)).returning();
      deleted = res || null;
    });
  } catch (error) {
    console.error("Delete test plan transaction failed:", error);
    return NextResponse.json({ error: "Failed to delete test plan due to a database constraint error" }, { status: 500 });
  }

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(deleted);
}
