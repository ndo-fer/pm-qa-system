import { db } from "../src/db";
import { tasks } from "../src/db/schema";
import defaultStartDates from "../src/lib/default-start-dates.json";

async function main() {
  const dbTasks = await db.select().from(tasks);
  
  const targetTask = dbTasks.find(t => t.title.includes("Implementasi Stock Opname Barang Jadi"));
  if (targetTask) {
    console.log(`Target Task found:`);
    console.log(`ID: ${targetTask.id}`);
    console.log(`Title: ${targetTask.title}`);
    console.log(`Due Date in DB: ${targetTask.dueDate}`);
    console.log(`In defaultStartDates: ${targetTask.id in defaultStartDates}`);
  } else {
    console.log("Target Task NOT found in DB!");
  }
  
  // Find a few tasks that don't match
  const noMatches = dbTasks.filter(t => !(t.id in defaultStartDates));
  console.log(`Total tasks with no match: ${noMatches.length}`);
  console.log("Sample no-match tasks:");
  for (const t of noMatches.slice(0, 5)) {
    console.log(`- [${t.id}] ${t.title}`);
  }
  
  process.exit(0);
}

main().catch(console.error);
