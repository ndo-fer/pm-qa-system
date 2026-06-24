import { db } from "../src/db";
import { tasks, users } from "../src/db/schema";
import { eq, isNotNull } from "drizzle-orm";

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

// FAKTOR PERCEPATAN (MVP)
function getDurationMVP(title: string, epic: string): number {
  const t = title.toLowerCase();
  // Master data / CRUD dasar (bisa di-generate/copas cepat)
  if (t.includes("crud") || t.includes("mas")) return 1;
  // Transaksi inti (logika lebih rumit)
  if (t.includes("purchase order") || t.includes("sales order") || t.includes("surat jalan") || t.includes("faktur")) return 3;
  // Modul / implementasi standar
  if (t.includes("implementasi") || t.includes("module")) return 2;
  // Default MVP
  return 1;
}

async function main() {
  console.log("=== COMPRESSING TIMELINE FOR MVP (MAX 3 MONTHS) ===\n");

  const allTasks = await db.select().from(tasks).where(isNotNull(tasks.assigneeId));
  const devList = await db.select().from(users).where(eq(users.role, "developer"));

  const PROJECT_START = new Date("2026-06-01");

  // Group by dev
  const devTasks = new Map<string, typeof allTasks>();
  for (const t of allTasks) {
    if (!devTasks.has(t.assigneeId!)) devTasks.set(t.assigneeId!, []);
    devTasks.get(t.assigneeId!)!.push(t);
  }

  const phaseOrder = (p: string | null): number => {
    if (!p) return 99;
    const n = parseInt(p.replace(/\D/g, ""));
    return isNaN(n) ? 99 : n;
  };

  for (const [devId, devTaskList] of devTasks.entries()) {
    // Sort
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
      // PENTING: Kalkulasi MVP duration
      const duration = getDurationMVP(t.title, t.epic || "");
      const endDate = addBizDays(startDate, Math.max(0, duration - 1));

      await db.update(tasks).set({
        startDate: fmt(startDate),
        dueDate: fmt(endDate),
      }).where(eq(tasks.id, t.id));

      cursor = addBizDays(endDate, 1);
    }
  }

  // CETAK HASIL BARU
  const activeEpics = ["ADM", "MST", "PUR", "SLS"];
  const finalTasks = await db.select().from(tasks).where(isNotNull(tasks.startDate));
  const epicDates: Record<string, { starts: string[], ends: string[], count: number }> = {};
  
  for (const t of finalTasks) {
    const epic = t.epic || "Unknown";
    if (!epicDates[epic]) epicDates[epic] = { starts: [], ends: [], count: 0 };
    epicDates[epic].starts.push(t.startDate!);
    epicDates[epic].ends.push(t.dueDate!);
    epicDates[epic].count++;
  }

  for (const epic of activeEpics) {
    const data = epicDates[epic];
    if (data) {
      const minStart = data.starts.sort()[0];
      const maxEnd = data.ends.sort()[data.ends.length - 1];
      console.log(`[${epic}] ${data.count} tasks : ${minStart} to ${maxEnd}`);
    }
  }

  process.exit(0);
}

main().catch(console.error);
