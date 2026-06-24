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

// Duration based on task complexity
function getDuration(title: string, epic: string): number {
  const t = title.toLowerCase();
  // CRUD / Master = simpler
  if (t.includes("crud") || (t.includes("mas") && !t.includes("laporan"))) return 3;
  // Reports = lighter
  if (t.includes("laporan") || t.includes("report") || epic === "RPT") return 2;
  // Core modules = heavier
  if (t.includes("purchase order") || t.includes("sales order") || t.includes("surat jalan") || t.includes("faktur") || t.includes("spk") || t.includes("produksi") || t.includes("stock opname") || t.includes("payment") || t.includes("pembayaran") || t.includes("closing") || t.includes("ledger") || t.includes("neraca") || t.includes("jurnal")) return 5;
  // Medium features
  if (t.includes("implementasi") || t.includes("module")) return 4;
  // Default
  return 3;
}

async function main() {
  console.log("=== PHASE 4: TIMELINE GENERATION ===\n");

  const allTasks = await db.select().from(tasks);
  const devList = await db.select().from(users).where(eq(users.role, "developer"));

  const PROJECT_START = new Date("2026-06-01");

  // Group tasks by primary assignee
  const devTasks = new Map<string, typeof allTasks>();
  for (const t of allTasks) {
    const devId = t.assigneeId || "unassigned";
    if (!devTasks.has(devId)) devTasks.set(devId, []);
    devTasks.get(devId)!.push(t);
  }

  // Phase order for sorting
  const phaseOrder = (p: string | null): number => {
    if (!p) return 99;
    const n = parseInt(p.replace(/\D/g, ""));
    return isNaN(n) ? 99 : n;
  };

  let totalUpdated = 0;

  for (const [devId, devTaskList] of devTasks.entries()) {
    const dev = devList.find(d => d.id === devId);
    const devName = dev?.name || "Unassigned";

    // Sort by Phase → Epic → Title
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

      totalUpdated++;
      cursor = addBizDays(endDate, 1); // next task starts day after
    }

    const lastTask = sorted[sorted.length - 1];
    const lastEnd = lastTask ? (await db.select().from(tasks).where(eq(tasks.id, lastTask.id)))[0]?.dueDate : "?";
    console.log(`  ${devName}: ${sorted.length} tasks | Ends: ${lastEnd}`);
  }

  console.log(`\nUpdated ${totalUpdated} tasks with startDate + dueDate.`);

  // Verify all tasks have dates
  const final = await db.select().from(tasks);
  const noStart = final.filter(t => !t.startDate).length;
  const noDue = final.filter(t => !t.dueDate).length;
  console.log(`Tasks without startDate: ${noStart}`);
  console.log(`Tasks without dueDate: ${noDue}`);

  process.exit(0);
}

main().catch(console.error);
