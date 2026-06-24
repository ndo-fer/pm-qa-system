import { db } from "../src/db";
import { tasks, taskContributors, users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== UPDATING REAL PROGRESS BASED ON MEETING ===\n");

  const devs = await db.select().from(users).where(eq(users.role, "developer"));
  const affan = devs.find(u => u.name === "Affan")!;
  const halim = devs.find(u => u.name === "Halim")!;
  const rifqi = devs.find(u => u.name === "Rifqi")!;
  const akbar = devs.find(u => u.name === "Akbar")!;
  const hendik = devs.find(u => u.name === "Hendik")!;
  const agung = devs.find(u => u.name === "Agung")!;

  const allTasks = await db.select().from(tasks);
  const allContribs = await db.select().from(taskContributors);

  let updatedMst = 0;
  let updatedPur = 0;
  let updatedSls = 0;

  for (const t of allTasks) {
    const epic = t.epic;
    if (!epic) continue;

    const tContribs = allContribs.filter(c => c.taskId === t.id);

    if (epic === "MST") {
      // Affan & Akbar = 100%, Task = Done
      for (const c of tContribs) {
        if (c.developerId === affan.id || c.developerId === akbar.id) {
          await db.update(taskContributors).set({ individualProgress: 100 }).where(eq(taskContributors.id, c.id));
        }
      }
      await db.update(tasks).set({ progress: 100, status: "done" }).where(eq(tasks.id, t.id));
      updatedMst++;
    } 
    else if (epic === "PUR") {
      // Rifqi = 50%, Agung = 15%
      for (const c of tContribs) {
        if (c.developerId === rifqi.id) {
          await db.update(taskContributors).set({ individualProgress: 50 }).where(eq(taskContributors.id, c.id));
        } else if (c.developerId === agung.id) {
          await db.update(taskContributors).set({ individualProgress: 15 }).where(eq(taskContributors.id, c.id));
        }
      }
      await db.update(tasks).set({ progress: 32, status: "in_progress" }).where(eq(tasks.id, t.id)); // (50+15)/2 = 32.5
      updatedPur++;
    }
    else if (epic === "SLS") {
      // Halim = 50%, Hendik = 15%
      for (const c of tContribs) {
        if (c.developerId === halim.id) {
          await db.update(taskContributors).set({ individualProgress: 50 }).where(eq(taskContributors.id, c.id));
        } else if (c.developerId === hendik.id) {
          await db.update(taskContributors).set({ individualProgress: 15 }).where(eq(taskContributors.id, c.id));
        }
      }
      await db.update(tasks).set({ progress: 32, status: "in_progress" }).where(eq(tasks.id, t.id));
      updatedSls++;
    }
  }

  console.log(`Updated ${updatedMst} MST tasks to 100% (Done).`);
  console.log(`Updated ${updatedPur} PUR tasks to 32% (In Progress).`);
  console.log(`Updated ${updatedSls} SLS tasks to 32% (In Progress).`);

  process.exit(0);
}

main().catch(console.error);
