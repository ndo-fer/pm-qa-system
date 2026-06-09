import { db } from "../src/db";
import { tasks } from "../src/db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// Manually load .env.local before importing getSheetsClient
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  envContent.split("\n").forEach(line => {
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
  console.log("=== STARTING TASK PROGRESS CLEANUP ===");

  // 1. Fetch all tasks from SQLite DB
  const dbTasks = await db.select().from(tasks);
  console.log(`Found ${dbTasks.length} total tasks in SQLite Database.`);

  let dbUpdatedCount = 0;
  const taskIdToNewProgress: Record<string, number> = {};
  const taskCodeToNewProgress: Record<string, number> = {};

  for (const t of dbTasks) {
    let newProgress = t.progress ?? 0;

    if (t.status === "todo") {
      newProgress = 0;
    } else if (t.status === "review") {
      newProgress = 90;
    } else if (t.status === "done") {
      newProgress = 100;
    } else if (t.status === "in_progress") {
      newProgress = Math.min(t.progress ?? 0, 90);
    }

    taskIdToNewProgress[t.id] = newProgress;
    if (t.taskCode) {
      taskCodeToNewProgress[t.taskCode.trim()] = newProgress;
    }

    if (t.progress !== newProgress) {
      await db
        .update(tasks)
        .set({
          progress: newProgress,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(tasks.id, t.id));
      dbUpdatedCount++;
    }
  }

  console.log(`Updated ${dbUpdatedCount} tasks in local SQLite Database.`);

  // 2. Update Google Sheets
  console.log("\n--- Connecting to Google Sheets ---");
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  // 2a. Update Tasks Sheet
  console.log("Updating 'Tasks' sheet...");
  const tasksResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Tasks!A:N",
  });
  const taskRows = tasksResponse.data.values || [];
  if (taskRows.length > 0) {
    const headers = taskRows[0];
    const idIdx = headers.indexOf("Task ID");
    const progressIdx = headers.indexOf("Progress (%)");

    if (idIdx !== -1 && progressIdx !== -1) {
      let updatedSheetTasksCount = 0;
      const updatedTaskRows = taskRows.map((row, idx) => {
        if (idx === 0) return row;
        const newRow = [...row];
        const taskId = newRow[idIdx];
        const newProgressVal = taskIdToNewProgress[taskId];

        if (newProgressVal !== undefined && String(newRow[progressIdx]) !== String(newProgressVal)) {
          newRow[progressIdx] = String(newProgressVal);
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
        console.log("  No progress differences found in 'Tasks' sheet.");
      }
    }
  }

  // 2b. Update Developer Task Board Sheet
  console.log("Updating 'Developer Task Board' sheet...");
  const devResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Developer Task Board!A:Z",
  });
  const devRows = devResponse.data.values || [];
  if (devRows.length > 0) {
    const headers = devRows[0];
    const taskCodeIdx = headers.indexOf("Task Code");
    // Progress column index in Developer Task Board is 23 (24th column - column X)
    const progressColIdx = 23; 

    let updatedDevCount = 0;
    const updatedDevRows = devRows.map((row, idx) => {
      if (idx === 0) return row;
      const newRow = [...row];
      const taskCode = newRow[taskCodeIdx]?.trim();
      if (!taskCode) return newRow;

      const newProgressVal = taskCodeToNewProgress[taskCode];
      if (newProgressVal !== undefined) {
        const expectedVal = `${newProgressVal}%`;
        if (newRow[progressColIdx] !== expectedVal) {
          newRow[progressColIdx] = expectedVal;
          updatedDevCount++;
        }
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
      console.log("  No progress differences found in 'Developer Task Board' sheet.");
    }
  }

  console.log("\n=== TASK PROGRESS CLEANUP COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error);
