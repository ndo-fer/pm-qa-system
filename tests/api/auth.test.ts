import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module before importing auth
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

// We need to mock the tables so drizzle eq/and work without a real DB
vi.mock("@/db/schema", () => ({
  users: { id: "users.id", email: "users.email" },
  projects: { id: "projects.id", code: "projects.code" },
  projectMembers: {
    id: "project_members.id",
    projectId: "project_members.project_id",
    userId: "project_members.user_id",
    role: "project_members.role",
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

import { db } from "@/db";
import bcrypt from "bcryptjs";

/**
 * The authOptions.authorize function is not directly exported,
 * but we can extract it from the provider configuration.
 * We test the authorization logic by invoking it directly.
 */
async function getAuthorizeFunction() {
  // Import after mocks are set up
  const { authOptions } = await import("@/auth");
  const provider = authOptions.providers[0] as any;
  // CredentialsProvider stores authorize in options
  return provider.options?.authorize ?? provider.authorize;
}

describe("Auth Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw when email is missing", async () => {
    const authorize = await getAuthorizeFunction();
    await expect(
      authorize({ email: "", password: "pass", projectCode: "PRJ" })
    ).rejects.toThrow(/wajib diisi/i);
  });

  it("should throw when password is missing", async () => {
    const authorize = await getAuthorizeFunction();
    await expect(
      authorize({ email: "test@test.com", password: "", projectCode: "PRJ" })
    ).rejects.toThrow(/wajib diisi/i);
  });

  it("should throw when projectCode is missing", async () => {
    const authorize = await getAuthorizeFunction();
    await expect(
      authorize({ email: "test@test.com", password: "pass", projectCode: "" })
    ).rejects.toThrow(/wajib diisi/i);
  });

  it("should throw when credentials object is undefined", async () => {
    const authorize = await getAuthorizeFunction();
    await expect(authorize(undefined)).rejects.toThrow(/wajib diisi/i);
  });

  it("should throw when project code is invalid", async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    (db.select as any).mockImplementation(mockSelect);

    const authorize = await getAuthorizeFunction();
    await expect(
      authorize({ email: "test@test.com", password: "pass", projectCode: "INVALID" })
    ).rejects.toThrow(/kode proyek tidak valid/i);
  });

  it("should throw when email is not found", async () => {
    // First call: project lookup succeeds; second call: user lookup fails
    let callCount = 0;
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([{ id: "proj-1", code: "PRJ" }]);
          }
          return Promise.resolve([]); // user not found
        }),
      }),
    });
    (db.select as any).mockReturnValue({ from: mockFrom });

    const authorize = await getAuthorizeFunction();
    await expect(
      authorize({ email: "nobody@test.com", password: "pass", projectCode: "PRJ" })
    ).rejects.toThrow(/email atau password salah/i);
  });

  it("should throw when password is incorrect", async () => {
    let callCount = 0;
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([{ id: "proj-1", code: "PRJ" }]);
          }
          return Promise.resolve([
            { id: "user-1", email: "test@test.com", passwordHash: "hashed", name: "Test" },
          ]);
        }),
      }),
    });
    (db.select as any).mockReturnValue({ from: mockFrom });
    (bcrypt.compare as any).mockResolvedValue(false);

    const authorize = await getAuthorizeFunction();
    await expect(
      authorize({ email: "test@test.com", password: "wrong", projectCode: "PRJ" })
    ).rejects.toThrow(/email atau password salah/i);
  });

  it("should throw when user is not a project member", async () => {
    let callCount = 0;
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([{ id: "proj-1", code: "PRJ" }]);
          }
          if (callCount === 2) {
            return Promise.resolve([
              { id: "user-1", email: "test@test.com", passwordHash: "hashed", name: "Test" },
            ]);
          }
          return Promise.resolve([]); // not a member
        }),
      }),
    });
    (db.select as any).mockReturnValue({ from: mockFrom });
    (bcrypt.compare as any).mockResolvedValue(true);

    const authorize = await getAuthorizeFunction();
    await expect(
      authorize({ email: "test@test.com", password: "pass", projectCode: "PRJ" })
    ).rejects.toThrow(/tidak terdaftar/i);
  });
});
