import { google } from "googleapis";
import { logger } from "./logger";

export async function getSheetsClient() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !rawPrivateKey) {
    throw new Error("Google API credentials (EMAIL or PRIVATE_KEY) are not set in environment variables.");
  }
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SPREADSHEET_ID is not set in environment variables.");
  }

  const cleanKey = rawPrivateKey.startsWith('"') && rawPrivateKey.endsWith('"')
    ? rawPrivateKey.substring(1, rawPrivateKey.length - 1)
    : rawPrivateKey;
  const privateKey = cleanKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

/**
 * Wraps any Google Sheets API call with exponential-backoff retry logic.
 * Retries on rate-limit (429) and transient server errors (5xx).
 * Throws immediately on permanent client errors (4xx other than 429).
 */
export async function sheetsRequest<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      const errObj = err as Record<string, unknown> & { response?: { status?: number }; code?: number };
      const status: number | undefined =
        errObj?.response?.status ?? (typeof errObj?.code === "number" ? errObj.code : undefined);
      const isRetryable = status === 429 || (status !== undefined && status >= 500);
      attempt++;

      if (!isRetryable || attempt > maxRetries) {
        throw err;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s (+ ≤500ms jitter)
      const delay = Math.min(1_000 * Math.pow(2, attempt - 1), 16_000) + Math.random() * 500;
      logger.warn(
        `[SHEETS RETRY] HTTP ${status} — retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})`
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}
