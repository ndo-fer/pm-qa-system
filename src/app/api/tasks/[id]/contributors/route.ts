import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { tasks, taskContributors, taskActivities, users, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { authorizeProjectRole } from "@/lib/auth-helpers";

// GET: Fetch all contributors for a specific task
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;

  try {
    const contributors = await db
      .select({
        id: taskContributors.id,
        taskId: taskContributors.taskId,
        developerId: taskContributors.developerId,
        individualProgress: taskContributors.individualProgress,
        isCurrentActive: taskContributors.isCurrentActive,
        joinedAt: taskContributors.joinedAt,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(taskContributors)
      .innerJoin(users, eq(taskContributors.developerId, users.id))
      .where(eq(taskContributors.taskId, taskId));

    return NextResponse.json(contributors);
  } catch (error) {
    console.error("Failed to fetch contributors:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Add a new contributor to a task
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;
  
  let body: { developerId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { developerId } = body;
  if (!developerId) return NextResponse.json({ error: "developerId is required" }, { status: 400 });

  try {
    // 1. Verify task exists
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (task.length === 0) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const projectId = task[0].projectId;

    // 2. Verify current user's role in the project (only admin and pm can add contributors)
    const auth = await authorizeProjectRole(projectId, session.user.id, ["admin", "pm"]);
    if (!auth.authorized) return auth.errorResponse!;

    // 3. Verify target developer is a member of the project
    const targetMember = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, developerId)))
      .limit(1);
    if (targetMember.length === 0) {
      return NextResponse.json({ error: "Target developer is not a member of this project" }, { status: 400 });
    }

    // 4. Check if already a contributor
    const existing = await db
      .select()
      .from(taskContributors)
      .where(and(eq(taskContributors.taskId, taskId), eq(taskContributors.developerId, developerId)))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "User is already a contributor on this task" }, { status: 400 });
    }

    // 5. If this is the first contributor, make them active by default
    const countCheck = await db.select().from(taskContributors).where(eq(taskContributors.taskId, taskId));
    const isFirst = countCheck.length === 0;

    // 6. Insert contributor
    const newContrib = {
      id: randomUUID(),
      taskId,
      developerId,
      individualProgress: 0,
      isCurrentActive: isFirst,
    };
    await db.insert(taskContributors).values(newContrib);

    // 7. If first, sync task's assigneeId to this developer
    if (isFirst) {
      await db.update(tasks).set({ assigneeId: developerId }).where(eq(tasks.id, taskId));
    }

    // 8. Log activity
    await db.insert(taskActivities).values({
      id: randomUUID(),
      taskId,
      triggeredById: session.user.id,
      targetUserId: developerId,
      activityType: "assign",
      note: "Added as contributor to this task",
    });

    // 9. Recalculate average progress (with the new 0% contributor included)
    await recalculateTaskProgress(taskId);

    return NextResponse.json({ success: true, message: "Contributor added successfully" }, { status: 201 });
  } catch (error) {
    console.error("Failed to add contributor:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Update contributor progress or active status
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;

  let body: { developerId: string; progress?: number; isCurrentActive?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { developerId, progress, isCurrentActive } = body;
  if (!developerId) return NextResponse.json({ error: "developerId is required" }, { status: 400 });

  try {
    // 1. Verify task exists
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (task.length === 0) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const projectId = task[0].projectId;

    // 2. Verify project membership
    const member = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.user.id)))
      .limit(1);
    if (member.length === 0) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    // 3. Verify contributor exists
    const contrib = await db
      .select()
      .from(taskContributors)
      .where(and(eq(taskContributors.taskId, taskId), eq(taskContributors.developerId, developerId)))
      .limit(1);
    if (contrib.length === 0) return NextResponse.json({ error: "Contributor not found" }, { status: 404 });

    // 4. Build updates
    const updates: Record<string, any> = {};
    if (progress !== undefined) {
      updates.individualProgress = Math.max(0, Math.min(100, progress));
    }

    if (isCurrentActive !== undefined) {
      updates.isCurrentActive = isCurrentActive;
    }

    // 5. Apply updates
    if (Object.keys(updates).length > 0) {
      await db
        .update(taskContributors)
        .set(updates)
        .where(and(eq(taskContributors.taskId, taskId), eq(taskContributors.developerId, developerId)));

      // If setting to active: deactivate all OTHER contributors first, then update assigneeId
      if (isCurrentActive === true) {
        // Fetch all contributors for this task
        const allContribs = await db.select().from(taskContributors).where(eq(taskContributors.taskId, taskId));
        // Deactivate everyone except the target developer
        for (const c of allContribs) {
          if (c.developerId !== developerId) {
            await db
              .update(taskContributors)
              .set({ isCurrentActive: false })
              .where(eq(taskContributors.id, c.id));
          }
        }
        // Sync task active assignee
        await db.update(tasks).set({ assigneeId: developerId }).where(eq(tasks.id, taskId));
      }
    }

    // 6. Log progress update activity
    if (progress !== undefined) {
      await db.insert(taskActivities).values({
        id: randomUUID(),
        taskId,
        triggeredById: session.user.id,
        targetUserId: developerId,
        activityType: "progress_update",
        note: `Updated individual progress to ${progress}%`,
      });
      
      // Recalculate average progress
      await recalculateTaskProgress(taskId);
    }

    return NextResponse.json({ success: true, message: "Contributor updated successfully" });
  } catch (error) {
    console.error("Failed to update contributor:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper: Recalculate average progress of all task contributors and save to task
async function recalculateTaskProgress(taskId: string) {
  const allContribs = await db.select().from(taskContributors).where(eq(taskContributors.taskId, taskId));
  if (allContribs.length === 0) return;

  const totalProgress = allContribs.reduce((sum, c) => sum + c.individualProgress, 0);
  const averageProgress = Math.round(totalProgress / allContribs.length);

  // Determine tasks status based on average progress
  let newStatus: "todo" | "in_progress" | "review" | "done" | undefined;
  if (averageProgress === 100) {
    newStatus = "done";
  } else if (averageProgress > 0) {
    newStatus = "in_progress";
  }

  const updates: Record<string, any> = { progress: averageProgress };
  if (newStatus) {
    updates.status = newStatus;
  }

  await db.update(tasks).set(updates).where(eq(tasks.id, taskId));
}
