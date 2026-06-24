import { db } from "../src/db";
import { tasks, taskContributors, users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Helper to roll date to nearest workday (Monday if weekend)
function rollToWorkday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  if (day === 0) { // Sunday
    result.setDate(result.getDate() + 1);
  } else if (day === 6) { // Saturday
    result.setDate(result.getDate() + 2);
  }
  return result;
}

// Helper to add business days
function addBusinessDays(startDate: Date, days: number): Date {
  let currentDate = new Date(startDate);
  currentDate = rollToWorkday(currentDate);
  
  let addedDays = 0;
  while (addedDays < days) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sat/Sun
      addedDays++;
    }
  }
  return currentDate;
}

// Get the date at N business days from base date
function getBusinessDateOffset(baseDate: Date, offsetDays: number): Date {
  let currentDate = new Date(baseDate);
  currentDate = rollToWorkday(currentDate);
  
  let count = 0;
  while (count < offsetDays) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return currentDate;
}

async function main() {
  console.log("=== GENERATING LOGICAL SEQUENTIAL TIMELINES FOR ALL TASKS (3-MONTH WINDOW) ===");

  // 1. Fetch all tasks
  const allTasks = await db.select().from(tasks);
  console.log(`Fetched ${allTasks.length} tasks from DB.`);

  // 2. Fetch all contributors
  const contributorsList = await db
    .select({
      taskId: taskContributors.taskId,
      developerId: taskContributors.developerId,
      isCurrentActive: taskContributors.isCurrentActive,
      name: users.name,
    })
    .from(taskContributors)
    .innerJoin(users, eq(taskContributors.developerId, users.id));

  // Map task ID to contributors
  const taskToContributors = new Map<string, typeof contributorsList>();
  for (const c of contributorsList) {
    if (!taskToContributors.has(c.taskId)) {
      taskToContributors.set(c.taskId, []);
    }
    taskToContributors.get(c.taskId)!.push(c);
  }

  // 3. Resolve primary developer for each task
  const devTasksMap = new Map<string, typeof allTasks>();
  const unassignedTasks: typeof allTasks = [];

  for (const t of allTasks) {
    let devId: string | null = null;
    
    // Check contributors first
    const taskConts = taskToContributors.get(t.id);
    if (taskConts && taskConts.length > 0) {
      const active = taskConts.find(c => c.isCurrentActive);
      devId = active ? active.developerId : taskConts[0].developerId;
    } else {
      devId = t.assigneeId;
    }

    if (devId) {
      if (!devTasksMap.has(devId)) {
        devTasksMap.set(devId, []);
      }
      devTasksMap.get(devId)!.push(t);
    } else {
      unassignedTasks.push(t);
    }
  }

  console.log(`Grouped tasks:`);
  for (const [devId, tasksList] of devTasksMap.entries()) {
    const userObj = await db.select().from(users).where(eq(users.id, devId)).limit(1);
    const name = userObj[0]?.name || devId;
    console.log(`  - Developer ${name}: ${tasksList.length} tasks`);
  }
  console.log(`  - Unassigned Tasks: ${unassignedTasks.length} tasks`);

  const newStartDates: Record<string, string> = {};
  let updatedDbTasksCount = 0;

  // Project start date
  const PROJECT_START_DATE = new Date("2026-06-01");
  // Limit start date offset to 50 business days (approx. middle of August)
  // to ensure all tasks end before August 31, 2026.
  const MAX_START_OFFSET_DAYS = 50; 

  async function scheduleTasks(tasksList: typeof allTasks, devName: string) {
    // Sort tasks logically by Phase, Epic, Priority, Title
    const sorted = [...tasksList].sort((a, b) => {
      const phaseA = a.phase ? parseInt(a.phase.replace(/\D/g, "")) || 99 : 99;
      const phaseB = b.phase ? parseInt(b.phase.replace(/\D/g, "")) || 99 : 99;
      if (phaseA !== phaseB) return phaseA - phaseB;

      const epicA = a.epic || "";
      const epicB = b.epic || "";
      if (epicA !== epicB) return epicA.localeCompare(epicB);

      const prioOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      const prioA = prioOrder[a.priority] ?? 2;
      const prioB = prioOrder[b.priority] ?? 2;
      if (prioA !== prioB) return prioA - prioB;

      return a.title.localeCompare(b.title);
    });

    const T = sorted.length;

    for (let i = 0; i < T; i++) {
      const t = sorted[i];
      
      // Calculate start day offset based on index to distribute them across 3 months
      const dayOffset = T > 1 ? Math.floor((i / (T - 1)) * MAX_START_OFFSET_DAYS) : 0;
      
      const startDate = getBusinessDateOffset(PROJECT_START_DATE, dayOffset);

      // Determine duration based on priority and type
      let durationDays = 3;
      const isDefect = t.title.startsWith("[DEFECT]") || t.epic === "BUG" || t.taskType === "BUG";
      if (isDefect) {
        durationDays = 1;
      } else if (t.priority === "urgent") {
        durationDays = 5;
      } else if (t.priority === "high") {
        durationDays = 4;
      } else if (t.priority === "medium") {
        durationDays = 3;
      } else if (t.priority === "low") {
        durationDays = 2;
      }

      const endDate = addBusinessDays(startDate, durationDays - 1);

      const startDateStr = formatDate(startDate);
      const endDateStr = formatDate(endDate);

      newStartDates[t.id] = startDateStr;

      // Update DB if different
      if (t.dueDate !== endDateStr) {
        await db.update(tasks).set({ dueDate: endDateStr }).where(eq(tasks.id, t.id));
        updatedDbTasksCount++;
      }
    }
  }

  // Schedule for each developer
  for (const [devId, tasksList] of devTasksMap.entries()) {
    const userObj = await db.select().from(users).where(eq(users.id, devId)).limit(1);
    const name = userObj[0]?.name || devId;
    await scheduleTasks(tasksList, name);
  }

  // Schedule unassigned tasks
  if (unassignedTasks.length > 0) {
    await scheduleTasks(unassignedTasks, "Unassigned Pool");
  }

  // 5. Write default-start-dates.json
  const defaultStartDatesPath = path.join(process.cwd(), "src/lib/default-start-dates.json");
  fs.writeFileSync(defaultStartDatesPath, JSON.stringify(newStartDates, null, 2), "utf-8");

  console.log(`\n✅ Finished scheduling within 3-month boundary!`);
  console.log(`   - Total tasks scheduled: ${Object.keys(newStartDates).length}`);
  console.log(`   - Updated ${updatedDbTasksCount} tasks in SQLite Database with new due dates.`);
  console.log(`   - Wrote start dates map to ${defaultStartDatesPath}`);
  
  process.exit(0);
}

main().catch(console.error);
