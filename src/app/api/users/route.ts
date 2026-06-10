import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { users, NewUser, projectMembers, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
  }).from(users).orderBy(users.name);

  return NextResponse.json(allUsers);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only Admin or PM can create new users
  if (session.user.role !== "admin" && session.user.role !== "pm") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.email || !body.password || !body.name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check if user already exists
  const existingUser = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (existingUser.length > 0) {
    return NextResponse.json({ error: "User already exists with this email" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const userRole = body.role || "developer";

  const newUser: NewUser = {
    id: randomUUID(),
    name: body.name,
    email: body.email,
    passwordHash,
    role: userRole,
  };

  let safeUser: Omit<NewUser, "passwordHash">;

  // Atomically create user and assign to all existing projects
  await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values(newUser).returning();
    const { passwordHash: _, ...rest } = created;
    safeUser = rest;

    const allProjects = await tx.select().from(projects);
    for (const p of allProjects) {
      await tx.insert(projectMembers).values({
        id: randomUUID(),
        projectId: p.id,
        userId: created.id,
        role: userRole,
      });
    }
  });

  return NextResponse.json(safeUser!, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only Admin or PM can update users
  if (session.user.role !== "admin" && session.user.role !== "pm") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const existing = await db.select().from(users).where(eq(users.id, body.id)).limit(1);
  if (existing.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: any = {
    name: body.name ?? existing[0].name,
    role: body.role ?? existing[0].role,
  };

  if (body.password) {
    updateData.passwordHash = await bcrypt.hash(body.password, 10);
  }

  let safeUser: any;

  await db.transaction(async (tx) => {
    const updated = await tx.update(users).set(updateData).where(eq(users.id, body.id)).returning();
    const { passwordHash: _, ...rest } = updated[0];
    safeUser = rest;

    // Keep project member roles synchronized with global user roles
    if (body.role) {
      await tx.update(projectMembers)
        .set({ role: body.role })
        .where(eq(projectMembers.userId, body.id));
    }
  });

  return NextResponse.json(safeUser);
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only Admin or PM can delete users
  if (session.user.role !== "admin" && session.user.role !== "pm") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // Atomically delete project memberships first to respect database foreign keys
  await db.transaction(async (tx) => {
    await tx.delete(projectMembers).where(eq(projectMembers.userId, body.id));
    await tx.delete(users).where(eq(users.id, body.id));
  });

  return NextResponse.json({ success: true });
}

