import { db } from "../src/db";
import { tasks } from "../src/db/schema";

async function main() {
  const dbTasks = await db.select().from(tasks);
  
  let withDueDate = 0;
  let nullDueDate = 0;
  for (const t of dbTasks) {
    if (t.dueDate) {
      withDueDate++;
    } else {
      nullDueDate++;
    }
  }
  
  console.log(`Total tasks: ${dbTasks.length}`);
  console.log(`With due date: ${withDueDate}`);
  console.log(`Null due date: ${nullDueDate}`);
  
  process.exit(0);
}

main().catch(console.error);
