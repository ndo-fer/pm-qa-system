import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

interface SendWaParams {
  recipientPhone?: string;
  recipientId?: string;
  message: string;
}

export async function sendWhatsAppNotification({ recipientPhone, recipientId, message }: SendWaParams) {
  let phone = recipientPhone;

  if (recipientId && !phone) {
    const user = await db.select().from(users).where(eq(users.id, recipientId)).limit(1);
    if (user.length > 0) {
      phone = user[0].phone || undefined;
    }
  }

  if (!phone) {
    console.log(`[WA GATEWAY - NO RECIPIENT PHONE] Target: ${recipientId || "Unknown"}, Message: ${message}`);
    return false;
  }

  const gatewayUrl = process.env.WA_GATEWAY_URL; // e.g. http://localhost:8000/send-message
  if (!gatewayUrl) {
    console.log(`[WA GATEWAY MOCK] To: ${phone}, Message: ${message}`);
    return true;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.WA_GATEWAY_API_KEY;
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ to: phone, message }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      console.log(`[WA GATEWAY SUCCESS] Message successfully sent to ${phone}`);
      return true;
    } else {
      console.error(`[WA GATEWAY FAILED] HTTP status ${response.status} sending to ${phone}`);
      return false;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.error(`[WA GATEWAY TIMEOUT] Request timed out sending to ${phone}`);
    } else {
      console.error(`[WA GATEWAY ERROR] Connection error sending to ${phone}:`, error);
    }
    return false;
  }
}

// ==========================================
// WHATSAPP MESSAGE FORMATTING HELPERS
// ==========================================

export interface BlockerAlertParams {
  recipientName: string;
  senderName: string;
  taskCode: string;
  taskTitle: string;
  featureName: string;
  moduleName: string;
  priority: string;
  blockerNote: string;
  dueDate?: string;
}

export function formatBlockerAlert({
  recipientName,
  senderName,
  taskCode,
  taskTitle,
  featureName,
  moduleName,
  priority,
  blockerNote,
  dueDate = "Tidak ditentukan",
}: BlockerAlertParams): string {
  return `🔴 *[ERP-PM - BLOCKER ALERT]*

Halo *${recipientName}*,

Rekan Anda *${senderName}* melaporkan kendala/hambatan (*blocker*) yang disebabkan oleh bagian Anda pada tugas berikut:

📋 *Tugas:* ${taskCode} - ${taskTitle}
📂 *Fitur:* ${featureName} (${moduleName})
⚠️ *Prioritas:* *${priority}*

💬 *Detail Hambatan:*
"${blockerNote}"

⏱️ *Batas Waktu Tugas:* ${dueDate}

Mohon bantuannya untuk melakukan peninjauan atau menyelesaikan hambatan ini agar progres tim tidak terganggu. Terima kasih!`;
}

export interface TaskHandoverParams {
  recipientName: string;
  senderName: string;
  taskCode: string;
  taskTitle: string;
  featureName: string;
  moduleName: string;
  sprintTarget: string;
  dueDate?: string;
  note: string;
}

export function formatTaskHandover({
  recipientName,
  senderName,
  taskCode,
  taskTitle,
  featureName,
  moduleName,
  sprintTarget,
  dueDate = "Tidak ditentukan",
  note,
}: TaskHandoverParams): string {
  return `🔄 *[ERP-PM - SERAH TERIMA TUGAS]*

Halo *${recipientName}*,

Tugas berikut telah diserahterimakan kepada Anda oleh *${senderName}* untuk dilanjutkan:

📋 *Tugas:* ${taskCode} - ${taskTitle}
📂 *Fitur:* ${featureName} (${moduleName})
🚀 *Target Sprint:* ${sprintTarget}
⏱️ *Batas Waktu:* ${dueDate}

💬 *Catatan Handover:*
"${note}"

Status tugas saat ini otomatis dialihkan menjadi *In Progress* dengan Anda sebagai penanggung jawab utama. Silakan masuk ke dashboard ERP untuk info selengkapnya.`;
}

export interface ProgressUpdateParams {
  pmName: string;
  developerName: string;
  taskCode: string;
  taskTitle: string;
  progress: number;
  oldStatus: string;
  newStatus: string;
  note: string;
}

export function formatProgressUpdate({
  pmName,
  developerName,
  taskCode,
  taskTitle,
  progress,
  oldStatus,
  newStatus,
  note,
}: ProgressUpdateParams): string {
  return `📈 *[ERP-PM - PROGRESS UPDATE]*

Halo *${pmName}*,

Developer *${developerName}* telah memperbarui progres pengerjaan tugas berikut:

📋 *Tugas:* ${taskCode} - ${taskTitle}
📊 *Progres Saat Ini:* *${progress}%*
🔄 *Status:* \`${oldStatus}\` ➡️ \`${newStatus}\`

💬 *Catatan Update:*
"${note}"

Silakan tinjau kemajuan tugas ini di dashboard ERP Anda.`;
}

export interface QaFailAlertParams {
  developerName: string;
  qaName: string;
  taskCode: string;
  taskTitle: string;
  caseNumber: string;
  caseDescription: string;
  steps: string;
  expectedResult: string;
  actualResult: string;
  note: string;
}

export function formatQaFailAlert({
  developerName,
  qaName,
  taskCode,
  taskTitle,
  caseNumber,
  caseDescription,
  steps,
  expectedResult,
  actualResult,
  note,
}: QaFailAlertParams): string {
  return `❌ *[ERP-PM - QA TEST FAIL]*

Halo *${developerName}*,

Hasil pengujian untuk tugas Anda dinyatakan *FAIL / GAGAL* oleh QA *${qaName}*:

📋 *Tugas:* ${taskCode} - ${taskTitle}
🧪 *Kasus Uji:* ${caseNumber} - ${caseDescription}
🛠️ *Langkah Reproduksi:*
${steps}

💡 *Hasil yang Diharapkan:* ${expectedResult}
⚠️ *Hasil Aktual:* ${actualResult}

💬 *Catatan QA:*
"${note}"

Mohon segera diperbaiki agar pengujian ulang dapat dijadwalkan kembali. Terima kasih!`;
}
