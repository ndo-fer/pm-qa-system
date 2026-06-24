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

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[QA CREDENTIALS] Environment variable ${key} is not set. ` +
      `Add it to .env.local — never hardcode credentials.`
    );
  }
  return value;
}

function buildCredentials() {
  const adminUser = getEnvOrThrow("ERP_CRED_ADMIN_USER");
  const adminPass = getEnvOrThrow("ERP_CRED_ADMIN_PASS");
  const topUser = getEnvOrThrow("ERP_CRED_TOPUSER_USER");
  const topPass = getEnvOrThrow("ERP_CRED_TOPUSER_PASS");
  const userUser = getEnvOrThrow("ERP_CRED_USER_USER");
  const userPass = getEnvOrThrow("ERP_CRED_USER_PASS");

  return {
    administrator: {
      type: "single" as const,
      username: adminUser,
      password: adminPass,
      role: "administrator",
    },
    top_user: {
      type: "single" as const,
      username: topUser,
      password: topPass,
      role: "top_user",
    },
    user: {
      type: "single" as const,
      username: userUser,
      password: userPass,
      role: "user",
    },
    matrix: {
      type: "matrix" as const,
      scenarios: [
        { role: "administrator", username: adminUser, password: adminPass },
        { role: "top_user", username: topUser, password: topPass },
        { role: "user", username: userUser, password: userPass },
      ],
    },
  };
}

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

  try {
    const credentials = buildCredentials();
    const result = credentials[role as keyof typeof credentials] ?? credentials.matrix;
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "ERP credentials not configured on server. Check .env.local." },
      { status: 503 }
    );
  }
}
