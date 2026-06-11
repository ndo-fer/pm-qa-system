import { NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

const DRIVE_FOLDER_ID = "1S47Yw3hNVh0hQZfEw1Gr1YvoAtxL9mit";

// ─── Auth ────────────────────────────────────────────────────────────────────

async function getClients() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!clientEmail || !rawPrivateKey) throw new Error("Google credentials not set.");
  if (!spreadsheetId) throw new Error("GOOGLE_SPREADSHEET_ID not set.");

  const cleanKey = rawPrivateKey.startsWith('"') && rawPrivateKey.endsWith('"')
    ? rawPrivateKey.slice(1, -1)
    : rawPrivateKey;
  const privateKey = cleanKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ],
  });
  await auth.authorize();

  return {
    drive: google.drive({ version: "v3", auth }),
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId,
  };
}

// ─── Text normalisation helpers (ported from Apps Script) ─────────────────────

function normalizeText(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[_\-\.]/g, " ")   // separators → spaces
    .replace(/[^a-z0-9\s]/g, "") // strip non-alphanumeric
    .replace(/\s+/g, " ")
    .trim();
}

function removeExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

// ─── File collection (recursive, ported from collectImageFilesRecursive_) ────

interface DriveFile {
  id: string;
  name: string;
  url: string;
  folderName: string;
  folderUrl: string;
  normalizedName: string;
}

async function collectImageFilesRecursive(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  folderName: string,
  folderUrl: string,
  output: DriveFile[]
): Promise<void> {
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, webViewLink)",
      pageSize: 200,
      ...(pageToken ? { pageToken } : {}),
    });

    const files = res.data.files || [];
    for (const f of files) {
      if (f.mimeType?.startsWith("image/")) {
        output.push({
          id: f.id!,
          name: f.name!,
          url: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
          folderName,
          folderUrl,
          normalizedName: normalizeText(removeExtension(f.name!)),
        });
      } else if (f.mimeType === "application/vnd.google-apps.folder") {
        const subFolderUrl = `https://drive.google.com/drive/folders/${f.id}`;
        await collectImageFilesRecursive(drive, f.id!, f.name!, subFolderUrl, output);
      }
    }

    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);
}

// ─── Scoring helpers (ported 1:1 from Apps Script) ───────────────────────────

