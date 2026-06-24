import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Zod schema reproduced from src/app/api/tasks/route.ts ───
// We import zod directly and rebuild the schema to test validation logic
// independently of the route handler.
import { z } from "zod";

const taskCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  projectId: z.string().optional(),
  projectCode: z.string().optional(),
  description: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().nullable().optional(),
  taskCode: z.string().nullable().optional(),
  epic: z.string().nullable().optional(),
  feature: z.string().nullable().optional(),
  taskType: z.string().nullable().optional(),
  srdRef: z.string().nullable().optional(),
  frCode: z.string().nullable().optional(),
  acceptanceCriteria: z.string().nullable().optional(),
  progress: z.number().min(0).max(100).default(0),
  blocker: z.string().nullable().optional(),
  sprintTarget: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  erpRole: z.enum(["administrator", "top_user", "user", "all_roles"]).default("all_roles"),
  screenshotUrl: z.string().nullable().optional(),
  roleSpecificFeatures: z.unknown().nullable().optional(),
});

describe("Task Creation Schema", () => {
  it("should accept valid task data with only required fields", () => {
    const result = taskCreateSchema.safeParse({ title: "Implement login page" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Implement login page");
      expect(result.data.status).toBe("todo");
      expect(result.data.priority).toBe("medium");
      expect(result.data.progress).toBe(0);
      expect(result.data.erpRole).toBe("all_roles");
    }
  });

  it("should reject when title is missing", () => {
    const result = taskCreateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const titleError = result.error.issues.find((i) => i.path.includes("title"));
      expect(titleError).toBeDefined();
    }
  });

  it("should reject when title is an empty string", () => {
    const result = taskCreateSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("should accept all valid status enum values", () => {
    for (const status of ["todo", "in_progress", "review", "done"]) {
      const result = taskCreateSchema.safeParse({ title: "Test", status });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid status values", () => {
    const result = taskCreateSchema.safeParse({ title: "Test", status: "invalid_status" });
    expect(result.success).toBe(false);
  });

  it("should accept all valid priority enum values", () => {
    for (const priority of ["low", "medium", "high", "urgent"]) {
      const result = taskCreateSchema.safeParse({ title: "Test", priority });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid priority values", () => {
    const result = taskCreateSchema.safeParse({ title: "Test", priority: "critical" });
    expect(result.success).toBe(false);
  });

  it("should accept all valid erpRole enum values", () => {
    for (const erpRole of ["administrator", "top_user", "user", "all_roles"]) {
      const result = taskCreateSchema.safeParse({ title: "Test", erpRole });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid erpRole values", () => {
    const result = taskCreateSchema.safeParse({ title: "Test", erpRole: "superadmin" });
    expect(result.success).toBe(false);
  });

  it("should enforce progress range 0-100", () => {
    const tooLow = taskCreateSchema.safeParse({ title: "Test", progress: -1 });
    expect(tooLow.success).toBe(false);

    const tooHigh = taskCreateSchema.safeParse({ title: "Test", progress: 101 });
    expect(tooHigh.success).toBe(false);

    const valid = taskCreateSchema.safeParse({ title: "Test", progress: 50 });
    expect(valid.success).toBe(true);
  });

  it("should accept full task data with all optional fields", () => {
    const fullTask = {
      title: "Full task",
      projectId: "proj-1",
      projectCode: "PRJ",
      description: "A description",
      assigneeId: "user-1",
      status: "in_progress",
      priority: "high",
      dueDate: "2025-12-31",
      taskCode: "TASK-001",
      epic: "Auth",
      feature: "Login",
      taskType: "feature",
      srdRef: "SRD-1.2",
      frCode: "FR-001",
      acceptanceCriteria: "User can log in",
      progress: 75,
      blocker: "Waiting on API",
      sprintTarget: "Sprint 3",
      phase: "Phase 1",
      erpRole: "administrator",
      screenshotUrl: "https://example.com/img.png",
    };
    const result = taskCreateSchema.safeParse(fullTask);
    expect(result.success).toBe(true);
  });

  it("should handle null optional fields gracefully", () => {
    const result = taskCreateSchema.safeParse({
      title: "Nullable test",
      description: null,
      assigneeId: null,
      dueDate: null,
      epic: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("Task Status Transitions", () => {
  const validStatuses = ["todo", "in_progress", "review", "done"] as const;

  it("should recognize all valid task statuses", () => {
    expect(validStatuses).toHaveLength(4);
    expect(validStatuses).toContain("todo");
    expect(validStatuses).toContain("in_progress");
    expect(validStatuses).toContain("review");
    expect(validStatuses).toContain("done");
  });

  it("should not allow 'cancelled' or 'blocked' as status", () => {
    for (const bad of ["cancelled", "blocked", "pending", "deferred"]) {
      const result = taskCreateSchema.safeParse({ title: "Test", status: bad });
      expect(result.success).toBe(false);
    }
  });
});

describe("Task Filter Parameters", () => {
  // The route handler uses searchParams for filtering:
  // status, assigneeId, priority, epic, erpRole
  // These are cast to the enum types directly.

  it("status filter should accept valid enum values", () => {
    const validStatuses = ["todo", "in_progress", "review", "done"];
    for (const s of validStatuses) {
      const result = taskCreateSchema.shape.status.safeParse(s);
      expect(result.success).toBe(true);
    }
  });

  it("priority filter should accept valid enum values", () => {
    const validPriorities = ["low", "medium", "high", "urgent"];
    for (const p of validPriorities) {
      const result = taskCreateSchema.shape.priority.safeParse(p);
      expect(result.success).toBe(true);
    }
  });

  it("erpRole filter should accept valid enum values", () => {
    const validRoles = ["administrator", "top_user", "user", "all_roles"];
    for (const r of validRoles) {
      const result = taskCreateSchema.shape.erpRole.safeParse(r);
      expect(result.success).toBe(true);
    }
  });
});
