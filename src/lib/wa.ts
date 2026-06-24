import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

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
    logger.info(`[WA GATEWAY - NO RECIPIENT PHONE] Target: ${recipientId || "Unknown"}, Message: ${message}`);
    return false;
  }

  const gatewayUrl = process.env.WA_GATEWAY_URL; // e.g. http://localhost:8000/send-message
  if (!gatewayUrl) {
    logger.info(`[WA GATEWAY MOCK] To: ${phone}, Message: ${message}`);
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
      logger.info(`[WA GATEWAY SUCCESS] Message successfully sent to ${phone}`);
      return true;
    } else {
      logger.error(`[WA GATEWAY FAILED] HTTP status ${response.status} sending to ${phone}`);
      return false;
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && error.name === "AbortError") {
      logger.error(`[WA GATEWAY TIMEOUT] Request timed out sending to ${phone}`);
    } else {
      logger.error(`[WA GATEWAY ERROR] Connection error sending to ${phone}: ${msg}`);
    }
    return false;
  }
}

export async function getWhatsAppStatus() {
  const gatewayUrl = process.env.WA_GATEWAY_URL;
  if (!gatewayUrl) {
    return {
      status: "MOCK_MODE",
      ready: true,
      message: "Gateway in mock mode (no WA_GATEWAY_URL set)",
    };
  }

  const statusUrl = gatewayUrl.replace("/send-message", "/status");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.WA_GATEWAY_API_KEY;
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(statusUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      return await response.json();
    } else {
      return {
        status: "ERROR",
        ready: false,
        error: `HTTP status ${response.status}`,
      };
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const msg = error instanceof Error ? error.message : String(error);
    return {
      status: "UNREACHABLE",
      ready: false,
      error: `Could not connect to gateway: ${msg}`,
    };
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
  return `🔴 *[PDJ-PM - BLOCKER ALERT]*

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
  return `🔄 *[PDJ-PM - SERAH TERIMA TUGAS]*

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
  return `📈 *[PDJ-PM - PROGRESS UPDATE]*

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
  return `❌ *[PDJ-PM - QA TEST FAIL]*

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
