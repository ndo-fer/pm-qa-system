import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { notifications, taskActivities, tasks, users } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { sendWhatsAppNotification, formatTaskHandover, formatBlockerAlert } from "@/lib/wa";
import { z } from "zod";

const paramSchema = z.string().min(1);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Hanya Admin atau PM yang diperbolehkan memicu WhatsApp secara manual
  if (session.user.role !== "admin" && session.user.role !== "pm") {
    return NextResponse.json({ error: "Forbidden: Hanya Admin atau PM yang dapat memicu WhatsApp manual" }, { status: 403 });
  }

  const { id: rawNotificationId } = await params;
  const parsedId = paramSchema.safeParse(rawNotificationId);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid notification ID format" }, { status: 400 });
  }
  const notificationId = parsedId.data;

  try {
    // 1. Ambil Data Notifikasi
    const notifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (notifs.length === 0) {
      return NextResponse.json({ error: "Notifikasi tidak ditemukan" }, { status: 404 });
    }

    const notification = notifs[0];

    // Pastikan notifikasi ini memang milik admin yang sedang login
    if (notification.recipientId !== session.user.id) {
      return NextResponse.json({ error: "Akses ditolak: Notifikasi bukan milik Anda" }, { status: 403 });
    }

    if (!notification.taskId) {
      return NextResponse.json({ error: "Tidak ada tugas yang terasosiasi dengan notifikasi ini" }, { status: 400 });
    }

    // 2. Ambil aktivitas terbaru untuk tugas ini yang dipicu oleh pengirim notifikasi
    // berupa handover_notice atau blocker_notice
    const activities = await db
      .select()
      .from(taskActivities)
      .where(
        and(
          eq(taskActivities.taskId, notification.taskId),
          eq(taskActivities.triggeredById, notification.senderId),
          inArray(taskActivities.activityType, ["handover_notice", "blocker_notice"])
        )
      )
      .orderBy(desc(taskActivities.createdAt))
      .limit(1);

    if (activities.length === 0) {
      return NextResponse.json({ error: "Aktivitas notice tugas yang cocok tidak ditemukan" }, { status: 404 });
    }

    const activity = activities[0];
    const targetUserId = activity.targetUserId;
    if (!targetUserId) {
      return NextResponse.json({ error: "Developer tujuan tidak ditemukan pada aktivitas ini" }, { status: 400 });
    }

    // 3. Ambil detail tugas terkait
    const taskDetails = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, notification.taskId))
      .limit(1);

    if (taskDetails.length === 0) {
      return NextResponse.json({ error: "Tugas terkait tidak ditemukan" }, { status: 404 });
    }
    const task = taskDetails[0];

    // 4. Resolusi Nama Pengirim dan Penerima WA
    const sender = await db.select().from(users).where(eq(users.id, notification.senderId)).limit(1);
    const senderName = sender.length > 0 ? sender[0].name : "Seseorang";

    const targetUser = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    const targetName = targetUser.length > 0 ? targetUser[0].name : "Rekan";

    // 5. Susun Pesan Berdasarkan Jenis Notice (Handover atau Blocker)
    let waMessage = "";
    if (activity.activityType === "handover_notice") {
      waMessage = formatTaskHandover({
        recipientName: targetName,
        senderName,
        taskCode: task.taskCode || "PM-TASK",
        taskTitle: task.title,
        featureName: task.feature || "Umum",
        moduleName: task.phase || "Sistem",
        sprintTarget: task.sprintTarget || "Sprint Aktif",
        dueDate: task.dueDate || undefined,
        note: activity.note || "",
      });
    } else {
      waMessage = formatBlockerAlert({
        recipientName: targetName,
        senderName,
        taskCode: task.taskCode || "PM-TASK",
        taskTitle: task.title,
        featureName: task.feature || "Umum",
        moduleName: task.phase || "Sistem",
        priority: task.priority || "medium",
        blockerNote: activity.note || "",
        dueDate: task.dueDate || undefined,
      });
    }

    // 6. Kirim WhatsApp menggunakan gateway lokal
    const success = await sendWhatsAppNotification({
      recipientId: targetUserId,
      message: waMessage,
    });

    if (!success) {
      return NextResponse.json({ error: "Gagal mengirim pesan WhatsApp via Gateway lokal." }, { status: 502 });
    }

    // 7. Perbarui judul dan pesan notifikasi in-app agar Admin mengetahui status pengiriman (dan menghindari double-click)
    const updatedTitle = notification.title.startsWith("[ADMIN ALERT]")
      ? notification.title.replace("[ADMIN ALERT]", "[WA SENT]")
      : `[WA SENT] ${notification.title}`;
      
    await db
      .update(notifications)
      .set({
        title: updatedTitle,
        message: `${notification.message} (WhatsApp Berhasil Dikirim)`
      })
      .where(eq(notifications.id, notification.id));

    return NextResponse.json({ success: true, message: "Notifikasi WhatsApp berhasil dikirim!" });
  } catch (error) {
    console.error("Gagal mengirim WA manual dari notifikasi admin:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
