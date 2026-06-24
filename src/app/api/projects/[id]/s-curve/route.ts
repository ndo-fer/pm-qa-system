import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { projectMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { calculateSCurveGroup } from "@/lib/s-curve";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const { searchParams } = new URL(request.url);
  const developerId = searchParams.get("developerId") || undefined;

  // 1. Verify project membership
  const member = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      )
    )
    .limit(1);

  if (member.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const sCurveGroup = await calculateSCurveGroup(projectId, developerId);
    return NextResponse.json(sCurveGroup);
  } catch (error) {
    console.error("Failed to calculate S-curve group:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
