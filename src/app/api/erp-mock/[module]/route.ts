import { NextResponse } from "next/server";
import { mockErpData } from "@/lib/mock-erp-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ module: string }> }
) {
  const { module: moduleName } = await params;
  
  // Simulate network latency (200ms) if not disabled in local dev environment
  if (process.env.DISABLE_MOCK_DELAY !== "true") {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const data = mockErpData[moduleName];

  if (!data) {
    return NextResponse.json(
      { error: `Table '${moduleName}' was not found on this instance.` },
      { status: 404 }
    );
  }

  // Handle MasProduk specific parameter rules (mirroring staging)
  if (moduleName === "MasProduk") {
    const { searchParams } = new URL(request.url);
    const jenisBaku = searchParams.get("jenisBaku");

    if (!jenisBaku) {
      return NextResponse.json(
        { error: "Bad Request: The query parameter 'jenisBaku' is mandatory." },
        { status: 400 }
      );
    }

    const uppercaseJenis = jenisBaku.toUpperCase();
    if (!["BAKU", "JADI", "LAIN"].includes(uppercaseJenis)) {
      return NextResponse.json(
        { error: `Bad Request: Invalid value '${jenisBaku}' for parameter 'jenisBaku'. Valid options are: BAKU, JADI, LAIN.` },
        { status: 400 }
      );
    }

    const filtered = data.filter(
      (item) => item.jenisBaku.toUpperCase() === uppercaseJenis
    );
    return NextResponse.json(filtered);
  }

  return NextResponse.json(data);
}
