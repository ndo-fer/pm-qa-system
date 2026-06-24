import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { z } from "zod";

const resetRequestSchema = z.object({
  email: z.string().email("Email tidak valid"),
  projectCode: z.string().min(1, "Kode proyek wajib diisi"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Always return the same message to avoid email enumeration
    const successMessage =
      "Jika email terdaftar, link reset password telah dikirim. Silakan cek console server.";

    // Look up user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      // Still return success to avoid leaking which emails exist
      return NextResponse.json({ message: successMessage });
    }

    // Delete any existing reset tokens for this user
    await db
      .delete(passwordResets)
      .where(eq(passwordResets.userId, user[0].id));

    // Generate secure random token
    const token = randomBytes(32).toString("hex");

    // Expiry: 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Store the reset token
    await db.insert(passwordResets).values({
      id: randomUUID(),
      userId: user[0].id,
      token,
      expiresAt,
    });

    // Log the reset link to console (email sending can be added later)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    console.log("=".repeat(60));
    console.log("PASSWORD RESET LINK:");
    console.log(resetLink);
    console.log(`User: ${user[0].name} (${user[0].email})`);
    console.log("=".repeat(60));

    return NextResponse.json({ message: successMessage });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
