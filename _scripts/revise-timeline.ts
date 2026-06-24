import { db } from "../src/db";
import { tasks, users } from "../src/db/schema";
import { eq } from "drizzle-orm";

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

function getDuration(title: string, epic: string): number {
  const t = title.toLowerCase();
  if (t.includes("crud") || (t.includes("mas") && !t.includes("laporan"))) return 3;
  if (t.includes("laporan") || t.includes("report") || epic === "RPT") return 2;
  if (t.includes("purchase order") || t.includes("sales order") || t.includes("surat jalan") || t.includes("faktur")) return 5;
  if (t.includes("implementasi") || t.includes("module")) return 4;
  return 3;
}

async function main() {
  console.log("=== REVISION PHASE 2: RECALCULATE TIMELINE ===\n");

  const allTasks = await db.select().from(tasks);
  const devList = await db.select().from(users).where(eq(users.role, "developer"));

  const PROJECT_START = new Date("2026-06-01");

  // First, clear dates for unassigned tasks
  let clearedCount = 0;
  for (const t of allTasks) {
    if (!t.assigneeId) {
      await db.update(tasks).set({ startDate: null, dueDate: null }).where(eq(tasks.id, t.id));
      clearedCount++;
    }
  }
  console.log(`Cleared timeline for ${clearedCount} unassigned tasks.`);

  // Group active tasks by assignee
  const devTasks = new Map<string, typeof allTasks>();
  for (const t of allTasks) {
    if (t.assigneeId) {
      if (!devTasks.has(t.assigneeId)) devTasks.set(t.assigneeId, []);
      devTasks.get(t.assigneeId)!.push(t);
    }
  }

  const phaseOrder = (p: string | null): number => {
    if (!p) return 99;
    const n = parseInt(p.replace(/\D/g, ""));
    return isNaN(n) ? 99 : n;
  };

  let updatedCount = 0;

  for (const [devId, devTaskList] of devTasks.entries()) {
    const dev = devList.find(d => d.id === devId);
    const devName = dev?.name || "Unassigned";

    // Sort active tasks
    const sorted = [...devTaskList].sort((a, b) => {
      const pa = phaseOrder(a.phase), pb = phaseOrder(b.phase);
      if (pa !== pb) return pa - pb;
      const ea = a.epic || "", eb = b.epic || "";
      if (ea !== eb) return ea.localeCompare(eb);
      return a.title.localeCompare(b.title);
    });

    let cursor = new Date(PROJECT_START);

    for (const t of sorted) {
      const startDate = rollWork(cursor);
      const duration = getDuration(t.title, t.epic || "");
      const endDate = addBizDays(startDate, duration - 1);

      await db.update(tasks).set({
        startDate: fmt(startDate),
        dueDate: fmt(endDate),
      }).where(eq(tasks.id, t.id));

      updatedCount++;
      cursor = addBizDays(endDate, 1);
    }

    const lastTask = sorted[sorted.length - 1];
    const lastEnd = lastTask ? fmt(addBizDays(new Date((await db.select().from(tasks).where(eq(tasks.id, lastTask.id)))[0].startDate!), getDuration(lastTask.title, lastTask.epic||"")-1)) : "?";
    console.log(`  ${devName}: ${sorted.length} tasks scheduled | Ends around: ${lastEnd}`);
  }

  console.log(`\nRe-scheduled ${updatedCount} active tasks.`);

  process.exit(0);
}

main().catch(console.error);
