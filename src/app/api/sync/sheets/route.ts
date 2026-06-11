import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { syncGoogleSheets, SyncScope } from "@/lib/google-sheets";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const scope: SyncScope = body.scope || "all";
    const result = await syncGoogleSheets({ scope });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Google Sheets Sync Error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to synchronize with Google Sheets" },
      { status: 500 }
    );
  }
}
