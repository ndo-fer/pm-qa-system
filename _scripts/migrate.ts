import { db } from "../src/db";
import { projects, tasks, testPlans, testCases, users, milestones, projectMembers } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as XLSX from "xlsx";
import path from "path";

const ERP_BASE = "F:/ERP";
const WORKBOOK = "ERP_SRD_Developer_Workbook_Layer2_Checklist_SCurve_Hyperlinked.xlsx";

function readExcel(sheet: string) {
  const wb = XLSX.readFile(path.join(ERP_BASE, WORKBOOK));
  const ws = wb.Sheets[sheet];
  return XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];
}

function excelDateToDate(serial: unknown): Date {
  if (serial instanceof Date) return serial;
  if (typeof serial === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(serial)) {
      return new Date(serial);
    }
    const num = parseFloat(serial);
    if (isNaN(num)) return new Date(serial);
    serial = num;
  }
  if (typeof serial === "number") {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    const total_seconds = Math.floor(86400 * fractional_day);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), 0, 0, total_seconds);
  }
  return new Date();
}

function excelDateToString(serial: unknown): string {
  if (!serial) return "";
  try {
    const d = excelDateToDate(serial);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (e) {
    return String(serial);
  }
}


const STATUS_MAP: Record<string, string> = {
  Active: "pending",
  Pass: "pass",
  Fail: "fail",
  Blocked: "blocked",
  "Not Started": "pending",
  "In Progress": "pending",
};

const PRIORITY_MAP: Record<string, string> = {
  Critical: "urgent",
  High: "high",
  Medium: "medium",
  Low: "low",
};

async function migrate() {
  console.log("=".repeat(60));
  console.log("PDJ PM - Full Data Migration");
  console.log("=".repeat(60));

  // 1. Get or create project
  const existing = await db.select().from(projects).where(eq(projects.name, "ERP Migration"));
  let projectId: string;

  if (existing.length > 0) {
    projectId = existing[0].id;
    console.log(`[CLEAN] Project 'ERP Migration' exists (id=${projectId}). Clearing old data...`);
    
    // Get all test plans under this project
    const plans = await db.select().from(testPlans).where(eq(testPlans.projectId, projectId));
    for (const plan of plans) {
      // Delete test cases under this plan
      await db.delete(testCases).where(eq(testCases.testPlanId, plan.id));
    }
    // Delete plans
    await db.delete(testPlans).where(eq(testPlans.projectId, projectId));
    // Delete tasks
    await db.delete(tasks).where(eq(tasks.projectId, projectId));
    // Delete milestones
    await db.delete(milestones).where(eq(milestones.projectId, projectId));
    // Delete project members
    await db.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
    
    console.log("  ✓ Old data cleared successfully.");
  } else {
    projectId = randomUUID();
    await db.insert(projects).values({
      id: projectId,
      name: "ERP Migration",
      code: "PDJ-PM",
      description: "Migration from SABE desktop system to web-based ERP",
      startDate: "2026-05-20",
      endDate: "2026-11-29",
      status: "active",
    });
    console.log(`[OK] Created project 'ERP Migration' (id=${projectId})`);
  }

  // Populate project members
  const allDbUsers = await db.select().from(users);
  console.log(`\n--- Populating Project Members for ${allDbUsers.length} users ---`);
  for (const u of allDbUsers) {
    await db.insert(projectMembers).values({
      id: randomUUID(),
      projectId,
      userId: u.id,
      role: u.role,
    });
    console.log(`  [OK] Added member: ${u.email} as ${u.role}`);
  }


  // 2. Get QA user
  const qaUsers = await db.select().from(users).where(eq(users.role, "qa"));
  const qaUserId = qaUsers.length > 0 ? qaUsers[0].id : null;

  // 3. Import milestones from Milestone Plan
  console.log("\n--- Importing Milestones ---");
  const milestoneRows = readExcel("Milestone Plan");

  for (const row of milestoneRows) {
    const phase = String(row["Phase"] || "").trim();
    const module = String(row["Modul"] || "").trim();
    const name = String(row["Milestone"] || "").trim();
    if (!phase || !name || name === "NaN") continue;

    const startDate = row["Start Date"] ? excelDateToString(row["Start Date"]) : null;
    const endDate = row["End Date"] ? excelDateToString(row["End Date"]) : null;

    await db.insert(milestones).values({
      id: randomUUID(),
      projectId,
      phase,
      module,
      name,
      startDate,
      endDate,
      plannedWeight: row["Planned Weight %"] ? String(row["Planned Weight %"]) : null,
      dependency: row["Dependency"] ? String(row["Dependency"]) : null,
      exitCriteria: row["Exit Criteria"] ? String(row["Exit Criteria"]) : null,
      status: "planned",
    });
    console.log(`  [OK] Milestone: ${phase} - ${name}`);
  }

  // 4. Import S-Curve data into project
  console.log("\n--- Importing S-Curve Data ---");
  const sCurveRows = readExcel("S-Curve Data");
  const sCurvePlanned = sCurveRows.map((r) => ({
    week: r["Week"],
    weekStart: r["Week Start"] ? excelDateToString(r["Week Start"]) : "",
    weekEnd: r["Week End"] ? excelDateToString(r["Week End"]) : "",
    plannedCumulative: r["Planned Cumulative %"],
    targetMilestone: r["Target Milestone"],
  }));

  await db
    .update(projects)
    .set({ sCurveTarget: sCurvePlanned as any })
    .where(eq(projects.id, projectId));
  console.log(`  [OK] S-Curve: ${sCurvePlanned.length} weeks imported`);

  // 5. Import 176 developer tasks from Developer Task Board
  console.log("\n--- Importing Developer Tasks ---");
  const taskRows = readExcel("Developer Task Board");

  for (const row of taskRows) {
    const taskCode = String(row["Task ID"] || "").trim();
    const epic = String(row["Epic / Modul"] || "").trim();
    const feature = String(row["Feature"] || "").trim();
    const taskName = String(row["Task Name"] || "").trim();
    const description = String(row["Deskripsi Task"] || "");
    const priority = PRIORITY_MAP[String(row["Priority"] || "Medium")] || "medium";
    const srdRef = String(row["Ref 3.2"] || "");
    const frCode = String(row["Ref 4 / FR Code"] || "");
    const acceptanceCriteria = String(row["Acceptance Criteria Checklist"] || "");
    const blocker = String(row["Blocker"] || "");
    const sprintTarget = String(row["Sprint Target"] || "");
    const notes = String(row["Notes"] || "");

    if (!taskCode || !taskName) continue;

    // Map module to phase
    const phaseMap: Record<string, string> = {
      MST: "Phase 1",
      INV: "Phase 2",
      PUR: "Phase 3",
      SLS: "Phase 4",
      PRD: "Phase 5",
      AP: "Phase 6",
      AR: "Phase 6",
      FIN: "Phase 6",
      GL: "Phase 7",
      RPT: "Phase 8",
      ADM: "Phase 9",
    };

    await db.insert(tasks).values({
      id: randomUUID(),
      projectId,
      title: taskName,
      description: description + (notes ? "\n\nNotes: " + notes : ""),
      status: "todo",
      priority: priority as any,
      taskCode,
      epic,
      feature,
      taskType: String(row["Tipe Task"] || ""),
      srdRef,
      frCode,
      acceptanceCriteria,
      progress: 0,
      blocker: blocker || null,
      sprintTarget: sprintTarget || null,
      phase: phaseMap[epic] || null,
    });
  }
  console.log(`  [OK] Imported ${taskRows.length} developer tasks`);

  // 6. Import test cases from QA Excel files
  console.log("\n--- Importing Test Cases ---");
  const FILE_MODULE_MAP: Record<string, { name: string; dbModule: string }> = {
    "04_Kasus_Uji_Data_Induk.xlsx": { name: "Data Induk", dbModule: "Katalog Lain" },
    "05_Kasus_Uji_Pembelian.xlsx": { name: "Pembelian", dbModule: "Pemasok" },
    "06_Kasus_Uji_Gudang.xlsx": { name: "Gudang", dbModule: "Barang" },
    "07_Kasus_Uji_Produksi.xlsx": { name: "Produksi", dbModule: "Barang" },
    "08_Kasus_Uji_Penjualan.xlsx": { name: "Penjualan", dbModule: "Pelanggan" },
    "09_Kasus_Uji_Keuangan.xlsx": { name: "Keuangan", dbModule: "Keuangan" },
    "10_Kasus_Uji_Pengendalian.xlsx": { name: "Pengendalian", dbModule: "Pengaturan" },
    "11_Kasus_Uji_Integrasi.xlsx": { name: "Integrasi", dbModule: "Katalog Lain" },
    "12_Kasus_Uji_Kinerja_Sistem.xlsx": { name: "Kinerja Sistem", dbModule: "Kinerja" },
  };

  for (const [filename, mod] of Object.entries(FILE_MODULE_MAP)) {
    const qaWb = XLSX.readFile(path.join(ERP_BASE, `QA/01_Kasus_Uji/${filename}`));
    const rows = XLSX.utils.sheet_to_json(qaWb.Sheets["Test Cases"], { defval: "" }) as Record<string, any>[];

    const planId = randomUUID();
    await db.insert(testPlans).values({
      id: planId,
      projectId,
      name: `Test Cases - ${mod.name}`,
      module: mod.dbModule,
      status: "active",
    });

    let count = 0;
    for (const row of rows) {
      const tcId = String(row["TC ID"] || "").trim();
      if (!tcId) continue;

      await db.insert(testCases).values({
        id: randomUUID(),
        testPlanId: planId,
        caseNumber: tcId,
        description: String(row["Scenario"] || ""),
        steps: row["Test Steps"] ? String(row["Test Steps"]) : null,
        expectedResult: row["Expected Result"] ? String(row["Expected Result"]) : null,
        status: STATUS_MAP[String(row["Status"] || "Active")] || "pending",
      });
      count++;
    }
    console.log(`  [OK] ${mod.name}: ${count} test cases`);
  }

  // 7. Import execution results
  console.log("\n--- Importing Execution Results ---");
  const execWb = XLSX.readFile(path.join(ERP_BASE, "QA/00_Rencana_Pelacak/02_Pelacak_Testing.xlsx"));
  const execRows = XLSX.utils.sheet_to_json(execWb.Sheets["Execution Log"], { defval: "" }) as Record<string, any>[];

  const allCases = await db.select().from(testCases);
  const casesMap = new Map(allCases.map((tc) => [tc.caseNumber, tc]));

  let execCount = 0;
  for (const row of execRows) {
    const tcId = String(row["Test Case ID"] || "").trim();
    const result = String(row["Result"] || "").trim();
    const notes = row["Notes"] ? String(row["Notes"]) : null;
    if (!tcId || !result || result === "nan") continue;

    const newStatus = STATUS_MAP[result];
    if (!newStatus || newStatus === "pending") continue;

    const match = casesMap.get(tcId);
    if (match) {
      await db
        .update(testCases)
        .set({ status: newStatus, notes, executedAt: new Date().toISOString(), executedBy: qaUserId })
        .where(eq(testCases.id, match.id));
      execCount++;
    }
  }
  console.log(`  [OK] Updated ${execCount} execution results`);

  // 8. Import defects as tasks
  console.log("\n--- Importing Defects ---");
  const defectRows = XLSX.utils.sheet_to_json(execWb.Sheets["Defect Tracker"], { defval: "" }) as Record<string, any>[];

  for (const row of defectRows) {
    const bugId = String(row["Bug ID"] || "").trim();
    if (!bugId || bugId === "nan") continue;

    const title = String(row["Title"] || "");
    let description = String(row["Description"] || "");
    if (row["Steps to Reproduce"]) description += "\n\nSteps:\n" + row["Steps to Reproduce"];
    if (row["Expected Result"]) description += "\n\nExpected: " + row["Expected Result"];
    if (row["Actual Result"]) description += "\n\nActual: " + row["Actual Result"];

    const severity = String(row["Severity"] || "Medium");
    const status = String(row["Status"] || "Open");

    await db.insert(tasks).values({
      id: randomUUID(),
      projectId,
      title: `[${bugId}] ${title}`,
      description,
      status: status === "Open" ? "todo" : "in_progress",
      priority: PRIORITY_MAP[severity] || "medium",
      taskCode: bugId,
      epic: String(row["Module"] || ""),
      feature: "Defect",
    });
    console.log(`  [OK] Defect: ${bugId} - ${title}`);
  }

  // Summary
  const taskCount = await db.select().from(tasks);
  const planCount = await db.select().from(testPlans);
  const caseCount = await db.select().from(testCases);
  const msCount = await db.select().from(milestones);

  console.log("\n" + "=".repeat(60));
  console.log("Migration completed!");
  console.log(`  Projects: 1`);
  console.log(`  Milestones: ${msCount.length}`);
  console.log(`  Tasks: ${taskCount.length} (${taskRows.length} dev tasks + ${defectRows.length} defects)`);
  console.log(`  Test Plans: ${planCount.length}`);
  console.log(`  Test Cases: ${caseCount.length}`);
  console.log("=".repeat(60));
}

migrate()
  .then(() => {
    console.log("✓ Data migration completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
