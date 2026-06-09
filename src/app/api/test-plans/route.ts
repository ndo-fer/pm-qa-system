import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { testPlans, NewTestPlan } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  const allPlans = projectId
    ? await db.select().from(testPlans).where(eq(testPlans.projectId, projectId)).orderBy(desc(testPlans.createdAt))
    : await db.select().from(testPlans).orderBy(desc(testPlans.createdAt));

  return NextResponse.json(allPlans);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const newPlan: NewTestPlan = {
    id: randomUUID(),
    projectId: body.projectId,
    name: body.name,
    module: body.module,
    status: body.status || "draft",
  };

  const [created] = await db.insert(testPlans).values(newPlan).returning();
  return NextResponse.json(created, { status: 201 });
}
