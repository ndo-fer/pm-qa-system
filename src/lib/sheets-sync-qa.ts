import { db } from "@/db";
import { testPlans, testCases, projects, users, NewTestPlan, NewTestCase } from "@/db/schema";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sheetsRequest } from "./sheets-client";
import type { sheets_v4 } from "googleapis";

export interface SyncQAResult {
  latestTestPlans: typeof testPlans.$inferSelect[];
  latestTestCases: typeof testCases.$inferSelect[];
}

export async function syncQA(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  allProjects: (typeof projects.$inferSelect)[],
  allUsers: (typeof users.$inferSelect)[]
): Promise<SyncQAResult> {
  const emailToUserIdMap: Record<string, string> = {};
  const userIdToEmailMap: Record<string, string> = {};
  allUsers.forEach(u => {
    emailToUserIdMap[u.email.toLowerCase()] = u.id;
    userIdToEmailMap[u.id] = u.email;
  });

  const defaultProject = allProjects[0];
  if (!defaultProject) {
    throw new Error("No projects found in database. Please create at least one project first.");
  }

  // ========== TEST PLANS ==========
  // 1. Ensure sheet "Test Plans" exists
  const testPlansMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const testPlansSheetExists = testPlansMeta.data.sheets?.some(s => s.properties?.title === "Test Plans");

  if (!testPlansSheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: "Test Plans" }
            }
          }
        ]
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Test Plans!A1:F1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          "Plan ID", "Project ID", "Name", "Module", "Status", "Created At"
        ]]
      }
    });
  }

  // 2. Fetch and reconcile Test Plans from Sheet into DB
  const tpResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Test Plans!A:F"
  });
  const tpRows = tpResponse.data.values || [];
  const tpDataRows = tpRows.slice(1);

  // Fetch existing test plans from DB once before transaction to resolve N+1 queries
  const existingDbTestPlans = await db.select().from(testPlans);
  const existingPlansMap = new Map(existingDbTestPlans.map(p => [p.id, p]));

  const testPlansToUpsert: NewTestPlan[] = [];

  // 3. Reconcile Test Plans from Sheet into DB
  for (const row of tpDataRows) {
    if (row.length === 0) continue;

    const id = row[0]?.trim();
    const projectId = row[1]?.trim();
    const resolvedProjectId = allProjects.some(p => p.id === projectId) ? projectId : defaultProject.id;
    const name = row[2]?.trim();
    const moduleName = row[3]?.trim();
    let status = (row[4]?.trim() || "draft").toLowerCase();

    if (!["draft", "active", "completed"].includes(status)) {
      status = "draft";
    }

    if (!name || !moduleName) continue;

    const targetId = id || randomUUID();
    const dbPlan = id ? existingPlansMap.get(id) : null;

    if (dbPlan) {
      const hasChanges =
        dbPlan.name !== name ||
        dbPlan.module !== moduleName ||
        dbPlan.status !== status ||
        dbPlan.projectId !== resolvedProjectId;

      if (hasChanges) {
        testPlansToUpsert.push({
          id: targetId,
          projectId: resolvedProjectId,
          name,
          module: moduleName as "Pemasok" | "Pelanggan" | "Barang" | "Katalog Lain" | "Pengaturan" | "Keuangan" | "Kinerja",
          status: status as "draft" | "active" | "completed",
        });
      }
    } else {
      testPlansToUpsert.push({
        id: targetId,
        projectId: resolvedProjectId,
        name,
        module: moduleName as "Pemasok" | "Pelanggan" | "Barang" | "Katalog Lain" | "Pengaturan" | "Keuangan" | "Kinerja",
        status: status as "draft" | "active" | "completed",
      });
    }
  }

  if (testPlansToUpsert.length > 0) {
    await db.transaction(async (tx) => {
      await tx.insert(testPlans)
        .values(testPlansToUpsert)
        .onConflictDoUpdate({
          target: testPlans.id,
          set: {
            projectId: sql`excluded.project_id`,
            name: sql`excluded.name`,
            module: sql`excluded.module`,
            status: sql`excluded.status`,
          }
        });
    });
  }

  // 4. Rewrite Test Plans sheet with latest DB state
  const latestTestPlans = await db.select().from(testPlans);
  const tpUpdatedRows = [
    ["Plan ID", "Project ID", "Name", "Module", "Status", "Created At"]
  ];

  for (const p of latestTestPlans) {
    tpUpdatedRows.push([
      p.id,
      p.projectId,
      p.name,
      p.module,
      p.status,
      p.createdAt || ""
    ]);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Test Plans!A1:F${tpUpdatedRows.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: tpUpdatedRows
    }
  });

  const tpOldRowCount = tpRows.length;
  const tpNewRowCount = tpUpdatedRows.length;
  if (tpOldRowCount > tpNewRowCount) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `Test Plans!A${tpNewRowCount + 1}:F${tpOldRowCount}`
    });
  }

  // ========== TEST CASES ==========
  // 5. Ensure sheet "Test Cases" exists
  const tcMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const tcSheetExists = tcMeta.data.sheets?.some(s => s.properties?.title === "Test Cases");

  if (!tcSheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: "Test Cases" }
            }
          }
        ]
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Test Cases!A1:M1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          "Case ID", "Test Plan ID", "Case Number", "Description", "Steps",
          "Expected Result", "Actual Result", "Status", "Notes",
          "Executed By Email", "Executed At", "ERP Role", "Test Type"
        ]]
      }
    });
  }

  // 6. Fetch and reconcile Test Cases from Sheet into DB
  const tcResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Test Cases!A:M"
  });
  const tcRows = tcResponse.data.values || [];
  const tcDataRows = tcRows.slice(1);

  // Fetch existing test cases from DB once before transaction to resolve N+1 queries
  const existingDbTestCases = await db.select().from(testCases);
  const existingCasesMap = new Map(existingDbTestCases.map(c => [c.id, c]));

  const testCasesToUpsert: NewTestCase[] = [];

  // 7. Reconcile Test Cases from Sheet into DB
  for (const row of tcDataRows) {
    if (row.length === 0) continue;

    const id = row[0]?.trim();
    const testPlanId = row[1]?.trim();
    const caseNumber = row[2]?.trim();
    const description = row[3]?.trim();
    const steps = row[4]?.trim() || null;
    const expectedResult = row[5]?.trim() || null;
    const actualResult = row[6]?.trim() || null;
    let status = (row[7]?.trim() || "pending").toLowerCase();
    const notes = row[8]?.trim() || null;
    const executedByEmail = row[9]?.trim()?.toLowerCase();
    const executedAt = row[10]?.trim() || null;
    const erpRole = row[11]?.trim() || null;
    const testType = row[12]?.trim() || null;

    if (!["pending", "pass", "fail", "blocked"].includes(status)) {
      status = "pending";
    }

    if (!caseNumber || !description || !testPlanId) continue;

    const executedById = executedByEmail ? (emailToUserIdMap[executedByEmail] || null) : null;

    const targetId = id || randomUUID();
    const dbCase = id ? existingCasesMap.get(id) : null;

    if (dbCase) {
      const dbExecutedAt = dbCase.executedAt || null;

      // If sheetExecutedAt !== dbExecutedAt, DB wins because it has a newer execution timestamp
      const useDbStatus = executedAt !== dbExecutedAt;
      const resolvedStatus = useDbStatus ? dbCase.status : status;
      const resolvedActualResult = useDbStatus ? dbCase.actualResult : actualResult;
      const resolvedNotes = useDbStatus ? dbCase.notes : notes;
      const resolvedExecutedBy = useDbStatus ? dbCase.executedBy : executedById;
      
      let resolvedExecutedAt = useDbStatus ? dbCase.executedAt : executedAt;
      if (!useDbStatus && dbCase.status !== resolvedStatus) {
        resolvedExecutedAt = new Date().toISOString();
      }

      const resolvedCaseNumber = useDbStatus ? dbCase.caseNumber : caseNumber;
      const resolvedDescription = useDbStatus ? dbCase.description : description;
      const resolvedSteps = useDbStatus ? dbCase.steps : steps;
      const resolvedExpectedResult = useDbStatus ? dbCase.expectedResult : expectedResult;
      const resolvedErpRole = useDbStatus ? dbCase.erpRole : erpRole;
      const resolvedTestType = useDbStatus ? dbCase.testType : testType;

      const hasChanges =
        dbCase.caseNumber !== resolvedCaseNumber ||
        dbCase.description !== resolvedDescription ||
        dbCase.steps !== resolvedSteps ||
        dbCase.expectedResult !== resolvedExpectedResult ||
        dbCase.actualResult !== resolvedActualResult ||
        dbCase.status !== resolvedStatus ||
        dbCase.notes !== resolvedNotes ||
        dbCase.executedBy !== resolvedExecutedBy ||
        dbCase.executedAt !== resolvedExecutedAt ||
        dbCase.erpRole !== resolvedErpRole ||
        dbCase.testType !== resolvedTestType;

      if (hasChanges) {
        testCasesToUpsert.push({
          id: targetId,
          testPlanId,
          caseNumber: resolvedCaseNumber,
          description: resolvedDescription,
          steps: resolvedSteps,
          expectedResult: resolvedExpectedResult,
          actualResult: resolvedActualResult,
          status: resolvedStatus as "pending" | "pass" | "fail" | "blocked",
          notes: resolvedNotes,
          executedBy: resolvedExecutedBy,
          executedAt: resolvedExecutedAt,
          erpRole: resolvedErpRole as "administrator" | "top_user" | "user" | "matrix" | null,
          testType: resolvedTestType as "functional" | "permission" | "workflow" | "matrix" | null,
        });
      }
    } else {
      testCasesToUpsert.push({
        id: targetId,
        testPlanId,
        caseNumber,
        description,
        steps,
        expectedResult,
        actualResult,
        status: status as "pending" | "pass" | "fail" | "blocked",
        notes,
        executedBy: executedById,
        executedAt,
        erpRole: erpRole as "administrator" | "top_user" | "user" | "matrix" | null,
        testType: testType as "functional" | "permission" | "workflow" | "matrix" | null,
      });
    }
  }

  if (testCasesToUpsert.length > 0) {
    await db.transaction(async (tx) => {
      await tx.insert(testCases)
        .values(testCasesToUpsert)
        .onConflictDoUpdate({
          target: testCases.id,
          set: {
            testPlanId: sql`excluded.test_plan_id`,
            caseNumber: sql`excluded.case_number`,
            description: sql`excluded.description`,
            steps: sql`excluded.steps`,
            expectedResult: sql`excluded.expected_result`,
            actualResult: sql`excluded.actual_result`,
            status: sql`excluded.status`,
            notes: sql`excluded.notes`,
            executedBy: sql`excluded.executed_by`,
            executedAt: sql`excluded.executed_at`,
            erpRole: sql`excluded.erp_role`,
            testType: sql`excluded.test_type`,
          }
        });
    });
  }

  // 8. Rewrite Test Cases sheet with latest DB state
  const latestTestCases = await db.select().from(testCases);
  const tcUpdatedRows = [
    ["Case ID", "Test Plan ID", "Case Number", "Description", "Steps",
      "Expected Result", "Actual Result", "Status", "Notes",
      "Executed By Email", "Executed At", "ERP Role", "Test Type"]
  ];

  for (const tc of latestTestCases) {
    const executedByEmail = tc.executedBy ? (userIdToEmailMap[tc.executedBy] || "") : "";
    tcUpdatedRows.push([
      tc.id,
      tc.testPlanId,
      tc.caseNumber,
      tc.description,
      tc.steps || "",
      tc.expectedResult || "",
      tc.actualResult || "",
      tc.status,
      tc.notes || "",
      executedByEmail,
      tc.executedAt || "",
      tc.erpRole || "",
      tc.testType || ""
    ]);
  }

  await sheetsRequest(() => sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Test Cases!A1:M${tcUpdatedRows.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: tcUpdatedRows
    }
  }));

  const tcOldRowCount = tcRows.length;
  const tcNewRowCount = tcUpdatedRows.length;
  if (tcOldRowCount > tcNewRowCount) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `Test Cases!A${tcNewRowCount + 1}:M${tcOldRowCount}`
    });
  }

  return { latestTestPlans, latestTestCases };
}
