import { db } from "../src/db";
import { tasks, users } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function rollWork(d: Date): Date {
  const r = new Date(d);
  if (r.getDay() === 0) r.setDate(r.getDate()+1);
  if (r.getDay() === 6) r.setDate(r.getDate()+2);
  return r;
}

function addBizDays(d: Date, n: number): Date {
  let c = new Date(d); c = rollWork(c);
  let added = 0;
  while (added < n) { c.setDate(c.getDate()+1); if (c.getDay()!==0 && c.getDay()!==6) added++; }
  return c;
}

async function main() {
  console.log("=== ADJUSTING AFFAN TIMELINE (MST DONE BY JUNE 11) ===\n");

  const devs = await db.select().from(users).where(eq(users.role, "developer"));
  const affan = devs.find(u => u.name === "Affan")!;

  const affanTasks = await db.select().from(tasks).where(eq(tasks.assigneeId, affan.id));
  
  const mstTasks = affanTasks.filter(t => t.epic === "MST");
  const admTasks = affanTasks.filter(t => t.epic === "ADM");

  // 1. Pack MST Tasks between June 1 and June 11 (approx 9 business days)
  const startDate = new Date("2026-06-01");
  let cursor = rollWork(startDate);

  // We have 34 MST tasks. If we do ~4 tasks per day, it takes 8-9 days.
  let tasksPerDayCount = 0;

  for (const t of mstTasks) {
    const startStr = fmt(cursor);
    // Since it's packed, they start and end on the same day or +1 day max
    const endStr = fmt(addBizDays(cursor, 1)); 

    await db.update(tasks).set({
      startDate: startStr,
      dueDate: endStr,
    }).where(eq(tasks.id, t.id));

    tasksPerDayCount++;
    if (tasksPerDayCount >= 4) {
      cursor = addBizDays(cursor, 1);
      tasksPerDayCount = 0;
    }
  }

  console.log(`Packed ${mstTasks.length} MST tasks between June 1 and ${fmt(cursor)}.`);

  // 2. Schedule ADM tasks starting from June 12
  let admCursor = rollWork(new Date("2026-06-12"));
  
  for (const t of admTasks) {
    const sDate = rollWork(admCursor);
    const eDate = addBizDays(sDate, 1); // 1-2 days for ADM

    await db.update(tasks).set({
      startDate: fmt(sDate),
      dueDate: fmt(eDate),
    }).where(eq(tasks.id, t.id));

    admCursor = addBizDays(eDate, 1);
  }

  console.log(`Scheduled ${admTasks.length} ADM tasks starting June 12. Ends around ${fmt(admCursor)}.`);

  process.exit(0);
}

main().catch(console.error);
