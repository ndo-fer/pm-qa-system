import { db } from "@/db";
import { users, projects, tasks, testPlans, testCases } from "@/db/schema";
import { getSheetsClient } from "./sheets-client";
import { syncTasks } from "./sheets-sync-tasks";
import { syncQA } from "./sheets-sync-qa";
import { syncMilestones } from "./sheets-sync-milestones";

export { getSheetsClient };

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
    const tasksResult = await syncTasks(sheets, spreadsheetId, allUsers, allProjects);
    latestTasks = tasksResult.latestTasks;
    sheetTaskCount = tasksResult.sheetTaskCount;
  }

  // ========== MILESTONES & S-CURVE SYNC (scope: all, tasks, milestones) ==========
  if (shouldSync(scope, "milestones") || shouldSync(scope, "tasks")) {
    await syncMilestones(sheets, spreadsheetId, allProjects);
  }

  // ========== QA SYNC (scope: all, qa) ==========
  if (shouldSync(scope, "qa")) {
    const qaResult = await syncQA(sheets, spreadsheetId, allProjects, allUsers);
    latestTestPlans = qaResult.latestTestPlans;
    latestTestCases = qaResult.latestTestCases;
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
