import { db } from "../src/db";
import { tasks, users } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// 1. Load environment variables from .env.local
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

import { getSheetsClient } from "../src/lib/google-sheets";

async function main() {
  console.log("=== STARTING TASK AUTO-ASSIGNMENT ===");

  // 2. Fetch all developers
  const devUsers = await db.select().from(users).where(eq(users.role, "developer"));
  const affan = devUsers.find((u) => u.name.toLowerCase() === "affan");
  const rifqi = devUsers.find((u) => u.name.toLowerCase() === "rifqi");
  const halim = devUsers.find((u) => u.name.toLowerCase() === "halim");
  const akbar = devUsers.find((u) => u.name.toLowerCase() === "akbar");

  if (!affan || !rifqi || !halim || !akbar) {
    console.error("❌ Error: One or more developer accounts are missing in the database.");
    console.log(`Found developer names: ${devUsers.map((d) => d.name).join(", ")}`);
    return;
  }

  console.log("Found developer accounts:");
  console.log(`- Affan: ID ${affan.id}`);
  console.log(`- Rifqi: ID ${rifqi.id}`);
  console.log(`- Halim: ID ${halim.id}`);
  console.log(`- Akbar: ID ${akbar.id}`);

  // 3. Fetch all tasks from SQLite DB
  const dbTasks = await db.select().from(tasks);
  console.log(`Found ${dbTasks.length} tasks in SQLite Database.`);

  let updatedCount = 0;
  const taskIdToAssignee: Record<string, string> = {};
  const taskCodeToAssigneeName: Record<string, string> = {};

  for (const t of dbTasks) {
    let newAssigneeId: string | null = t.assigneeId;
    let developerName = "Unassigned";

    const title = (t.title || "").toLowerCase();
    const desc = (t.description || "").toLowerCase();
    const feature = (t.feature || "").toLowerCase();
    const taskType = (t.taskType || "").toLowerCase();
    const epic = (t.epic || "").toUpperCase();

    // Mapping Rules:
    // 1. Akbar handles API / Backend / Database
    if (
      taskType === "backend" ||
      taskType === "database" ||
      title.includes("api") ||
      desc.includes("api") ||
      feature.includes("api") ||
      title.includes("endpoint") ||
      title.includes("migration") ||
      feature.includes("migration") ||
      title.includes("sync")
    ) {
      newAssigneeId = akbar.id;
      developerName = "Akbar";
    }
    // 2. Affan handles Master Data
    else if (epic === "MST" || title.includes("master") || feature.includes("master") || title.includes("crud")) {
      newAssigneeId = affan.id;
      developerName = "Affan";
    }
    // 3. Rifqi handles Procurement / Pembelian & AP (Account Payable)
    else if (
      epic === "PUR" ||
      epic === "AP" ||
      title.includes("purchase") ||
      title.includes("pembelian") ||
      title.includes("requisition") ||
      title.includes("supplier") ||
      title.includes("goods receipt") ||
      title.includes("ap payment") ||
      title.includes("hutang")
    ) {
      newAssigneeId = rifqi.id;
      developerName = "Rifqi";
    }
    // 4. Halim handles Sales / Penjualan & AR (Account Receivable)
    else if (
      epic === "SLS" ||
      epic === "AR" ||
      title.includes("sales") ||
      title.includes("penjualan") ||
      title.includes("order") ||
      title.includes("surat jalan") ||
      title.includes("invoice") ||
      title.includes("ar payment") ||
      title.includes("piutang") ||
      title.includes("komisi") ||
      title.includes("giro")
    ) {
      newAssigneeId = halim.id;
      developerName = "Halim";
    }

    taskIdToAssignee[t.id] = newAssigneeId || "";
    if (t.taskCode) {
      taskCodeToAssigneeName[t.taskCode.trim()] = developerName;
    }

    // Update DB if assignee has changed
    if (t.assigneeId !== newAssigneeId) {
      await db
        .update(tasks)
        .set({
          assigneeId: newAssigneeId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(tasks.id, t.id));
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} tasks in local SQLite Database.`);

  // 4. Sync changes to Google Sheets if spreadsheet integration is active
  if (!process.env.GOOGLE_SPREADSHEET_ID) {
    console.log("⚠️ GOOGLE_SPREADSHEET_ID not set in env. Skipping Google Sheets sync.");
    console.log("=== AUTO-ASSIGNMENT COMPLETED SUCCESSFULLY ===");
    return;
  }

  try {
    console.log("\n--- Connecting to Google Sheets to sync assignees ---");
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

    // 4a. Update Tasks Sheet
    console.log("Updating 'Tasks' sheet...");
    const tasksResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Tasks!A:N",
    });
    const taskRows = tasksResponse.data.values || [];
    if (taskRows.length > 0) {
      const headers = taskRows[0];
      const idIdx = headers.indexOf("Task ID");
      const assigneeIdx = headers.indexOf("Assignee Email");

      if (idIdx !== -1 && assigneeIdx !== -1) {
        let updatedSheetTasksCount = 0;
        
        const developerEmailMap: Record<string, string> = {
          [affan.id]: "affan@erp.local",
          [rifqi.id]: "rifqi@erp.local",
          [halim.id]: "halim@erp.local",
          [akbar.id]: "akbar@erp.local",
        };

        const updatedTaskRows = taskRows.map((row, idx) => {
          if (idx === 0) return row;
          const newRow = [...row];
          const taskId = newRow[idIdx];
          const targetAssigneeId = taskIdToAssignee[taskId];
          const targetAssigneeEmail = targetAssigneeId ? (developerEmailMap[targetAssigneeId] || "") : "";

          if (targetAssigneeEmail !== undefined && String(newRow[assigneeIdx] || "").toLowerCase() !== String(targetAssigneeEmail).toLowerCase()) {
            newRow[assigneeIdx] = String(targetAssigneeEmail);
            updatedSheetTasksCount++;
          }
          return newRow;
        });

        if (updatedSheetTasksCount > 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Tasks!A1:N${updatedTaskRows.length}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: updatedTaskRows },
          });
          console.log(`  [OK] Updated ${updatedSheetTasksCount} rows in 'Tasks' sheet.`);
        } else {
          console.log("  No assignee differences found in 'Tasks' sheet.");
        }
      }
    }

    // 4b. Update Developer Task Board Sheet
    console.log("Updating 'Developer Task Board' sheet...");
    const devResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Developer Task Board!A:Z",
    });
    const devRows = devResponse.data.values || [];
    if (devRows.length > 0) {
      const headers = devRows[0];
      const taskCodeIdx = headers.indexOf("Task Code");
      const assigneeColIdx = headers.indexOf("Assignee"); // Get column index dynamically

      if (taskCodeIdx !== -1 && assigneeColIdx !== -1) {
        let updatedDevCount = 0;
        const updatedDevRows = devRows.map((row, idx) => {
          if (idx === 0) return row;
          const newRow = [...row];
          const taskCode = newRow[taskCodeIdx]?.trim();
          if (!taskCode) return newRow;

          const targetAssigneeName = taskCodeToAssigneeName[taskCode];
          if (targetAssigneeName !== undefined && String(newRow[assigneeColIdx]) !== String(targetAssigneeName)) {
            newRow[assigneeColIdx] = String(targetAssigneeName);
            updatedDevCount++;
          }
          return newRow;
        });

        if (updatedDevCount > 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Developer Task Board!A1:Z${updatedDevRows.length}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: updatedDevRows },
          });
          console.log(`  [OK] Updated ${updatedDevCount} rows in 'Developer Task Board' sheet.`);
        } else {
          console.log("  No assignee differences found in 'Developer Task Board' sheet.");
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Failed to synchronize with Google Sheets:", msg);
  }

  console.log("\n=== AUTO-ASSIGNMENT COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error);
