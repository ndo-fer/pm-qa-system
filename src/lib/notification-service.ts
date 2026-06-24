import { db } from "@/db";
import { notifications, notificationDispatches, users, tasks } from "@/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { sendWhatsAppNotification, formatBlockerAlert, formatTaskHandover } from "./wa";
import { randomUUID } from "crypto";
import { logger } from "./logger";

export class NotificationService {
  /**
   * Sends a WhatsApp message and creates an audit dispatch record in the database.
   */
  static async sendWhatsAppWithAudit({
    recipientId,
    message,
    notificationId,
  }: {
    recipientId: string;
    message: string;
    notificationId?: string;
  }): Promise<{ success: boolean; reason?: string }> {
    // 1. Fetch recipient's phone number
    const userResult = await db.select().from(users).where(eq(users.id, recipientId)).limit(1);
    if (userResult.length === 0) {
      return { success: false, reason: "user_not_found" };
    }
    const user = userResult[0];
    if (!user.phone) {
      return { success: false, reason: "missing_phone" };
    }

    const dispatchId = randomUUID();

    // 2. Insert a pending dispatch record
    await db.insert(notificationDispatches).values({
      id: dispatchId,
      notificationId: notificationId || null,
      channel: "whatsapp",
      status: "pending",
    });

    try {
      const sent = await sendWhatsAppNotification({
        recipientPhone: user.phone,
        message,
      });

      if (sent) {
        await db
          .update(notificationDispatches)
          .set({ status: "sent" })
          .where(eq(notificationDispatches.id, dispatchId));
        return { success: true };
      } else {
        await db
          .update(notificationDispatches)
          .set({ status: "failed", errorMessage: "Gateway returned failure status" })
          .where(eq(notificationDispatches.id, dispatchId));
        return { success: false, reason: "gateway_failure" };
      }
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await db
        .update(notificationDispatches)
        .set({ status: "failed", errorMessage: errMsg })
        .where(eq(notificationDispatches.id, dispatchId));
      return { success: false, reason: "connection_error" };
    }
  }

  /**
   * Creates in-app notifications for the recipient and all Admins transactionally.
   */
  static async createHandoverNotifications({
    tx,
    taskId,
    taskTitle,
    senderId,
    senderName,
    targetUserId,
    targetName,
    noticeType,
    note,
  }: {
    tx: any;
    taskId: string;
    taskTitle: string;
    senderId: string;
    senderName: string;
    targetUserId: string;
    targetName: string;
    noticeType: "handover_notice" | "blocker_notice";
    note?: string;
  }) {
    const title = noticeType === "handover_notice" ? "Serah Terima Tugas" : "Notifikasi Blocker";
    const message = noticeType === "handover_notice"
      ? `${senderName} menyerahkan tugas "${taskTitle}" kepada Anda.${note ? ` Catatan: ${note}` : ""}`
      : `${senderName} terhambat oleh Anda pada tugas "${taskTitle}".${note ? ` Catatan: ${note}` : ""}`;

    await tx.insert(notifications).values({
      id: randomUUID(),
      recipientId: targetUserId,
      senderId,
      taskId,
      title,
      message,
      isRead: false,
    });

    const admins = await tx.select().from(users).where(eq(users.role, "admin"));
    const adminNotifs = admins
      .filter((admin: any) => admin.id !== senderId && admin.id !== targetUserId)
      .map((admin: any) => ({
        id: randomUUID(),
        recipientId: admin.id,
        senderId,
        taskId,
        title: `[ADMIN ALERT] ${title}`,
        message: `${senderName} menyerahkan/menghambat tugas "${taskTitle}" ke ${targetName}.${note ? ` Catatan: ${note}` : ""}`,
        isRead: false,
      }));

    if (adminNotifs.length > 0) {
      await tx.insert(notifications).values(adminNotifs);
    }
  }

  /**
   * Checks if a WhatsApp notification was sent to this recipient for this task in the last 5 minutes.
   */
  static async isThrottled(taskId: string, recipientId: string): Promise<boolean> {
    try {
      const recent = await db
        .select()
        .from(notificationDispatches)
        .innerJoin(notifications, eq(notificationDispatches.notificationId, notifications.id))
        .where(
          and(
            eq(notifications.taskId, taskId),
            eq(notifications.recipientId, recipientId),
            eq(notificationDispatches.channel, "whatsapp"),
            gt(notificationDispatches.sentAt, sql`NOW() - INTERVAL '5 minutes'`)
          )
        )
        .limit(1);

      return recent.length > 0;
    } catch (err) {
      logger.error("Error checking notification throttle state:", err);
      return false; // Fallback to not throttled on database error
    }
  }
}
