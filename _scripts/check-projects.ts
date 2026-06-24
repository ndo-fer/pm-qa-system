import { db } from "../src/db";
import { tasks, projects } from "../src/db/schema";

async function main() {
  const allProjects = await db.select().from(projects);
  console.log(`Projects:`);
  for (const p of allProjects) {
    const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, p.id));
    console.log(`  - [${p.code}] ${p.name}: ${projectTasks.length} tasks`);
  }
  process.exit(0);
}

import { eq } from "drizzle-orm";
main().catch(console.error);
