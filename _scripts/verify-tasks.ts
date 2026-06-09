import { db } from "../src/db";
import { tasks } from "../src/db/schema";

async function verify() {
  const allTasks = await db.select().from(tasks);
  console.log(`\n📊 Total tasks in database: ${allTasks.length}\n`);

  console.log("🎯 Breakdown by Epic:");
  const epicCounts: Record<string, number> = {};
  for (const task of allTasks) {
    if (task.epic) {
      epicCounts[task.epic] = (epicCounts[task.epic] || 0) + 1;
    }
  }
  for (const [epic, count] of Object.entries(epicCounts).sort()) {
    console.log(`   ${epic}: ${count} tasks`);
  }

  console.log("\n Breakdown by ERP Role:");
  const roleCounts: Record<string, number> = {};
  for (const task of allTasks) {
    const role = task.erpRole || "null";
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  for (const [role, count] of Object.entries(roleCounts).sort()) {
    console.log(`   ${role}: ${count} tasks`);
  }

  console.log("\n🎯 Breakdown by Phase:");
  const phaseCounts: Record<string, number> = {};
  for (const task of allTasks) {
    if (task.phase) {
      phaseCounts[task.phase] = (phaseCounts[task.phase] || 0) + 1;
    }
  }
  for (const [phase, count] of Object.entries(phaseCounts).sort()) {
    console.log(`   ${phase}: ${count} tasks`);
  }

  console.log("\n🎯 Breakdown by Priority:");
  const priorityCounts: Record<string, number> = {};
  for (const task of allTasks) {
    priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
  }
  for (const [priority, count] of Object.entries(priorityCounts).sort()) {
    console.log(`   ${priority}: ${count} tasks`);
  }

  console.log("\n✅ Sample tasks with new fields:");
  const sampleTasks = allTasks.slice(0, 3);
  for (const task of sampleTasks) {
    console.log(`\n   Title: ${task.title}`);
    console.log(`   Epic: ${task.epic}`);
    console.log(`   ERP Role: ${task.erpRole}`);
    console.log(`   Phase: ${task.phase}`);
    console.log(`   Priority: ${task.priority}`);
    console.log(`   Assignee: ${task.assigneeId || "Unassigned (ready for manual assignment)"}`);
    console.log(`   Role Features: ${task.roleSpecificFeatures ? "✅ Defined" : "❌ None"}`);
  }
}

verify().catch(console.error);
