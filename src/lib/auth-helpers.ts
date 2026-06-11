import { db } from "@/db";
import { projectMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function authorizeProjectRole(
  projectId: string,
  userId: string,
  allowedRoles: Array<"admin" | "pm" | "developer" | "qa">
) {
  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);

  if (member.length === 0) {
    return {
      authorized: false,
      errorResponse: NextResponse.json({ error: "Access denied: Not a project member" }, { status: 403 }),
      role: null,
      member: null,
    };
  }

  const role = member[0].role;
  if (!allowedRoles.includes(role as "admin" | "pm" | "developer" | "qa")) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: `Forbidden: Role '${role}' is not authorized for this operation` },
        { status: 403 }
      ),
      role,
      member: member[0],
    };
  }

  return { authorized: true, errorResponse: null, role, member: member[0] };
}
