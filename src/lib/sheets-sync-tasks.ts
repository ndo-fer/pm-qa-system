import { db } from "@/db";
import { tasks, users, projects, NewTask } from "@/db/schema";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sheetsRequest } from "./sheets-client";
import type { sheets_v4 } from "googleapis";

export interface SyncTasksResult {
  latestTasks: typeof tasks.$inferSelect[];
  sheetTaskCount: number;
}

export async function syncTasks(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  allUsers: (typeof users.$inferSelect)[],
  allProjects: (typeof projects.$inferSelect)[]
): Promise<SyncTasksResult> {
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
      range: "Tasks!A1:O1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          "Task ID", "Project ID", "Task Code", "Title", "Epic", "Feature",
          "Task Type", "Status", "Priority", "Assignee Email", "Due Date",
          "Progress (%)", "Blocker", "Phase", "Updated At"
        ]]
      }
    });
  }

  // 2. Fetch all rows from Tasks spreadsheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Tasks!A:O"
  });

  const rows = response.data.values || [];
  const dataRows = rows.slice(1);
  const sheetTaskCount = dataRows.length;

  const processedTaskIds = new Set<string>();

  // Fetch existing tasks from DB once before transaction to resolve N+1 queries
  const existingDbTasks = await db.select().from(tasks);
  const existingTasksMap = new Map(existingDbTasks.map(t => [t.id, t]));

  const tasksToUpsert: NewTask[] = [];

  // 3. Reconcile rows from Sheet into DB
  for (const row of dataRows) {
    if (row.length === 0) continue;

    const id = row[0]?.trim();
    const projectId = row[1]?.trim();
    const resolvedProjectId = allProjects.some(p => p.id === projectId) ? projectId : defaultProject.id;
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
    const sheetUpdatedAt = row[14]?.trim() || null;

    if (!["todo", "in_progress", "review", "done"].includes(status)) {
      status = "todo";
    }
    if (!["low", "medium", "high", "urgent"].includes(priority)) {
      priority = "medium";
    }

    if (!title) continue;

    const assigneeId = assigneeEmail ? (emailToUserIdMap[assigneeEmail] || null) : null;

    const targetId = id || randomUUID();
    const dbTask = id ? existingTasksMap.get(id) : null;

    if (dbTask) {
      const dbUpdatedAt = dbTask.updatedAt || null;

      // If DB has a different updatedAt timestamp than the sheet, DB wins
      const useDbStatus = sheetUpdatedAt !== dbUpdatedAt;
      
      const resolvedTitle = useDbStatus ? dbTask.title : title;
      const resolvedStatus = useDbStatus ? dbTask.status : status;
      const resolvedPriority = useDbStatus ? dbTask.priority : priority;
      const resolvedAssigneeId = useDbStatus ? dbTask.assigneeId : assigneeId;
      const resolvedProgress = useDbStatus ? dbTask.progress : progress;
      const resolvedBlocker = useDbStatus ? dbTask.blocker : blocker;
      const resolvedPhase = useDbStatus ? dbTask.phase : phase;
      const resolvedEpic = useDbStatus ? dbTask.epic : epic;
      const resolvedFeature = useDbStatus ? dbTask.feature : feature;
      const resolvedTaskCode = useDbStatus ? dbTask.taskCode : taskCode;
      const resolvedDueDate = useDbStatus ? dbTask.dueDate : dueDate;
      const finalProjectId = useDbStatus ? dbTask.projectId : resolvedProjectId;

      const hasChanges =
        dbTask.title !== resolvedTitle ||
        dbTask.status !== resolvedStatus ||
        dbTask.priority !== resolvedPriority ||
        dbTask.assigneeId !== resolvedAssigneeId ||
        dbTask.progress !== resolvedProgress ||
        dbTask.blocker !== resolvedBlocker ||
        dbTask.phase !== resolvedPhase ||
        dbTask.epic !== resolvedEpic ||
        dbTask.feature !== resolvedFeature ||
        dbTask.taskCode !== resolvedTaskCode ||
        dbTask.dueDate !== resolvedDueDate ||
        dbTask.projectId !== finalProjectId;

      if (hasChanges) {
        tasksToUpsert.push({
          id: targetId,
          projectId: finalProjectId,
          taskCode: resolvedTaskCode,
          title: resolvedTitle,
          epic: resolvedEpic,
          feature: resolvedFeature,
          taskType,
          status: resolvedStatus as "todo" | "in_progress" | "review" | "done",
          priority: resolvedPriority as "low" | "medium" | "high" | "urgent",
          assigneeId: resolvedAssigneeId,
          dueDate: resolvedDueDate,
          progress: resolvedProgress,
          blocker: resolvedBlocker,
          phase: resolvedPhase,
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      tasksToUpsert.push({
        id: targetId,
        projectId: resolvedProjectId,
        taskCode,
        title,
        epic,
        feature,
        taskType,
        status: status as "todo" | "in_progress" | "review" | "done",
        priority: priority as "low" | "medium" | "high" | "urgent",
        assigneeId,
        dueDate,
        progress,
        blocker,
        phase
      });
    }
    processedTaskIds.add(targetId);
  }

  if (tasksToUpsert.length > 0) {
    await db.transaction(async (tx) => {
      await tx.insert(tasks)
        .values(tasksToUpsert)
        .onConflictDoUpdate({
          target: tasks.id,
          set: {
            projectId: sql`excluded.project_id`,
            taskCode: sql`excluded.task_code`,
            title: sql`excluded.title`,
            epic: sql`excluded.epic`,
            feature: sql`excluded.feature`,
            taskType: sql`excluded.task_type`,
            status: sql`excluded.status`,
            priority: sql`excluded.priority`,
            assigneeId: sql`excluded.assignee_id`,
            dueDate: sql`excluded.due_date`,
            progress: sql`excluded.progress`,
            blocker: sql`excluded.blocker`,
            phase: sql`excluded.phase`,
            updatedAt: sql`excluded.updated_at`
          }
        });
    });
  }

  // 4. Fetch latest tasks from DB
  const latestTasks = await db.select().from(tasks);

  // 5. Rewrite Tasks sheet with latest DB state
  const updatedRows = [
    [
      "Task ID", "Project ID", "Task Code", "Title", "Epic", "Feature",
      "Task Type", "Status", "Priority", "Assignee Email", "Due Date",
      "Progress (%)", "Blocker", "Phase", "Updated At"
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
      t.phase || "",
      t.updatedAt || ""
    ]);
  }

  await sheetsRequest(() => sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Tasks!A1:O${updatedRows.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: updatedRows
    }
  }));

  const oldRowCount = rows.length;
  const newRowCount = updatedRows.length;
  if (oldRowCount > newRowCount) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `Tasks!A${newRowCount + 1}:O${oldRowCount}`
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

  await sheetsRequest(() => sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Developer Task Board!A1:Z${updatedDevBoardRows.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: updatedDevBoardRows
    }
  }));

  return { latestTasks, sheetTaskCount };
}
