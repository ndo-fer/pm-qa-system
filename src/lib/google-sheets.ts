import { google } from "googleapis";
import { db } from "@/db";
import { tasks, users, projects, milestones, testPlans, testCases, NewTask, NewTestPlan, NewTestCase } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { calculateSCurve } from "./s-curve";

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

export type SyncScope = "all" | "tasks" | "qa" | "milestones";

export interface SyncOptions {
  scope?: SyncScope;
}

const shouldSync = (scope: SyncScope, target: "tasks" | "qa" | "milestones") => {
  if (scope === "all") return true;
  if (scope === "tasks") return target === "tasks";
  if (scope === "qa") return target === "qa";
  if (scope === "milestones") return target === "milestones";
  return false;
};

export async function syncGoogleSheets(options?: SyncOptions) {
  const scope: SyncScope = options?.scope || "all";
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  // Shared setup: fetch users and projects
  const allUsers = await db.select().from(users);
  const allProjects = await db.select().from(projects);

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

  let latestTasks: typeof tasks.$inferSelect[] = [];
  let sheetTaskCount = 0;
  let latestTestPlans: typeof testPlans.$inferSelect[] = [];
  let latestTestCases: typeof testCases.$inferSelect[] = [];

  // ========== TASKS SYNC (scope: all, tasks) ==========
  if (shouldSync(scope, "tasks")) {
    // 1. Ensure sheet "Tasks" exists
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = meta.data.sheets?.some(s => s.properties?.title === "Tasks");

    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: "Tasks" }
              }
            }
          ]
        }
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Tasks!A1:N1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            "Task ID", "Project ID", "Task Code", "Title", "Epic", "Feature",
            "Task Type", "Status", "Priority", "Assignee Email", "Due Date",
            "Progress (%)", "Blocker", "Phase"
          ]]
        }
      });
    }

    // 2. Fetch all rows from Tasks spreadsheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Tasks!A:N"
    });

    const rows = response.data.values || [];
    const dataRows = rows.slice(1);
    sheetTaskCount = dataRows.length;

    const processedTaskIds = new Set<string>();

    // 3. Reconcile rows from Sheet into DB
    for (const row of dataRows) {
      if (row.length === 0) continue;

      const id = row[0]?.trim();
      const projectId = row[1]?.trim() || defaultProject.id;
      const taskCode = row[2]?.trim() || null;
      const title = row[3]?.trim();
      const epic = row[4]?.trim() || null;
      const feature = row[5]?.trim() || null;
      const taskType = row[6]?.trim() || null;
      let status = (row[7]?.trim() || "todo").toLowerCase();
      let priority = (row[8]?.trim() || "medium").toLowerCase();
      const assigneeEmail = row[9]?.trim()?.toLowerCase();
      const dueDate = row[10]?.trim() || null;
      const progress = parseInt(row[11]?.trim() || "0", 10) || 0;
      const blocker = row[12]?.trim() || null;
      const phase = row[13]?.trim() || null;

      if (!["todo", "in_progress", "review", "done"].includes(status)) {
        status = "todo";
      }
      if (!["low", "medium", "high", "urgent"].includes(priority)) {
        priority = "medium";
      }

      if (!title) continue;

      const assigneeId = assigneeEmail ? (emailToUserIdMap[assigneeEmail] || null) : null;

      if (id) {
        const existing = await db.select().from(tasks).where(eq(tasks.id, id));
        if (existing.length > 0) {
          const dbTask = existing[0];
          
          const statusOrder: Record<string, number> = { todo: 0, in_progress: 1, review: 2, done: 3 };
          const dbStatusVal = statusOrder[dbTask.status || "todo"] ?? 0;
          const sheetStatusVal = statusOrder[status] ?? 0;

          // Resolve status/progress conflict: DB takes precedence if it's further along (e.g. done vs todo)
          const useDbStatus = dbStatusVal > sheetStatusVal;
          const resolvedStatus = useDbStatus ? dbTask.status : status;
          const resolvedProgress = useDbStatus ? dbTask.progress : progress;

          const hasChanges =
            dbTask.title !== title ||
            dbTask.status !== resolvedStatus ||
            dbTask.priority !== priority ||
            dbTask.assigneeId !== assigneeId ||
            dbTask.progress !== resolvedProgress ||
            dbTask.blocker !== blocker ||
            dbTask.phase !== phase ||
            dbTask.epic !== epic ||
            dbTask.feature !== feature ||
            dbTask.taskCode !== taskCode ||
            dbTask.dueDate !== dueDate;

          if (hasChanges) {
            await db.update(tasks)
              .set({
                projectId,
                taskCode,
                title,
                epic,
                feature,
                taskType,
                status: resolvedStatus as any,
                priority: priority as any,
                assigneeId,
                dueDate,
                progress: resolvedProgress,
                blocker,
                phase,
                updatedAt: new Date().toISOString()
              })
              .where(eq(tasks.id, id));
          }
        } else {
          const newTask: NewTask = {
            id,
            projectId,
            taskCode,
            title,
            epic,
            feature,
            taskType,
            status: status as any,
            priority: priority as any,
            assigneeId,
            dueDate,
            progress,
            blocker,
            phase
          };
          await db.insert(tasks).values(newTask);
        }
        processedTaskIds.add(id);
      } else {
        const newId = randomUUID();
        const newTask: NewTask = {
          id: newId,
          projectId,
          taskCode,
          title,
          epic,
          feature,
          taskType,
          status: status as any,
          priority: priority as any,
          assigneeId,
          dueDate,
          progress,
          blocker,
          phase
        };
        await db.insert(tasks).values(newTask);
        processedTaskIds.add(newId);
      }
    }

    // 4. Fetch latest tasks from DB
    latestTasks = await db.select().from(tasks);

    // 5. Rewrite Tasks sheet with latest DB state
    const updatedRows = [
      [
        "Task ID", "Project ID", "Task Code", "Title", "Epic", "Feature",
        "Task Type", "Status", "Priority", "Assignee Email", "Due Date",
        "Progress (%)", "Blocker", "Phase"
      ]
    ];

    for (const t of latestTasks) {
      const assigneeEmail = t.assigneeId ? (userIdToEmailMap[t.assigneeId] || "") : "";
      updatedRows.push([
        t.id,
        t.projectId,
        t.taskCode || "",
        t.title,
        t.epic || "",
        t.feature || "",
        t.taskType || "",
        t.status,
        t.priority,
        assigneeEmail,
        t.dueDate || "",
        String(t.progress || 0),
        t.blocker || "",
        t.phase || ""
      ]);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Tasks!A1:N${updatedRows.length}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: updatedRows
      }
    });

    const oldRowCount = rows.length;
    const newRowCount = updatedRows.length;
    if (oldRowCount > newRowCount) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `Tasks!A${newRowCount + 1}:N${oldRowCount}`
      });
    }

    // 6. Update Developer Task Board sheet
    const devBoardResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Developer Task Board!A:Z"
    });
    const devBoardRows = devBoardResponse.data.values || [];
    const devBoardHeaders = devBoardRows[0] || [];
    const devBoardDataRows = devBoardRows.slice(1);

    const tasksByCode: Record<string, typeof latestTasks[0]> = {};
    latestTasks.forEach(t => {
      if (t.taskCode) {
        tasksByCode[t.taskCode.trim()] = t;
      }
    });

    const updatedDevBoardRows = [devBoardHeaders];
    for (let idx = 0; idx < devBoardDataRows.length; idx++) {
      const row = [...devBoardDataRows[idx]];
      const taskCode = row[0]?.trim();
      const dbTask = taskCode ? tasksByCode[taskCode] : null;

      if (dbTask) {
        let mappedStatus = "To Do";
        if (dbTask.status === "done") mappedStatus = "Done";
        else if (dbTask.status === "in_progress") mappedStatus = "In Progress";
        else if (dbTask.status === "review") mappedStatus = "Review";
        else if (dbTask.blocker) mappedStatus = "Blocked";

        row[18] = mappedStatus;
        row[23] = `${dbTask.progress}%`;
        row[24] = dbTask.blocker || "";

        const checklistVal = dbTask.status === "done" ? "Completed" : dbTask.status === "in_progress" ? "In Progress" : "Not Started";
        row[12] = checklistVal;
        row[13] = checklistVal;
        row[14] = checklistVal;
        row[15] = checklistVal;
        row[16] = checklistVal;
        row[17] = checklistVal;
      }
      updatedDevBoardRows.push(row);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Developer Task Board!A1:Z${updatedDevBoardRows.length}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: updatedDevBoardRows
      }
    });
  }

  // ========== MILESTONES & S-CURVE SYNC (scope: all, tasks, milestones) ==========
  if (shouldSync(scope, "milestones") || shouldSync(scope, "tasks")) {
    // 7. Update S-Curve Data sheet
    const sCurveData = await calculateSCurve(defaultProject.id);
    const sCurveRows = [
      [
        "Week", "Week Start", "Week End", "Planned Weekly %", "Planned Cumulative %",
        "Actual Weekly %", "Actual Cumulative %", "Variance %", "Target Milestone"
      ]
    ];

    for (let i = 0; i < sCurveData.length; i++) {
      const w = sCurveData[i];
      const rowNum = i + 2;

      const prevPlanned = i > 0 ? sCurveData[i - 1].plannedCumulative : 0;
      const plannedWeekly = parseFloat((w.plannedCumulative - prevPlanned).toFixed(4));

      let actualWeekly = 0;
      if (w.actualCumulative !== null) {
        const prevActual = i > 0 && sCurveData[i - 1].actualCumulative !== null
          ? sCurveData[i - 1].actualCumulative!
          : 0;
        actualWeekly = parseFloat((w.actualCumulative - prevActual).toFixed(4));
      }

      sCurveRows.push([
        String(w.week),
        w.weekStart,
        w.weekEnd,
        String(plannedWeekly),
        `=SUM($D$2:D${rowNum})`,
        w.actualCumulative !== null ? String(actualWeekly) : "",
        w.actualCumulative !== null ? `=SUM($F$2:F${rowNum})` : "",
        w.actualCumulative !== null ? `=G${rowNum}-E${rowNum}` : "",
        w.targetMilestone || ""
      ]);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `S-Curve Data!A1:I${sCurveRows.length}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: sCurveRows
      }
    });

    const sCurveMeta = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "S-Curve Data!A:A"
    });
    const oldSCurveCount = sCurveMeta.data.values?.length || 0;
    if (oldSCurveCount > sCurveRows.length) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `S-Curve Data!A${sCurveRows.length + 1}:I${oldSCurveCount}`
      });
    }

    // 8. Update Milestone Plan sheet
    const dbMilestones = await db.select().from(milestones).where(eq(milestones.projectId, defaultProject.id));
    const msResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Milestone Plan!A:I"
    });
    const msRows = msResponse.data.values || [];
    const msHeaders = msRows[0] || [];
    const msDataRows = msRows.slice(1);

    const msByPhase: Record<string, typeof dbMilestones[0]> = {};
    dbMilestones.forEach(m => {
      msByPhase[m.phase] = m;
    });

    const updatedMsRows = [msHeaders];
    for (let idx = 0; idx < msDataRows.length; idx++) {
      const row = [...msDataRows[idx]];
      const phase = row[0]?.trim();

      if (phase && phase.startsWith("Phase")) {
        const dbMs = msByPhase[phase];
        if (dbMs) {
          row[3] = dbMs.startDate || "";
          row[4] = dbMs.endDate || "";
          row[8] = dbMs.status || "Planned";
        }
      }
      updatedMsRows.push(row);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Milestone Plan!A1:I${updatedMsRows.length}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: updatedMsRows
      }
    });
  }

  // ========== QA SYNC (scope: all, qa) ==========
  if (shouldSync(scope, "qa")) {
    // 9. Ensure sheet "Test Plans" exists
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

    // 10. Fetch and reconcile Test Plans from Sheet into DB
    const tpResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Test Plans!A:F"
    });
    const tpRows = tpResponse.data.values || [];
    const tpDataRows = tpRows.slice(1);

    for (const row of tpDataRows) {
      if (row.length === 0) continue;

      const id = row[0]?.trim();
      const projectId = row[1]?.trim();
      const name = row[2]?.trim();
      const moduleName = row[3]?.trim();
      let status = (row[4]?.trim() || "draft").toLowerCase();

      if (!["draft", "active", "completed"].includes(status)) {
        status = "draft";
      }

      if (!name || !moduleName) continue;

      if (id) {
        const existing = await db.select().from(testPlans).where(eq(testPlans.id, id));
        if (existing.length > 0) {
          const dbPlan = existing[0];
          const hasChanges =
            dbPlan.name !== name ||
            dbPlan.module !== moduleName ||
            dbPlan.status !== status ||
            dbPlan.projectId !== projectId;

          if (hasChanges) {
            await db.update(testPlans)
              .set({
                projectId,
                name,
                module: moduleName as any,
                status: status as any,
              })
              .where(eq(testPlans.id, id));
          }
        } else {
          const newPlan: NewTestPlan = {
            id,
            projectId,
            name,
            module: moduleName as any,
            status: status as any,
          };
          await db.insert(testPlans).values(newPlan);
        }
      } else {
        const newId = randomUUID();
        const newPlan: NewTestPlan = {
          id: newId,
          projectId: projectId || defaultProject.id,
          name,
          module: moduleName as any,
          status: status as any,
        };
        await db.insert(testPlans).values(newPlan);
      }
    }

    // 11. Rewrite Test Plans sheet with latest DB state
    latestTestPlans = await db.select().from(testPlans);
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

    // 12. Ensure sheet "Test Cases" exists
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

    // 13. Fetch and reconcile Test Cases from Sheet into DB
    const tcResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Test Cases!A:M"
    });
    const tcRows = tcResponse.data.values || [];
    const tcDataRows = tcRows.slice(1);

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

      if (id) {
        const existing = await db.select().from(testCases).where(eq(testCases.id, id));
        if (existing.length > 0) {
          const dbCase = existing[0];
          
          const statusOrder: Record<string, number> = { pending: 0, fail: 1, blocked: 2, pass: 3 };
          const dbStatusVal = statusOrder[dbCase.status || "pending"] ?? 0;
          const sheetStatusVal = statusOrder[status] ?? 0;

          // Resolve status/results conflict: DB takes precedence if it's further along (e.g. pass vs fail)
          const useDbStatus = dbStatusVal > sheetStatusVal;
          const resolvedStatus = useDbStatus ? dbCase.status : status;
          const resolvedActualResult = useDbStatus ? dbCase.actualResult : actualResult;
          const resolvedNotes = useDbStatus ? dbCase.notes : notes;
          const resolvedExecutedBy = useDbStatus ? dbCase.executedBy : executedById;
          const resolvedExecutedAt = useDbStatus ? dbCase.executedAt : executedAt;

          const hasChanges =
            dbCase.caseNumber !== caseNumber ||
            dbCase.description !== description ||
            dbCase.steps !== steps ||
            dbCase.expectedResult !== expectedResult ||
            dbCase.actualResult !== resolvedActualResult ||
            dbCase.status !== resolvedStatus ||
            dbCase.notes !== resolvedNotes ||
            dbCase.executedBy !== resolvedExecutedBy ||
            dbCase.executedAt !== resolvedExecutedAt ||
            dbCase.erpRole !== erpRole ||
            dbCase.testType !== testType;

          if (hasChanges) {
            await db.update(testCases)
              .set({
                testPlanId,
                caseNumber,
                description,
                steps,
                expectedResult,
                actualResult: resolvedActualResult,
                status: resolvedStatus as any,
                notes: resolvedNotes,
                executedBy: resolvedExecutedBy,
                executedAt: resolvedExecutedAt,
                erpRole: erpRole as any,
                testType: testType as any,
              })
              .where(eq(testCases.id, id));
          }
        } else {
          const newCase: NewTestCase = {
            id,
            testPlanId,
            caseNumber,
            description,
            steps,
            expectedResult,
            actualResult,
            status: status as any,
            notes,
            executedBy: executedById,
            executedAt,
            erpRole: erpRole as any,
            testType: testType as any,
          };
          await db.insert(testCases).values(newCase);
        }
      } else {
        const newId = randomUUID();
        const newCase: NewTestCase = {
          id: newId,
          testPlanId,
          caseNumber,
          description,
          steps,
          expectedResult,
          actualResult,
          status: status as any,
          notes,
          executedBy: executedById,
          executedAt,
          erpRole: erpRole as any,
          testType: testType as any,
        };
        await db.insert(testCases).values(newCase);
      }
    }

    // 14. Rewrite Test Cases sheet with latest DB state
    latestTestCases = await db.select().from(testCases);
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

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Test Cases!A1:M${tcUpdatedRows.length}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: tcUpdatedRows
      }
    });

    const tcOldRowCount = tcRows.length;
    const tcNewRowCount = tcUpdatedRows.length;
    if (tcOldRowCount > tcNewRowCount) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `Test Cases!A${tcNewRowCount + 1}:M${tcOldRowCount}`
      });
    }
  }

  // Fetch latest counts for return value (if not already fetched)
  if (latestTasks.length === 0 && shouldSync(scope, "tasks")) {
    latestTasks = await db.select().from(tasks);
  }
  if (latestTestPlans.length === 0 && shouldSync(scope, "qa")) {
    latestTestPlans = await db.select().from(testPlans);
  }
  if (latestTestCases.length === 0 && shouldSync(scope, "qa")) {
    latestTestCases = await db.select().from(testCases);
  }

  return {
    success: true,
    message: `Google Sheets sync completed successfully (scope: ${scope})`,
    scope,
    dbCount: latestTasks.length,
    sheetCount: sheetTaskCount,
    testPlansCount: latestTestPlans.length,
    testCasesCount: latestTestCases.length
  };
}
