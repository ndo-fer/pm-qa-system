import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { authorizeProjectRole } from "@/lib/auth-helpers";

/**
 * ERP test credentials are stored server-side and only returned to
 * authenticated users with admin, pm, or qa roles.
 *
 * These credentials MUST NOT be present in any client-side component.
 * Rotate immediately if the staging server is internet-accessible.
 */
const ERP_CREDENTIALS: Record<string, unknown> = {
  administrator: {
    type: "single",
    username: process.env.ERP_CRED_ADMIN_USER || "PDJService",
    password: process.env.ERP_CRED_ADMIN_PASS || "pdj123",
    role: "administrator",
  },
  top_user: {
    type: "single",
    username: process.env.ERP_CRED_TOPUSER_USER || "K009",
    password: process.env.ERP_CRED_TOPUSER_PASS || "123456",
    role: "top_user",
  },
  user: {
    type: "single",
    username: process.env.ERP_CRED_USER_USER || "K010",
    password: process.env.ERP_CRED_USER_PASS || "12345",
    role: "user",
  },
  matrix: {
    type: "matrix",
    scenarios: [
      { role: "administrator", username: process.env.ERP_CRED_ADMIN_USER || "PDJService", password: process.env.ERP_CRED_ADMIN_PASS || "pdj123" },
      { role: "top_user",     username: process.env.ERP_CRED_TOPUSER_USER || "K009",       password: process.env.ERP_CRED_TOPUSER_PASS || "123456" },
      { role: "user",         username: process.env.ERP_CRED_USER_USER || "K010",           password: process.env.ERP_CRED_USER_PASS || "12345" },
    ],
  },
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admin, pm, and qa roles may view test credentials
  const auth = await authorizeProjectRole(session.user.projectId, session.user.id, ["admin", "pm", "qa"]);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || "matrix";

  const validRoles = ["administrator", "top_user", "user", "matrix"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role parameter" }, { status: 400 });
  }

  const credentials = ERP_CREDENTIALS[role] ?? ERP_CREDENTIALS.matrix;
  return NextResponse.json(credentials);
}
