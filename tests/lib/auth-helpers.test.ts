import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/db/schema", () => ({
  projectMembers: {
    projectId: "project_members.project_id",
    userId: "project_members.user_id",
    role: "project_members.role",
  },
}));

import { db } from "@/db";
import { authorizeProjectRole } from "@/lib/auth-helpers";

describe("authorizeProjectRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return authorized: true when user has an allowed role", async () => {
    const mockMember = {
      id: "mem-1",
      projectId: "proj-1",
      userId: "user-1",
      role: "admin",
    };

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockMember]),
        }),
      }),
    });

    const result = await authorizeProjectRole("proj-1", "user-1", ["admin", "pm"]);

    expect(result.authorized).toBe(true);
    expect(result.errorResponse).toBeNull();
    expect(result.role).toBe("admin");
    expect(result.member).toEqual(mockMember);
  });

  it("should return authorized: false with 403 when user is not a project member", async () => {
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await authorizeProjectRole("proj-1", "user-1", ["admin", "pm"]);

    expect(result.authorized).toBe(false);
    expect(result.errorResponse).toBeDefined();
    expect(result.role).toBeNull();
    expect(result.member).toBeNull();

    // The error response should be a NextResponse with 403
    const responseBody = await result.errorResponse!.json();
    expect(result.errorResponse!.status).toBe(403);
    expect(responseBody.error).toMatch(/not a project member/i);
  });

  it("should return authorized: false with 403 when user role is not in allowedRoles", async () => {
    const mockMember = {
      id: "mem-1",
      projectId: "proj-1",
      userId: "user-1",
      role: "developer",
    };

    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockMember]),
        }),
      }),
    });

    const result = await authorizeProjectRole("proj-1", "user-1", ["admin", "pm"]);

    expect(result.authorized).toBe(false);
    expect(result.role).toBe("developer");
    expect(result.member).toEqual(mockMember);

    const responseBody = await result.errorResponse!.json();
    expect(result.errorResponse!.status).toBe(403);
    expect(responseBody.error).toMatch(/not authorized/i);
    expect(responseBody.error).toContain("developer");
  });

  it("should accept all valid member roles in allowedRoles", async () => {
    const roles = ["admin", "pm", "developer", "qa"] as const;

    for (const role of roles) {
      vi.clearAllMocks();
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "mem-1", projectId: "proj-1", userId: "user-1", role },
            ]),
          }),
        }),
      });

      const result = await authorizeProjectRole("proj-1", "user-1", [role]);
      expect(result.authorized).toBe(true);
      expect(result.role).toBe(role);
    }
  });

  it("should call db.select with correct table and conditions", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    (db.select as any).mockReturnValue({ from: mockFrom });

    await authorizeProjectRole("proj-abc", "user-xyz", ["qa"]);

    expect(db.select).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  it("should return errorResponse with 403 for non-member even with empty allowedRoles", async () => {
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const result = await authorizeProjectRole("proj-1", "user-1", []);

    expect(result.authorized).toBe(false);
    expect(result.errorResponse!.status).toBe(403);
  });
});
