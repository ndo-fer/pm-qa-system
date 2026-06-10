import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { projects, tasks, testPlans, testCases, milestones, projectMembers, users } from "@/db/schema";
import { randomUUID } from "crypto";
import * as XLSX from "xlsx";

function excelDateToDate(serial: any): Date {
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

function excelDateToString(serial: any): string {
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

const EPIC_TO_DB_MODULE: Record<string, "Pemasok" | "Pelanggan" | "Barang" | "Katalog Lain" | "Pengaturan" | "Keuangan" | "Kinerja"> = {
  MST: "Katalog Lain",
  INV: "Barang",
  PUR: "Pemasok",
  SLS: "Pelanggan",
  PRD: "Barang",
  ADM: "Pengaturan",
  FIN: "Keuangan",
  AP: "Keuangan",
  AR: "Keuangan",
  GL: "Keuangan",
  RPT: "Keuangan",
};

const PHASE_MAP: Record<string, string> = {
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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const description = formData.get("description") as string;
    const startDate = formData.get("startDate") as string;
    const endDate = formData.get("endDate") as string;

    if (!file || !name || !code || !startDate) {
      return NextResponse.json({ error: "File, Name, Code, and Start Date are required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const newProjectId = randomUUID();

    await db.transaction(async (tx) => {
      // 1. Insert Project details
      // Prepare S-Curve from S-Curve Data sheet if available
      let sCurvePlanned: any[] = [];
      const sCurveSheet = workbook.SheetNames.find(n => n === "S-Curve Data");
      if (sCurveSheet) {
        const sCurveRows = XLSX.utils.sheet_to_json(workbook.Sheets[sCurveSheet], { defval: "" }) as Record<string, any>[];
        sCurvePlanned = sCurveRows.map((r) => ({
          week: r["Week"],
          weekStart: r["Week Start"] ? excelDateToString(r["Week Start"]) : "",
          weekEnd: r["Week End"] ? excelDateToString(r["Week End"]) : "",
          plannedCumulative: r["Planned Cumulative %"],
          targetMilestone: r["Target Milestone"],
        }));
      }

      await tx.insert(projects).values({
        id: newProjectId,
        name,
        code,
        description: description || null,
        startDate: startDate,
        endDate: endDate || null,
        status: "active",
        sCurveTarget: sCurvePlanned as any,
      });

      // Add all system users to this new project so that they can view/test it
      const allUsers = await tx.select().from(users);
      for (const u of allUsers) {
        await tx.insert(projectMembers).values({
          id: randomUUID(),
          projectId: newProjectId,
          userId: u.id,
          role: u.role,
        });
      }

      // 2. Parse Milestones from Milestone Plan sheet
      const milestoneSheet = workbook.SheetNames.find(n => n === "Milestone Plan");
      if (milestoneSheet) {
        const milestoneRows = XLSX.utils.sheet_to_json(workbook.Sheets[milestoneSheet], { defval: "" }) as Record<string, any>[];
        for (const row of milestoneRows) {
          const phase = String(row["Phase"] || "").trim();
          const module = String(row["Modul"] || "").trim();
          const milestoneName = String(row["Milestone"] || "").trim();
          if (!phase || !milestoneName || milestoneName === "NaN") continue;

          await tx.insert(milestones).values({
            id: randomUUID(),
            projectId: newProjectId,
            phase,
            module,
            name: milestoneName,
            startDate: row["Start Date"] ? excelDateToString(row["Start Date"]) : null,
            endDate: row["End Date"] ? excelDateToString(row["End Date"]) : null,
            plannedWeight: row["Planned Weight %"] ? String(row["Planned Weight %"]) : null,
            dependency: row["Dependency"] ? String(row["Dependency"]) : null,
            exitCriteria: row["Exit Criteria"] ? String(row["Exit Criteria"]) : null,
            status: "planned",
          });
        }
      }

      // 3. Parse tasks from Developer Task Board sheet
      const taskSheet = workbook.SheetNames.find(n => n === "Developer Task Board");
      const detectedEpics = new Set<string>();
      if (taskSheet) {
        const taskRows = XLSX.utils.sheet_to_json(workbook.Sheets[taskSheet], { defval: "" }) as Record<string, any>[];
        for (const row of taskRows) {
          const taskCode = String(row["Task ID"] || "").trim();
          const epic = String(row["Epic / Modul"] || "").trim();
          const feature = String(row["Feature"] || "").trim();
          const taskName = String(row["Task Name"] || "").trim();
          if (!taskCode || !taskName) continue;

          if (epic) {
            detectedEpics.add(epic);
          }

          const descriptionStr = String(row["Deskripsi Task"] || "");
          const notes = String(row["Notes"] || "");
          const priority = PRIORITY_MAP[String(row["Priority"] || "Medium")] || "medium";

          await tx.insert(tasks).values({
            id: randomUUID(),
            projectId: newProjectId,
            title: taskName,
            description: descriptionStr + (notes ? "\n\nNotes: " + notes : ""),
            status: "todo",
            priority: priority as any,
            taskCode,
            epic,
            feature,
            taskType: String(row["Tipe Task"] || ""),
            srdRef: String(row["Ref 3.2"] || ""),
            frCode: String(row["Ref 4 / FR Code"] || ""),
            acceptanceCriteria: String(row["Acceptance Criteria Checklist"] || ""),
            progress: 0,
            blocker: String(row["Blocker"] || "") || null,
            sprintTarget: String(row["Sprint Target"] || "") || null,
            phase: PHASE_MAP[epic] || null,
          });
        }
      }

      // 4. Parse or auto-generate QA Test Cases
      const qaSheetName = workbook.SheetNames.find(n => n === "QA Test Cases" || n === "Test Cases");
      let qaRows: Record<string, any>[] = [];
      if (qaSheetName) {
        qaRows = XLSX.utils.sheet_to_json(workbook.Sheets[qaSheetName], { defval: "" }) as Record<string, any>[];
      }

      if (qaRows.length > 0) {
        // Parse from spreadsheet
        // Group by Module to create Test Plans
        const plansMap = new Map<string, string>(); // Module Name -> Plan ID

        for (const row of qaRows) {
          const tcId = String(row["TC ID"] || row["Test Case ID"] || "").trim();
          if (!tcId) continue;

          const moduleName = String(row["Module"] || row["Modul"] || "Umum").trim();
          const dbModule = EPIC_TO_DB_MODULE[moduleName] || "Katalog Lain";

          let planId = plansMap.get(dbModule);
          if (!planId) {
            planId = randomUUID();
            await tx.insert(testPlans).values({
              id: planId,
              projectId: newProjectId,
              name: `Test Cases - ${dbModule}`,
              module: dbModule,
              status: "active",
            });
            plansMap.set(dbModule, planId);
          }

          const steps = row["Test Steps"] || row["Steps"] ? String(row["Test Steps"] || row["Steps"]) : null;
          const expected = row["Expected Result"] || row["Expected"] ? String(row["Expected Result"] || row["Expected"]) : null;
          const status = STATUS_MAP[String(row["Status"] || "Active")] || "pending";
          const erpRole = String(row["ERP Role"] || row["Role"] || "").toLowerCase() as "administrator" | "top_user" | "user" | "matrix" | null;

          await tx.insert(testCases).values({
            id: randomUUID(),
            testPlanId: planId,
            caseNumber: tcId,
            description: String(row["Scenario"] || row["Description"] || "Kasus Uji"),
            steps,
            expectedResult: expected,
            status: status as any,
            erpRole: erpRole || null,
          });
        }
      } else {
        // Auto-generate based on detected epics
        const epicsToUse = detectedEpics.size > 0 ? Array.from(detectedEpics) : ["MST", "INV", "PUR", "SLS"];
        const dbModules = new Set(epicsToUse.map(e => EPIC_TO_DB_MODULE[e] || "Katalog Lain"));

        for (const dbModule of dbModules) {
          const planId = randomUUID();
          await tx.insert(testPlans).values({
            id: planId,
            projectId: newProjectId,
            name: `Test Plan Otomatis - ${dbModule}`,
            module: dbModule,
            status: "active",
          });

          // Generate for each role
          const roles: Array<"administrator" | "top_user" | "user"> = ["administrator", "top_user", "user"];
          let tcIndex = 1;
          for (const role of roles) {
            const roleCode = role.slice(0, 3).toUpperCase();
            const caseNumber = `TC-GEN-${dbModule.slice(0, 3).toUpperCase()}-${roleCode}-${String(tcIndex++).padStart(3, "0")}`;

            await tx.insert(testCases).values({
              id: randomUUID(),
              testPlanId: planId,
              caseNumber,
              description: `Verifikasi akses menu dan fungsi dasar modul ${dbModule} untuk role ${role}`,
              steps: `1. Login sebagai user dengan role ${role}\n2. Buka modul ${dbModule}\n3. Coba lakukan operasi baca/tulis data`,
              expectedResult: `Sistem memberikan izin akses sesuai matriks kewenangan role ${role}`,
              status: "pending",
              erpRole: role,
              testType: "permission",
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true, projectId: newProjectId }, { status: 201 });
  } catch (error: any) {
    console.error("Error importing project:", error);
    return NextResponse.json({ error: error.message || "Failed to import project" }, { status: 500 });
  }
}