function buildSearchTokens(kodeUi: string, namaTampilan: string): string[] {
  const STOP_WORDS = new Set([
    "old", "mst", "trx", "rpt", "pur", "sls", "prd", "inv", "fin", "sys",
    "data", "dan", "yang", "untuk", "dengan", "form", "master",
  ]);
  const text = normalizeText(`${kodeUi} ${namaTampilan}`);
  return text
    .split(" ")
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function scoreTokenOverlap(tokens: string[], normalizedFileName: string): number {
  if (!tokens.length) return 0;
  const hits = tokens.filter((t) => normalizedFileName.includes(t)).length;
  return Math.round((hits / tokens.length) * 45);
}

function scoreSuffixHints(kodeUi: string, normalizedFileName: string): number {
  const code = (kodeUi || "").toUpperCase();
  let score = 0;

  if (code.endsWith("D") && (normalizedFileName.includes("data") || normalizedFileName.includes("detail") || normalizedFileName.includes("panggil"))) score += 25;
  if (code.endsWith("E") && (normalizedFileName.includes("edit") || normalizedFileName.includes("ubah"))) score += 30;
  if (code.endsWith("X") && (normalizedFileName.includes("delete") || normalizedFileName.includes("hapus"))) score += 30;
  if (code.endsWith("C") && (normalizedFileName.includes("cetak") || normalizedFileName.includes("cetakan") || normalizedFileName.includes("print"))) score += 30;
  if (code.endsWith("S") && normalizedFileName.includes("saldo")) score += 30;
  if (code.includes("NPWP") && normalizedFileName.includes("npwp")) score += 40;
  if (code.includes("KRM") && normalizedFileName.includes("kirim")) score += 40;
  if (code.includes("EXP") && (normalizedFileName.includes("expedisi") || normalizedFileName.includes("ekspedisi"))) score += 40;
  if (code.includes("ST") && normalizedFileName.includes("titipan")) score += 35;
  if (code.includes("SP") && normalizedFileName.includes("piutang")) score += 35;
  if (code.includes("SH") && normalizedFileName.includes("hutang")) score += 35;

  return score;
}

interface ScoredFile extends DriveFile {
  score: number;
}

function findBestScreenshotMatches(
  kodeUi: string,
  namaTampilan: string,
  fileIndex: DriveFile[]
): ScoredFile[] {
  const normalizedKode = normalizeText(kodeUi);
  const normalizedNama = normalizeText(namaTampilan);
  const tokens = buildSearchTokens(kodeUi, namaTampilan);

  const scored: ScoredFile[] = fileIndex.map((file) => {
    let score = 0;

    // Exact code match (highest priority)
    if (normalizedKode && file.normalizedName.includes(normalizedKode)) score += 95;

    // Exact name match
    if (normalizedNama && file.normalizedName === normalizedNama) score += 100;

    // Partial name match
    if (normalizedNama && file.normalizedName.includes(normalizedNama)) score += 85;
    if (normalizedNama && normalizedNama.includes(file.normalizedName)) score += 70;

    // Token overlap + suffix hints
    score += scoreTokenOverlap(tokens, file.normalizedName);
    score += scoreSuffixHints(kodeUi, file.normalizedName);

    return { ...file, score };
  });

  return scored
    .filter((item) => item.score >= 35)
    .sort((a, b) => b.score - a.score);
}

// ─── Convert Drive file ID → reliable embed URLs ─────────────────────────────
// We store the raw fileId in DB so the viewer can try multiple URL formats.
// Format 1 (primary):   https://lh3.googleusercontent.com/d/FILE_ID
// Format 2 (fallback):  https://drive.google.com/thumbnail?id=FILE_ID&sz=w1600
// Format 3 (last):      https://drive.google.com/uc?export=view&id=FILE_ID

function toStoredUrl(fileId: string): string {
  // We store a special prefix so the viewer knows it's a Drive file ID
  // and can build + cycle through URL formats on load error.
  return `drive:${fileId}`;
}

// ─── UI Reference sheet reader ───────────────────────────────────────────────

interface UiRefRow {
  kodeUi: string;
  namaTampilan: string;
  taskIds: string[]; // "Digunakan untuk Task ID" — can contain multiple, comma-separated
}

async function readUiReference(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<UiRefRow[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "UI Reference!A:R",
  });

  const rows = res.data.values || [];
  if (rows.length < 2) return [];

  // Find column indices from header row
  const header = rows[0].map((h: string) => (h || "").trim().toLowerCase());
  const colKodeUi = header.findIndex((h: string) => h.includes("kode ui"));
  const colNama = header.findIndex((h: string) => h.includes("nama tampilan"));
  const colTaskId = header.findIndex(
    (h: string) => h.includes("digunakan untuk task id") || h.includes("task id")
  );

  if (colKodeUi < 0) return [];

  const result: UiRefRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const kodeUi = (row[colKodeUi] || "").trim();
    const namaTampilan = colNama >= 0 ? (row[colNama] || "").trim() : "";
    const taskIdRaw = colTaskId >= 0 ? (row[colTaskId] || "").trim() : "";

    if (!kodeUi && !namaTampilan) continue;

    // Task IDs can be comma- or semicolon-separated
    const taskIds = taskIdRaw
      ? taskIdRaw.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
      : [];

    result.push({ kodeUi, namaTampilan, taskIds });
  }

  return result;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const { drive, sheets, spreadsheetId } = await getClients();

    // 1. Collect all image files recursively from the Drive folder
    const rootFolderUrl = `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`;
    const allFiles: DriveFile[] = [];
    await collectImageFilesRecursive(drive, DRIVE_FOLDER_ID, "Screenshot Root", rootFolderUrl, allFiles);

    // 2. Read UI Reference sheet to build Kode UI → Task ID mapping
    const uiRefRows = await readUiReference(sheets, spreadsheetId);

    // 3. Build reverse map: taskCode (normalized) → best screenshot embed URL
    //    by running the fuzzy match for each UI Reference entry
    const taskScreenshotMap = new Map<string, string>(); // taskCode → embedUrl

    for (const uiRow of uiRefRows) {
      if (!uiRow.kodeUi && !uiRow.namaTampilan) continue;

      const matches = findBestScreenshotMatches(uiRow.kodeUi, uiRow.namaTampilan, allFiles);
      if (matches.length === 0) continue;

      const best = matches[0];
      const embedUrl = toStoredUrl(best.id);

      // Map to each task ID linked to this UI row
      for (const tid of uiRow.taskIds) {
        // Accept both "TASK-INV-001" format and plain task codes
        const normalized = tid.replace(/_/g, "-").toUpperCase().trim();
        if (!taskScreenshotMap.has(normalized)) {
          taskScreenshotMap.set(normalized, embedUrl);
        }
      }
    }

    // Fallback: also try direct Task Code → filename matching
    // (for tasks that may not appear in UI Reference)
    const fileNameMap = new Map<string, string>();
    for (const f of allFiles) {
      const normalized = f.normalizedName.replace(/\s+/g, "-").toUpperCase();
      fileNameMap.set(normalized, toStoredUrl(f.id));
    }

    // 4. Update tasks in DB
    const allTasks = await db.select().from(tasks);
    let matched = 0;
    let directMatched = 0;
    let unmatched = 0;

    for (const task of allTasks) {
      if (!task.taskCode) { unmatched++; continue; }

      const normalizedCode = task.taskCode.replace(/_/g, "-").toUpperCase().trim();

      // Try UI Reference mapping first
      let embedUrl = taskScreenshotMap.get(normalizedCode) ?? null;

      // Fallback to direct filename match
      if (!embedUrl) {
        embedUrl = fileNameMap.get(normalizedCode) ?? null;
        if (embedUrl) directMatched++;
      } else {
        matched++;
      }

      if (embedUrl !== task.screenshotUrl) {
        await db.update(tasks)
          .set({ screenshotUrl: embedUrl })
          .where(eq(tasks.id, task.id));
      }
      if (!embedUrl) unmatched++;
    }

    return NextResponse.json({
      success: true,
      totalFilesScanned: allFiles.length,
      uiRefRowsProcessed: uiRefRows.length,
      tasksMatchedViaUiRef: matched,
      tasksMatchedViaFilename: directMatched,
      tasksWithNoScreenshot: unmatched,
    });
  } catch (err) {
    console.error("[Drive Sync]", (err as Error).message || err);
    return NextResponse.json({ success: false, error: (err as Error).message || String(err) }, { status: 500 });
  }
}
