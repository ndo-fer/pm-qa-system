import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { taskActivities, users, projectMembers, tasks } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;

  try {
    // 1. Verify task exists
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (task.length === 0) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // 2. Verify project membership
    const member = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, task[0].projectId), eq(projectMembers.userId, session.user.id)))
      .limit(1);
    if (member.length === 0) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    // 3. Fetch activities
    const activities = await db
      .select({
        id: taskActivities.id,
        taskId: taskActivities.taskId,
        triggeredById: taskActivities.triggeredById,
        targetUserId: taskActivities.targetUserId,
        activityType: taskActivities.activityType,
        note: taskActivities.note,
        createdAt: taskActivities.createdAt,
        actorName: users.name,
      })
      .from(taskActivities)
      .leftJoin(users, eq(taskActivities.triggeredById, users.id))
      .where(eq(taskActivities.taskId, taskId))
      .orderBy(desc(taskActivities.createdAt));

    // Resolve target user names — scoped to only IDs present in this activity list
    const targetUserIds = activities
      .map((a) => a.targetUserId)
      .filter((id): id is string => !!id);

    const targetUsersResult = targetUserIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, targetUserIds))
      : [];

    const userMap = new Map(targetUsersResult.map((u) => [u.id, u.name]));

    const enrichedActivities = activities.map((act) => ({
      ...act,
      targetUserName: act.targetUserId ? userMap.get(act.targetUserId) ?? "Seseorang" : null,
    }));

    return NextResponse.json(enrichedActivities);
  } catch (error) {
    console.error("Failed to fetch activities:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
