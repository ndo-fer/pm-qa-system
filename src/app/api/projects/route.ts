import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { projects, NewProject } from "@/db/schema";
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
  const newProject: NewProject = {
    id: randomUUID(),
    name: body.name,
    description: body.description || null,
    startDate: body.startDate,
    endDate: body.endDate || null,
    status: body.status || "planned",
  };

  const [created] = await db.insert(projects).values(newProject).returning();
  return NextResponse.json(created, { status: 201 });
}
