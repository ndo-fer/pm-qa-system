import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getWhatsAppStatus } from "@/lib/wa";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const statusData = await getWhatsAppStatus();
    return NextResponse.json(statusData);
  } catch (error) {
    console.error("Failed to fetch WhatsApp gateway status:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
