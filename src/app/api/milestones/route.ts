import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { milestones, projects } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";

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

  const allMilestones = await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, targetProjectId))
    .orderBy(asc(milestones.startDate));
  return NextResponse.json(allMilestones);
}

