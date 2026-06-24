import { db } from "../src/db";
import { tasks, users } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const dbTasks = await db.select().from(tasks);
  
  let unassignedCount = 0;
  const rolesMap: Record<string, number> = {};
  
  for (const t of dbTasks) {
    if (!t.assigneeId) {
      unassignedCount++;
      rolesMap[t.erpRole || "null"] = (rolesMap[t.erpRole || "null"] || 0) + 1;
    }
  }
  
  console.log(`Total tasks in DB: ${dbTasks.length}`);
  console.log(`Unassigned tasks: ${unassignedCount}`);
  console.log("Unassigned tasks by erpRole:");
  console.log(rolesMap);
  
  process.exit(0);
}

main().catch(console.error);
