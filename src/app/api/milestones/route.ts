import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { db } from "@/db";
import { milestones } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allMilestones = await db.select().from(milestones).orderBy(asc(milestones.startDate));
  return NextResponse.json(allMilestones);
}
