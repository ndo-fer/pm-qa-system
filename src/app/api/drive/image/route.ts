import { NextResponse, NextRequest } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

async function getDriveClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !rawPrivateKey) throw new Error("Google credentials not set.");

  const cleanKey = rawPrivateKey.startsWith('"') && rawPrivateKey.endsWith('"')
    ? rawPrivateKey.slice(1, -1)
    : rawPrivateKey;
  const privateKey = cleanKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  await auth.authorize();

  return google.drive({ version: "v3", auth });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("fileId");


    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId parameter" }, { status: 400 });
    }

    const drive = await getDriveClient();

    // Fetch file metadata to get mimeType
    const metadata = await drive.files.get({
      fileId,
      fields: "name, mimeType",
    });

    const mimeType = metadata.data.mimeType || "image/png";

    // Fetch file content as a stream
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    const nodeStream = response.data as Readable;
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[Drive Image Proxy Error]:", (err as Error).message || err);
    return NextResponse.json({ error: (err as Error).message || String(err) }, { status: 500 });
  }
}
