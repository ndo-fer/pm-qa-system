import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { tasks, taskContributors, taskActivities, notifications, users, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { sendWhatsAppNotification, formatBlockerAlert } from "@/lib/wa";

const handoverBodySchema = z.object({
  targetUserId: z.string().min(1),
  noticeType: z.enum(["handover_notice", "blocker_notice"]),
  note: z.string().max(1000).optional().or(z.literal("")),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = handoverBodySchema.safeParse(body);
  if (!parsed.success) {
    console.warn("[API HANDOVER WARNING] Validation failed:", parsed.error.format());
    return NextResponse.json({ error: "Parameter tidak valid" }, { status: 400 });
  }

  const { targetUserId, noticeType, note } = parsed.data;

  try {
    // 1. Verify task exists
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (task.length === 0) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const projectId = task[0].projectId;

    // 2. Verify current user project membership
    const member = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.user.id)))
      .limit(1);
    if (member.length === 0) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    // 3. Verify target user project membership
    const targetMember = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, targetUserId)))
      .limit(1);
    if (targetMember.length === 0) {
      return NextResponse.json({ error: "Target user is not a member of this project" }, { status: 400 });
    }

    // 4. Resolve Names
    const senderName = session.user.name || "Seseorang";
    const targetUser = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    const targetName = targetUser.length > 0 ? targetUser[0].name : "Rekan";

    // 5. Wrap all updates and inserts in a transaction to guarantee atomicity
    await db.transaction(async (tx) => {
      if (noticeType === "handover_notice") {
        // Deactivate sender as active developer on this task
        await tx
          .update(taskContributors)
          .set({ isCurrentActive: false })
          .where(and(eq(taskContributors.taskId, taskId), eq(taskContributors.developerId, session.user.id)));

        // Activate target as active developer on this task
        const contribCheck = await tx
          .select()
          .from(taskContributors)
          .where(and(eq(taskContributors.taskId, taskId), eq(taskContributors.developerId, targetUserId)))
          .limit(1);

        if (contribCheck.length === 0) {
          // If not already a contributor, add them
          await tx.insert(taskContributors).values({
            id: randomUUID(),
            taskId,
            developerId: targetUserId,
            individualProgress: 0,
            isCurrentActive: true,
          });
        } else {
          await tx
            .update(taskContributors)
            .set({ isCurrentActive: true })
            .where(and(eq(taskContributors.taskId, taskId), eq(taskContributors.developerId, targetUserId)));
        }

        // Sync active assignee on task
        await tx.update(tasks).set({ assigneeId: targetUserId, blocker: null }).where(eq(tasks.id, taskId));

      } else if (noticeType === "blocker_notice") {
        // Set the task's blocker text to flag it on the Kanban board
        await tx
          .update(tasks)
          .set({ blocker: note ? `Blocked by ${targetName}: ${note}` : `Blocked by ${targetName}` })
          .where(eq(tasks.id, taskId));
      }

      // 6. Save activity log
      await tx.insert(taskActivities).values({
        id: randomUUID(),
        taskId,
        triggeredById: session.user.id,
        targetUserId,
        activityType: noticeType,
        note: note || "",
      });

      // 7. Create in-app notification for the target user
      const title = noticeType === "handover_notice" ? "Serah Terima Tugas" : "Notifikasi Blocker";
      const message = noticeType === "handover_notice"
        ? `${senderName} menyerahkan tugas "${task[0].title}" kepada Anda.${note ? ` Catatan: ${note}` : ""}`
        : `${senderName} terhambat oleh Anda pada tugas "${task[0].title}".${note ? ` Catatan: ${note}` : ""}`;

      await tx.insert(notifications).values({
        id: randomUUID(),
        recipientId: targetUserId,
        senderId: session.user.id,
        taskId,
        title,
        message,
        isRead: false,
      });

      // 8. Create in-app notifications for all Admin users in a single bulk operation
      const admins = await tx.select().from(users).where(eq(users.role, "admin"));
      const adminNotifs = admins
        .filter((admin) => admin.id !== session.user.id && admin.id !== targetUserId)
        .map((admin) => ({
          id: randomUUID(),
          recipientId: admin.id,
          senderId: session.user.id,
          taskId,
          title: `[ADMIN ALERT] ${title}`,
          message: `${senderName} menyerahkan/menghambat tugas "${task[0].title}" ke ${targetName}.${note ? ` Catatan: ${note}` : ""}`,
          isRead: false,
        }));

      if (adminNotifs.length > 0) {
        await tx.insert(notifications).values(adminNotifs);
      }
    });

    // Send automated WhatsApp message after transaction commits successfully, if it's an urgent/high priority blocker
    if (noticeType === "blocker_notice" && (task[0].priority === "high" || task[0].priority === "urgent")) {
      try {
        const waMessage = formatBlockerAlert({
          recipientName: targetName,
          senderName,
          taskCode: task[0].taskCode || "PM-TASK",
          taskTitle: task[0].title,
          featureName: task[0].feature || "Umum",
          moduleName: task[0].phase || "Sistem",
          priority: task[0].priority || "medium",
          blockerNote: note || "",
          dueDate: task[0].dueDate || undefined,
        });
        await sendWhatsAppNotification({
          recipientId: targetUserId,
          message: waMessage,
        });
      } catch (err) {
        console.error("Auto WhatsApp blocker alert failed:", err);
      }
    }

    return NextResponse.json({ success: true, message: "Notice sent successfully" });
  } catch (error) {
    console.error("Failed to send notice:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
