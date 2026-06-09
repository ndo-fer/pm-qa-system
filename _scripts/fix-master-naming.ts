import { db } from "../src/db";
import { tasks, testCases } from "../src/db/schema";
import { eq, like, or } from "drizzle-orm";
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
      // Remove surrounding quotes if any
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

// Now import sheets client
import { getSheetsClient } from "../src/lib/google-sheets";

async function main() {
  console.log("=== STARTING MASTER DATA NAMING CLEANUP ===");

  // 1. Update SQLite Database
  console.log("\n--- Updating SQLite Database ---");

  // Fetch tasks to update
  const dbTasks = await db
    .select()
    .from(tasks)
    .where(
      or(
        like(tasks.title, "%Master Mas%"),
        like(tasks.feature, "%Master Mas%"),
        like(tasks.description, "%Master Mas%")
      )
    );

  console.log(`Found ${dbTasks.length} tasks in DB with 'Master Mas' naming.`);

  for (const t of dbTasks) {
    const newTitle = t.title.replace(/Master Mas/g, "Mas");
    const newFeature = t.feature ? t.feature.replace(/Master Mas/g, "Mas") : null;
    const newDesc = t.description ? t.description.replace(/Master Mas/g, "Mas") : "";

    await db
      .update(tasks)
      .set({
        title: newTitle,
        feature: newFeature,
        description: newDesc,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, t.id));

    console.log(`  [UPDATED TASK] ${t.taskCode}: "${t.title}" -> "${newTitle}"`);
  }

  // Fetch test cases to update
  const dbCases = await db
    .select()
    .from(testCases)
    .where(
      or(
        like(testCases.description, "%Master Mas%"),
        like(testCases.steps, "%Master Mas%"),
        like(testCases.expectedResult, "%Master Mas%"),
        like(testCases.notes, "%Master Mas%")
      )
    );

  console.log(`Found ${dbCases.length} test cases in DB with 'Master Mas' naming.`);

  for (const c of dbCases) {
    const newDesc = c.description.replace(/Master Mas/g, "Mas");
    const newSteps = c.steps ? c.steps.replace(/Master Mas/g, "Mas") : null;
    const newExpected = c.expectedResult ? c.expectedResult.replace(/Master Mas/g, "Mas") : null;
    const newNotes = c.notes ? c.notes.replace(/Master Mas/g, "Mas") : null;
    
    // Also update loginCredentials JSON if it contains the text
    let newLoginCreds = c.loginCredentials;
    if (newLoginCreds) {
      try {
        let credsStr = JSON.stringify(newLoginCreds);
        if (credsStr.includes("Master Mas")) {
          credsStr = credsStr.replace(/Master Mas/g, "Mas");
          newLoginCreds = JSON.parse(credsStr);
        }
      } catch (err) {
        console.error("Error updating loginCredentials JSON:", err);
      }
    }

    await db
      .update(testCases)
      .set({
        description: newDesc,
        steps: newSteps,
        expectedResult: newExpected,
        notes: newNotes,
        loginCredentials: newLoginCreds,
      })
      .where(eq(testCases.id, c.id));

    console.log(`  [UPDATED TEST CASE] ${c.caseNumber}: "${c.description.substring(0, 50)}..." -> "${newDesc.substring(0, 50)}..."`);
  }

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
    const titleIdx = headers.indexOf("Title");
    const featureIdx = headers.indexOf("Feature");

    let updatedTasksCount = 0;
    const updatedTaskRows = taskRows.map((row, idx) => {
      if (idx === 0) return row;
      const newRow = [...row];
      let changed = false;

      if (titleIdx !== -1 && newRow[titleIdx] && newRow[titleIdx].includes("Master Mas")) {
        newRow[titleIdx] = newRow[titleIdx].replace(/Master Mas/g, "Mas");
        changed = true;
      }
      if (featureIdx !== -1 && newRow[featureIdx] && newRow[featureIdx].includes("Master Mas")) {
        newRow[featureIdx] = newRow[featureIdx].replace(/Master Mas/g, "Mas");
        changed = true;
      }

      if (changed) {
        updatedTasksCount++;
      }
      return newRow;
    });

    if (updatedTasksCount > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Tasks!A1:N${updatedTaskRows.length}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: updatedTaskRows },
      });
      console.log(`  [OK] Updated ${updatedTasksCount} rows in 'Tasks' sheet.`);
    } else {
      console.log("  No 'Master Mas' found in 'Tasks' sheet.");
    }
  }

  // 2b. Update Test Cases Sheet
  console.log("Updating 'Test Cases' sheet...");
  const tcResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Test Cases!A:M",
  });
  const tcRows = tcResponse.data.values || [];
  if (tcRows.length > 0) {
    const headers = tcRows[0];
    const descIdx = headers.indexOf("Description");
    const stepsIdx = headers.indexOf("Steps");
    const expectedIdx = headers.indexOf("Expected Result");
    const notesIdx = headers.indexOf("Notes");

    let updatedTCCount = 0;
    const updatedTCRows = tcRows.map((row, idx) => {
      if (idx === 0) return row;
      const newRow = [...row];
      let changed = false;

      const indices = [descIdx, stepsIdx, expectedIdx, notesIdx];
      for (const index of indices) {
        if (index !== -1 && newRow[index] && newRow[index].includes("Master Mas")) {
          newRow[index] = newRow[index].replace(/Master Mas/g, "Mas");
          changed = true;
        }
      }

      if (changed) {
        updatedTCCount++;
      }
      return newRow;
    });

    if (updatedTCCount > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Test Cases!A1:M${updatedTCRows.length}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: updatedTCRows },
      });
      console.log(`  [OK] Updated ${updatedTCCount} rows in 'Test Cases' sheet.`);
    } else {
      console.log("  No 'Master Mas' found in 'Test Cases' sheet.");
    }
  }

  // 2c. Update Developer Task Board Sheet
  console.log("Updating 'Developer Task Board' sheet...");
  const devResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Developer Task Board!A:Z",
  });
  const devRows = devResponse.data.values || [];
  if (devRows.length > 0) {
    const headers = devRows[0];
    const taskNameIdx = headers.indexOf("Task Name");
    const featureIdx = headers.indexOf("Feature");
    const descIdx = headers.indexOf("Deskripsi Task");

    let updatedDevCount = 0;
    const updatedDevRows = devRows.map((row, idx) => {
      if (idx === 0) return row;
      const newRow = [...row];
      let changed = false;

      const indices = [taskNameIdx, featureIdx, descIdx];
      for (const index of indices) {
        if (index !== -1 && newRow[index] && newRow[index].includes("Master Mas")) {
          newRow[index] = newRow[index].replace(/Master Mas/g, "Mas");
          changed = true;
        }
      }

      if (changed) {
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
      console.log("  No 'Master Mas' found in 'Developer Task Board' sheet.");
    }
  }

  // 3. Update QA_TEST_CASE_REPORT.md
  console.log("\n--- Updating QA_TEST_CASE_REPORT.md ---");
  const reportPath = path.join(process.cwd(), "QA_TEST_CASE_REPORT.md");
  if (fs.existsSync(reportPath)) {
    let reportContent = fs.readFileSync(reportPath, "utf-8");
    if (reportContent.includes("Master Mas")) {
      reportContent = reportContent.replace(/Master Mas/g, "Mas");
      fs.writeFileSync(reportPath, reportContent, "utf-8");
      console.log("  [OK] Updated QA_TEST_CASE_REPORT.md file.");
    } else {
      console.log("  No 'Master Mas' found in QA_TEST_CASE_REPORT.md.");
    }
  } else {
    console.log("  QA_TEST_CASE_REPORT.md not found.");
  }

  console.log("\n=== NAMING CLEANUP COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error);
