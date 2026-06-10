import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<"admin" | "pm" | "developer" | "qa">().notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").unique().notNull(),
  description: text("description"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  status: text("status").$type<"planned" | "active" | "on_hold" | "completed">().notNull().default("planned"),
  sCurveTarget: jsonb("s_curve_target"),
  sCurveActual: jsonb("s_curve_actual"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role").$type<"admin" | "pm" | "developer" | "qa">().notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: text("assignee_id").references(() => users.id),
  status: text("status").$type<"todo" | "in_progress" | "review" | "done">().notNull().default("todo"),
  priority: text("priority").$type<"low" | "medium" | "high" | "urgent">().notNull().default("medium"),
  dueDate: text("due_date"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  // Developer workbook fields
  taskCode: text("task_code"),
  epic: text("epic"),
  feature: text("feature"),
  taskType: text("task_type"),
  srdRef: text("srd_ref"),
  frCode: text("fr_code"),
  acceptanceCriteria: text("acceptance_criteria"),
  progress: integer("progress").default(0),
  blocker: text("blocker"),
  sprintTarget: text("sprint_target"),
  phase: text("phase"),
  screenshotUrl: text("screenshot_url"),
  isArchived: integer("is_archived").default(0),
  // ERP role context fields
  erpRole: text("erp_role").$type<"administrator" | "top_user" | "user" | "all_roles">().default("all_roles"),
  roleSpecificFeatures: jsonb("role_specific_features"),
});

export const testPlans = pgTable("test_plans", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  module: text("module").$type<"Pemasok" | "Pelanggan" | "Barang" | "Katalog Lain" | "Pengaturan" | "Keuangan" | "Kinerja">().notNull(),
  status: text("status").$type<"draft" | "active" | "completed">().notNull().default("draft"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export const testCases = pgTable("test_cases", {
  id: text("id").primaryKey(),
  testPlanId: text("test_plan_id").notNull().references(() => testPlans.id),
  caseNumber: text("case_number").notNull(),
  description: text("description").notNull(),
  steps: text("steps"),
  expectedResult: text("expected_result"),
  actualResult: text("actual_result"),
  status: text("status").$type<"pending" | "pass" | "fail" | "blocked">().notNull().default("pending"),
  notes: text("notes"),
  executedBy: text("executed_by").references(() => users.id),
  executedAt: text("executed_at"),
  // ERP role-based testing fields
  erpRole: text("erp_role").$type<"administrator" | "top_user" | "user" | "matrix">(),
  testType: text("test_type").$type<"functional" | "permission" | "workflow" | "matrix">().default("functional"),
  loginCredentials: jsonb("login_credentials"),
});

export const milestones = pgTable("milestones", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  phase: text("phase").notNull(),
  module: text("module").notNull(),
  name: text("name").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  plannedWeight: text("planned_weight"),
  dependency: text("dependency"),
  exitCriteria: text("exit_criteria"),
  status: text("status").default("planned"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TestPlan = typeof testPlans.$inferSelect;
export type NewTestPlan = typeof testPlans.$inferInsert;
export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;


// ERP role-based types
export interface RoleSpecificFeatures {
  administrator?: {
    features: string[];
    description: string;
    menuAccess: string[];
  };
  top_user?: {
    features: string[];
    description: string;
    menuAccess: string[];
  };
  user?: {
    features: string[];
    description: string;
    menuAccess: string[];
  };
}

export interface LoginCredentials {
  type: "single" | "matrix";
  username?: string;
  password?: string;
  role?: string;
  scenarios?: Array<{
    role: string;
    username: string;
    password: string;
  }>;
}
