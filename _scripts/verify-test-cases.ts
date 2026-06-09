import { db } from "../src/db";
import { testPlans, testCases } from "../src/db/schema";

async function verifyTestCases() {
  console.log("\n🔍 Verifying QA Test Cases...\n");

  // Fetch all test plans
  const allPlans = await db.select().from(testPlans);
  console.log(` Total Test Plans: ${allPlans.length}\n`);

  // Fetch all test cases
  const allCases = await db.select().from(testCases);
  console.log(`📊 Total Test Cases: ${allCases.length}\n`);

  // Breakdown by test plan
  console.log(" Test Cases by Test Plan:");
  for (const plan of allPlans) {
    const planCases = allCases.filter(c => c.testPlanId === plan.id);
    console.log(`   ${plan.name}: ${planCases.length} test cases`);
  }

  // Breakdown by ERP role
  console.log("\n🎯 Breakdown by ERP Role:");
  const roleCounts: Record<string, number> = {};
  for (const tc of allCases) {
    const role = tc.erpRole || "null";
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }
  for (const [role, count] of Object.entries(roleCounts).sort()) {
    console.log(`   ${role}: ${count} test cases`);
  }

  // Breakdown by test type
  console.log("\n🎯 Breakdown by Test Type:");
  const typeCounts: Record<string, number> = {};
  for (const tc of allCases) {
    const type = tc.testType || "null";
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(typeCounts).sort()) {
    console.log(`   ${type}: ${count} test cases`);
  }

  // Breakdown by status
  console.log("\n🎯 Breakdown by Status:");
  const statusCounts: Record<string, number> = {};
  for (const tc of allCases) {
    statusCounts[tc.status] = (statusCounts[tc.status] || 0) + 1;
  }
  for (const [status, count] of Object.entries(statusCounts).sort()) {
    console.log(`   ${status}: ${count} test cases`);
  }

  // Verify matrix credentials
  console.log("\n✅ Matrix Credentials Verification:");
  let matrixCount = 0;
  let validCredentials = 0;
  let invalidCredentials = 0;

  for (const tc of allCases) {
    if (tc.erpRole === "matrix") {
      matrixCount++;
      try {
        const creds = tc.loginCredentials as any;
        if (creds && creds.type === "matrix" && creds.scenarios && creds.scenarios.length === 3) {
          const hasAllRoles = creds.scenarios.some((s: any) => s.role === "administrator") &&
                             creds.scenarios.some((s: any) => s.role === "top_user") &&
                             creds.scenarios.some((s: any) => s.role === "user");
          if (hasAllRoles) {
            validCredentials++;
          } else {
            invalidCredentials++;
            console.log(`   ❌ ${tc.caseNumber}: Missing role scenarios`);
          }
        } else {
          invalidCredentials++;
          console.log(`   ❌ ${tc.caseNumber}: Invalid credentials structure`);
        }
      } catch (e) {
        invalidCredentials++;
        console.log(`   ❌ ${tc.caseNumber}: Failed to parse credentials`);
      }
    }
  }

  console.log(`   ✅ Matrix Test Cases: ${matrixCount}`);
  console.log(`   ✅ Valid Credentials: ${validCredentials}`);
  console.log(`   ❌ Invalid Credentials: ${invalidCredentials}`);

  // Verify linked tasks
  console.log("\n🔗 Linked Tasks Verification:");
  let linkedCount = 0;
  let unlinkedCount = 0;

  for (const tc of allCases) {
    if (tc.notes && tc.notes.includes("Linked to Task:")) {
      linkedCount++;
    } else {
      unlinkedCount++;
    }
  }

  console.log(`   ✅ Linked to Tasks: ${linkedCount}`);
  console.log(`   ⚠️  Not Linked: ${unlinkedCount}`);

  // Sample test cases
  console.log("\n📝 Sample Test Cases:");
  const sampleCases = allCases.slice(0, 3);
  for (const tc of sampleCases) {
    console.log(`\n   Case Number: ${tc.caseNumber}`);
    console.log(`   Description: ${tc.description}`);
    console.log(`   ERP Role: ${tc.erpRole}`);
    console.log(`   Test Type: ${tc.testType}`);
    console.log(`   Status: ${tc.status}`);
    console.log(`   Has Credentials: ${tc.loginCredentials ? "✅" : "❌"}`);
    console.log(`   Linked Task: ${tc.notes?.includes("Linked to Task:") ? "✅" : "❌"}`);
  }

  // Total scenarios
  const totalScenarios = matrixCount * 3;
  console.log("\n📊 Total Scenarios (3 roles per matrix TC):");
  console.log(`   ${totalScenarios} scenarios (${matrixCount} test cases × 3 roles)`);

  console.log("\n✅ Verification completed!");
}

verifyTestCases().catch(console.error);
