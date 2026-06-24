import { db } from "../src/db";
import { tasks, taskContributors, users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

async function main() {
  console.log("=== REVISION PHASE 1: RE-SEED CONTRIBUTORS ===");

  // Clear existing contributors
  await db.delete(taskContributors);
  console.log("Cleared all existing taskContributors.");

  // Fetch developers
  const devs = await db.select().from(users).where(eq(users.role, "developer"));
  const affan = devs.find(u => u.name === "Affan")!;
  const halim = devs.find(u => u.name === "Halim")!;
  const rifqi = devs.find(u => u.name === "Rifqi")!;
  const akbar = devs.find(u => u.name === "Akbar")!;
  const hendik = devs.find(u => u.name === "Hendik")!;
  const agung = devs.find(u => u.name === "Agung")!;

  const allTasks = await db.select().from(tasks);
  let insertCount = 0;
  let activeTaskCount = 0;

  async function addContributor(taskId: string, devId: string, isActive: boolean = false) {
    await db.insert(taskContributors).values({
      id: randomUUID(),
      taskId,
      developerId: devId,
      individualProgress: 0,
      isCurrentActive: isActive,
    });
    insertCount++;
  }

  for (const t of allTasks) {
    const epic = (t.epic || "").toUpperCase();

    // Reset assigneeId to null by default
    await db.update(tasks).set({ assigneeId: null }).where(eq(tasks.id, t.id));

    // ADM & MST -> Affan (FE) + Akbar (API)
    if (epic === "ADM" || epic === "MST") {
      await addContributor(t.id, affan.id, true);
      await addContributor(t.id, akbar.id);
      await db.update(tasks).set({ assigneeId: affan.id }).where(eq(tasks.id, t.id));
      activeTaskCount++;
    }
    // PUR -> Rifqi (FE) + Agung (BE) -- NO API
    else if (epic === "PUR") {
      await addContributor(t.id, rifqi.id, true);
      await addContributor(t.id, agung.id);
      await db.update(tasks).set({ assigneeId: rifqi.id }).where(eq(tasks.id, t.id));
      activeTaskCount++;
    }
    // SLS -> Halim (FE) + Hendik (BE) -- NO API
    else if (epic === "SLS") {
      await addContributor(t.id, halim.id, true);
      await addContributor(t.id, hendik.id);
      await db.update(tasks).set({ assigneeId: halim.id }).where(eq(tasks.id, t.id));
      activeTaskCount++;
    }
    // Other epics (INV, PRD, AP, AR, FIN, GL, RPT) -> Leave unassigned (no contributors, assigneeId = null)
  }

  console.log(`\nRe-assigned ${insertCount} contributors to ${activeTaskCount} active tasks.`);
  console.log(`Left ${allTasks.length - activeTaskCount} tasks unassigned for future phases.`);

  process.exit(0);
}

main().catch(console.error);
