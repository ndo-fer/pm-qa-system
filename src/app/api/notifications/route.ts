import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { notifications, users, tasks, projects } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET: Retrieve current user's notifications
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userNotifications = await db
      .select({
        id: notifications.id,
        recipientId: notifications.recipientId,
        senderId: notifications.senderId,
        senderName: users.name,
        taskId: notifications.taskId,
        taskCode: tasks.taskCode,
        projectCode: projects.code,
        title: notifications.title,
        message: notifications.message,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.senderId, users.id))
      .leftJoin(tasks, eq(notifications.taskId, tasks.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(notifications.recipientId, session.user.id))
      .orderBy(desc(notifications.createdAt));

    return NextResponse.json(userNotifications);
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Mark a specific notification or all notifications as read
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; markAll?: boolean } = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    // Ignore parsing issues, default to empty body
  }

  const { id, markAll } = body;

  try {
    if (markAll) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.recipientId, session.user.id));
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    if (id) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, id), eq(notifications.recipientId, session.user.id)));
      return NextResponse.json({ success: true, message: "Notification marked as read" });
    }

    return NextResponse.json({ error: "Missing id or markAll parameter" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update notification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
