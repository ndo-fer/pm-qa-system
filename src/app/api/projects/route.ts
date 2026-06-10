import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { projects, NewProject, projectMembers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allProjects = await db.select().from(projects).orderBy(projects.createdAt);
  return NextResponse.json(allProjects);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.code) {
    return NextResponse.json({ error: "Project code is required" }, { status: 400 });
  }

  const newProject: NewProject = {
    id: randomUUID(),
    name: body.name,
    code: body.code,
    description: body.description || null,
    startDate: body.startDate,
    endDate: body.endDate || null,
    status: body.status || "planned",
  };

  await db.transaction(async (tx) => {
    await tx.insert(projects).values(newProject);
    const allUsers = await tx.select().from(users);
    for (const u of allUsers) {
      await tx.insert(projectMembers).values({
        id: randomUUID(),
        projectId: newProject.id,
        userId: u.id,
        role: u.role,
      });
    }
  });

  return NextResponse.json(newProject, { status: 201 });
}

