import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/auth-helpers", () => ({
  authorizeProjectRole: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: { select: vi.fn() },
}));

vi.mock("@/db/schema", () => ({
  users: {},
  projects: {},
  projectMembers: {},
}));

import { getServerSession } from "next-auth";
import { authorizeProjectRole } from "@/lib/auth-helpers";

// Dynamically import the route handler after mocks are in place
async function loadRoute() {
  return await import("@/app/api/qa/credentials/route");
}

function createRequest(url = "http://localhost/api/qa/credentials") {
  return new Request(url);
}

describe("QA Credentials API", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up required env vars by default
    process.env.ERP_CRED_ADMIN_USER = "admin_user";
    process.env.ERP_CRED_ADMIN_PASS = "admin_pass";
    process.env.ERP_CRED_TOPUSER_USER = "top_user";
    process.env.ERP_CRED_TOPUSER_PASS = "top_pass";
    process.env.ERP_CRED_USER_USER = "reg_user";
    process.env.ERP_CRED_USER_PASS = "reg_pass";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should return 401 when session is missing", async () => {
    (getServerSession as any).mockResolvedValue(null);
    const route = await loadRoute();
    const response = await route.GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("should return 403 when user role is not authorized", async () => {
    (getServerSession as any).mockResolvedValue({
      user: { id: "user-1", projectId: "proj-1", role: "developer" },
    });
    (authorizeProjectRole as any).mockResolvedValue({
      authorized: false,
      errorResponse: new Response(
        JSON.stringify({ error: "Forbidden: Role 'developer' is not authorized" }),
        { status: 403 }
      ),
    });

    const route = await loadRoute();
    const response = await route.GET(createRequest());

    expect(response.status).toBe(403);
  });

  it("should return 400 for invalid role parameter", async () => {
    (getServerSession as any).mockResolvedValue({
      user: { id: "user-1", projectId: "proj-1", role: "admin" },
    });
    (authorizeProjectRole as any).mockResolvedValue({
      authorized: true,
      errorResponse: null,
      role: "admin",
      member: { id: "mem-1" },
    });

    const route = await loadRoute();
    const response = await route.GET(
      createRequest("http://localhost/api/qa/credentials?role=invalid_role")
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid role/i);
  });

  it("should return 503 when env vars are missing", async () => {
    // Remove required env vars
    delete process.env.ERP_CRED_ADMIN_USER;
    delete process.env.ERP_CRED_ADMIN_PASS;

    (getServerSession as any).mockResolvedValue({
      user: { id: "user-1", projectId: "proj-1", role: "admin" },
    });
    (authorizeProjectRole as any).mockResolvedValue({
      authorized: true,
      errorResponse: null,
      role: "admin",
      member: { id: "mem-1" },
    });

    const route = await loadRoute();
    const response = await route.GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatch(/not configured/i);
  });

  it("should return matrix credentials by default", async () => {
    (getServerSession as any).mockResolvedValue({
      user: { id: "user-1", projectId: "proj-1", role: "qa" },
    });
    (authorizeProjectRole as any).mockResolvedValue({
      authorized: true,
      errorResponse: null,
      role: "qa",
      member: { id: "mem-1" },
    });

    const route = await loadRoute();
    const response = await route.GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.type).toBe("matrix");
    expect(body.scenarios).toBeDefined();
    expect(body.scenarios).toHaveLength(3);
  });

  it("should return specific role credentials when role param is valid", async () => {
    (getServerSession as any).mockResolvedValue({
      user: { id: "user-1", projectId: "proj-1", role: "pm" },
    });
    (authorizeProjectRole as any).mockResolvedValue({
      authorized: true,
      errorResponse: null,
      role: "pm",
      member: { id: "mem-1" },
    });

    const route = await loadRoute();
    const response = await route.GET(
      createRequest("http://localhost/api/qa/credentials?role=administrator")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.type).toBe("single");
    expect(body.role).toBe("administrator");
    expect(body.username).toBe("admin_user");
    expect(body.password).toBe("admin_pass");
  });
});
