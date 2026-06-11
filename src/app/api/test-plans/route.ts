import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { testPlans, NewTestPlan, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { authorizeProjectRole } from "@/lib/auth-helpers";
import { z } from "zod";

const QA_MODULES = ["Pemasok", "Pelanggan", "Barang", "Katalog Lain", "Pengaturan", "Keuangan", "Kinerja"] as const;

const createPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required").max(255),
  module: z.enum(QA_MODULES, { error: "Invalid module" }),
  projectCode: z.string().optional(),
  projectId: z.string().optional(),
  status: z.enum(["draft", "active", "completed"]).default("draft"),
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

  // Verify project membership and role (Only admin, pm, and qa can access test plans)
  const auth = await authorizeProjectRole(targetProjectId, session.user.id, ["admin", "pm", "qa"]);
  if (!auth.authorized) return auth.errorResponse!;

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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = createPlanSchema.safeParse(rawBody);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const body = validation.data;
  let targetProjectId = body.projectId || session.user.projectId;
  if (body.projectCode) {
    const project = await db.select().from(projects).where(eq(projects.code, body.projectCode)).limit(1);
    if (project.length > 0) {
      targetProjectId = project[0].id;
    }
  }

  // Verify project membership and role (Only admin, pm, and qa can create test plans)
  const auth = await authorizeProjectRole(targetProjectId, session.user.id, ["admin", "pm", "qa"]);
  if (!auth.authorized) return auth.errorResponse!;

  const newPlan: NewTestPlan = {
    id: randomUUID(),
    projectId: targetProjectId,
    name: body.name,
    module: body.module,
    status: body.status,
  };

  const [created] = await db.insert(testPlans).values(newPlan).returning();

  return NextResponse.json(created, { status: 201 });
}
