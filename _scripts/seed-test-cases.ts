import { db } from "../src/db";
import { tasks, testPlans, testCases, NewTestPlan, NewTestCase } from "../src/db/schema";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

// ============================================
// FLOW MAPPING CONFIGURATION
// ============================================

interface FlowConfig {
  name: string;
  module: string;
  epics: string[];
  priority: "high" | "medium" | "low";
  taskPrefix: string;
}

const FLOW_CONFIGS: FlowConfig[] = [
  {
    name: "Flow 1: Procurement",
    module: "Pemasok",
    epics: ["PUR", "AP"],
    priority: "high",
    taskPrefix: "TC-PUR"
  },
  {
    name: "Flow 2: Sales",
    module: "Pelanggan",
    epics: ["SLS", "AR"],
    priority: "high",
    taskPrefix: "TC-SLS"
  },
  {
    name: "Flow 3: Production",
    module: "Kinerja",
    epics: ["PRD"],
    priority: "medium",
    taskPrefix: "TC-PRD"
  },
  {
    name: "Flow 4: Inventory",
    module: "Barang",
    epics: ["INV"],
    priority: "medium",
    taskPrefix: "TC-INV"
  },
  {
    name: "Flow 5: Asset Accounting",
    module: "Katalog Lain",
    epics: ["MST"],
    priority: "low",
    taskPrefix: "TC-MST"
  },
  {
    name: "Flow 6: Finance",
    module: "Keuangan",
    epics: ["FIN"],
    priority: "low",
    taskPrefix: "TC-FIN"
  },
  {
    name: "Flow 7: Controlling & GL",
    module: "Pengaturan",
    epics: ["GL"],
    priority: "low",
    taskPrefix: "TC-GL"
  },
  {
    name: "Flow 8: Lain-lain",
    module: "Pengaturan",
    epics: ["MST", "ADM"],
    priority: "low",
    taskPrefix: "TC-ADM"
  }
];

// Filter MST tasks for Asset Accounting vs Lain-lain
const ASSET_ACCOUNTING_KEYWORDS = ["inventaris", "penyusutan", "asset", "fixed asset", "depreciation"];

function isAssetAccountingTask(taskTitle: string): boolean {
  const lower = taskTitle.toLowerCase();
  return ASSET_ACCOUNTING_KEYWORDS.some(keyword => lower.includes(keyword));
}

// ============================================
// CREDENTIALS CONFIGURATION
// ============================================

const CREDENTIALS = {
  administrator: {
    username: "PDJService",
    password: "pdj123",
    role: "administrator"
  },
  top_user: {
    username: "K009",
    password: "123456",
    role: "top_user"
  },
  user: {
    username: "K010",
    password: "12345",
    role: "user"
  }
};

// ============================================
// TEST STEP GENERATOR
// ============================================

function generateTestSteps(
  featureName: string,
  role: "administrator" | "top_user" | "user",
  roleFeatures: { features?: string[]; description?: string } | undefined
): { testSteps: string[]; expectedResult: string } {
  const features = roleFeatures?.features || [];
  const description = roleFeatures?.description || "";

  const loginStep = `Login as ${role === "administrator" ? "Administrator" : role === "top_user" ? "Top User" : "User"} (${CREDENTIALS[role].username}/${CREDENTIALS[role].password})`;
  const navigateStep = `Navigate to ${featureName} menu`;

  const featureSteps: string[] = [];
  const deniedSteps: string[] = [];

  // Generate steps based on features
  if (features.includes("Create") || features.includes("Create, Edit, Approve, Delete, View All")) {
    featureSteps.push(`Create new ${featureName.toLowerCase()} with all required fields`);
  }
  if (features.includes("Edit") || features.includes("Edit Own")) {
    featureSteps.push(`Edit existing ${featureName.toLowerCase()} details`);
  }
  if (features.includes("Approve")) {
    featureSteps.push(`Approve pending ${featureName.toLowerCase()}`);
  }
  if (features.includes("Delete")) {
    featureSteps.push(`Delete draft ${featureName.toLowerCase()}`);
  }
  if (features.includes("View All") || features.includes("View")) {
    featureSteps.push(`View all ${featureName.toLowerCase()} list`);
  }
  if (features.includes("Submit") || features.includes("Submit for Approval")) {
    featureSteps.push(`Submit ${featureName.toLowerCase()} for approval`);
  }
  if (features.includes("Search")) {
    featureSteps.push(`Search ${featureName.toLowerCase()} by name/code`);
  }
  if (features.includes("Export")) {
    featureSteps.push(`Export ${featureName.toLowerCase()} data to PDF/Excel`);
  }
  if (features.includes("Print")) {
    featureSteps.push(`Print ${featureName.toLowerCase()} document`);
  }
  if (features.includes("Update Status") || features.includes("Update Tanggal Kirim")) {
    featureSteps.push(`Update ${featureName.toLowerCase()} status`);
  }
  if (features.includes("Request") || features.includes("Request Price Change") || features.includes("Request Changes") || features.includes("Request Transfer") || features.includes("Request Correction")) {
    featureSteps.push(`Request ${featureName.toLowerCase()} changes`);
  }

  // Generate denied steps for lower roles
  if (role === "top_user") {
    if (!features.includes("Approve")) deniedSteps.push(`Attempt to approve ${featureName.toLowerCase()} (should be denied)`);
    if (!features.includes("Delete")) deniedSteps.push(`Attempt to delete approved ${featureName.toLowerCase()} (should be denied)`);
    if (!features.includes("Create")) deniedSteps.push(`Attempt to create ${featureName.toLowerCase()} (should be denied)`);
  }
  if (role === "user") {
    if (!features.includes("Create")) deniedSteps.push(`Attempt to create ${featureName.toLowerCase()} (should be denied)`);
    if (!features.includes("Edit")) deniedSteps.push(`Attempt to edit ${featureName.toLowerCase()} (should be denied)`);
    if (!features.includes("Delete")) deniedSteps.push(`Attempt to delete ${featureName.toLowerCase()} (should be denied)`);
  }

  const allSteps = [loginStep, navigateStep, ...featureSteps, ...deniedSteps];

  // Generate expected result
  let expectedResult = "";
  if (role === "administrator") {
    expectedResult = description || "Full access granted";
  } else if (role === "top_user") {
    const allowedFeatures = features.filter(f => !f.includes("View"));
    expectedResult = allowedFeatures.length > 0
      ? `${allowedFeatures.join("/")} allowed, restricted operations denied`
      : (description || "Limited access as expected");
  } else {
    expectedResult = description || "Read-only access, all write operations denied";
  }

  return {
    testSteps: allSteps,
    expectedResult
  };
}

// ============================================
// MAIN SEEDING LOGIC
// ============================================

async function seedTestCases(priorityFilter: "high" | "medium" | "low" | "all" = "all") {
  console.log("🚀 Starting QA Test Case Seeding...\n");
  console.log(`📋 Priority Filter: ${priorityFilter.toUpperCase()}\n`);

  // Get first project
  const projectList = await db.select().from(testPlans).limit(1);
  if (projectList.length === 0) {
    // Get from tasks
    const taskProject = await db.select().from(tasks).limit(1);
    if (taskProject.length === 0) {
      console.log("❌ No projects found. Please create a project first.");
      return;
    }
  }

  // Fetch all tasks
  const allTasks = await db.select().from(tasks);
  console.log(`📊 Total tasks in database: ${allTasks.length}\n`);

  // Group tasks by flow
  const tasksByFlow: Record<string, any[]> = {};
  for (const flow of FLOW_CONFIGS) {
    tasksByFlow[flow.name] = [];
  }

  for (const task of allTasks) {
    if (!task.epic) continue;

    // Special handling for MST tasks
    if (task.epic === "MST") {
      if (isAssetAccountingTask(task.title)) {
        tasksByFlow["Flow 5: Asset Accounting"].push(task);
      } else {
        tasksByFlow["Flow 8: Lain-lain"].push(task);
      }
      continue;
    }

    // Match task epic to flow
    for (const flow of FLOW_CONFIGS) {
      if (flow.epics.includes(task.epic)) {
        // Skip MST tasks already handled
        if (flow.name === "Flow 8: Lain-lain" && task.epic === "MST") continue;
        tasksByFlow[flow.name].push(task);
        break;
      }
    }
  }

  // Filter by priority
  const flowsToProcess = priorityFilter === "all"
    ? FLOW_CONFIGS
    : FLOW_CONFIGS.filter(f => f.priority === priorityFilter);

  console.log("📋 Flows to process:");
  for (const flow of flowsToProcess) {
    const taskCount = tasksByFlow[flow.name]?.length || 0;
    console.log(`   ${flow.name}: ${taskCount} tasks (${flow.priority.toUpperCase()})`);
  }
  console.log("");

  let totalTestPlansCreated = 0;
  let totalTestCasesCreated = 0;
  let totalTestCasesSkipped = 0;

  // Process each flow
  for (const flow of flowsToProcess) {
    const flowTasks = tasksByFlow[flow.name] || [];
    if (flowTasks.length === 0) {
      console.log(`⏭️  Skipping ${flow.name}: No tasks found\n`);
      continue;
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📦 Processing: ${flow.name}`);
    console.log(`${"=".repeat(60)}\n`);

    // Step 1: Create or get test plan
    let testPlan = await db
      .select()
      .from(testPlans)
      .where(eq(testPlans.name, flow.name))
      .limit(1);

    let testPlanId: string;

    if (testPlan.length === 0) {
      // Get project ID from first task
      const projectId = flowTasks[0].projectId;

      const newTestPlan: NewTestPlan = {
        id: randomUUID(),
        projectId,
        name: flow.name,
        module: flow.module as any,
        status: "draft"
      };

      const [created] = await db.insert(testPlans).values(newTestPlan).returning();
      testPlanId = created.id;
      console.log(`✅ Created Test Plan: ${flow.name} (${flow.module})`);
      totalTestPlansCreated++;
    } else {
      testPlanId = testPlan[0].id;
      console.log(`ℹ️  Using existing Test Plan: ${flow.name}`);
    }

    // Step 2: Create test cases for each task
    let taskCounter = 1;
    for (const task of flowTasks) {
      // Generate case number
      const caseNumber = `${flow.taskPrefix}-${String(taskCounter).padStart(3, "0")}`;
      taskCounter++;

      // Check if test case already exists
      const existing = await db
        .select()
        .from(testCases)
        .where(eq(testCases.caseNumber, caseNumber))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  ⏭️  Skipped: ${caseNumber} - ${task.title}`);
        totalTestCasesSkipped++;
        continue;
      }

      // Extract feature name from task
      const featureName = task.feature || task.title.replace(/Module|CRUD|View|Engine|Logic|Enhancement|Update|Migration|Testing/gi, "").trim();

      // Get role-specific features
      const roleFeatures = task.roleSpecificFeatures as any || {};

      // Generate test steps for each role
      const adminSteps = generateTestSteps(featureName, "administrator", roleFeatures.administrator);
      const topUserSteps = generateTestSteps(featureName, "top_user", roleFeatures.top_user);
      const userSteps = generateTestSteps(featureName, "user", roleFeatures.user);

      // Build matrix credentials
      const loginCredentials = {
        type: "matrix",
        scenarios: [
          {
            role: "administrator",
            username: CREDENTIALS.administrator.username,
            password: CREDENTIALS.administrator.password,
            testSteps: adminSteps.testSteps,
            expectedResult: adminSteps.expectedResult
          },
          {
            role: "top_user",
            username: CREDENTIALS.top_user.username,
            password: CREDENTIALS.top_user.password,
            testSteps: topUserSteps.testSteps,
            expectedResult: topUserSteps.expectedResult
          },
          {
            role: "user",
            username: CREDENTIALS.user.username,
            password: CREDENTIALS.user.password,
            testSteps: userSteps.testSteps,
            expectedResult: userSteps.expectedResult
          }
        ]
      };

      // Build test case description
      const description = `${task.title} - Full Role Testing (Matrix)`;

      // Build steps summary
      const steps = `Matrix Test Case - 3 Role Scenarios:\n\n` +
        `👑 Administrator (${CREDENTIALS.administrator.username}):\n${adminSteps.testSteps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}\n\n` +
        `⭐ Top User (${CREDENTIALS.top_user.username}):\n${topUserSteps.testSteps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}\n\n` +
        `👤 User (${CREDENTIALS.user.username}):\n${userSteps.testSteps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`;

      // Build expected result summary
      const expectedResult = `All 3 roles tested:\n` +
        `👑 Administrator: ${adminSteps.expectedResult}\n` +
        `⭐ Top User: ${topUserSteps.expectedResult}\n` +
        ` User: ${userSteps.expectedResult}`;

      // Create test case
      const newTestCase: NewTestCase = {
        id: randomUUID(),
        testPlanId,
        caseNumber,
        description,
        steps,
        expectedResult,
        status: "pending",
        erpRole: "matrix",
        testType: "permission",
        loginCredentials: loginCredentials as any,
        notes: `Linked to Task: ${task.title} (ID: ${task.id})`
      };

      await db.insert(testCases).values(newTestCase);
      console.log(`  ✅ Created: ${caseNumber} - ${task.title}`);
      totalTestCasesCreated++;
    }

    console.log(`\n✅ ${flow.name} Complete: ${flowTasks.length} test cases processed\n`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SEEDING SUMMARY");
  console.log("=".repeat(60));
  console.log(`\n✅ Test Plans Created: ${totalTestPlansCreated}`);
  console.log(`✅ Test Cases Created: ${totalTestCasesCreated}`);
  console.log(`⏭️  Test Cases Skipped: ${totalTestCasesSkipped}`);
  console.log(`📝 Total Processed: ${totalTestCasesCreated + totalTestCasesSkipped}`);

  console.log("\n🎯 Breakdown by Flow:");
  for (const flow of flowsToProcess) {
    const flowTasks = tasksByFlow[flow.name] || [];
    if (flowTasks.length > 0) {
      console.log(`   ${flow.name}: ${flowTasks.length} test cases`);
    }
  }

  console.log("\n🎯 Breakdown by Role Coverage:");
  console.log(`   👑 Administrator: ${totalTestCasesCreated} scenarios`);
  console.log(`   ⭐ Top User: ${totalTestCasesCreated} scenarios`);
  console.log(`   👤 User: ${totalTestCasesCreated} scenarios`);
  console.log(`    Total Scenarios: ${totalTestCasesCreated * 3}`);

  console.log("\n✅ Seeding completed successfully!");
}

// ============================================
// EXECUTE
// ============================================

const priorityArg = process.argv[2]?.replace("--priority=", "") || "all";
const validPriorities = ["high", "medium", "low", "all"];

if (!validPriorities.includes(priorityArg)) {
  console.error(`❌ Invalid priority: ${priorityArg}`);
  console.error(`Valid options: ${validPriorities.join(", ")}`);
  process.exit(1);
}

seedTestCases(priorityArg as any)
  .then(() => {
    console.log("✓ Test case seeding completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test case seeding failed:", err);
    process.exit(1);
  });
