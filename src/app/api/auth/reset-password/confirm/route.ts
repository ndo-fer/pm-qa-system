import { NextResponse } from "next/server";
import { eq, and, lt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { z } from "zod";

const confirmResetSchema = z.object({
  token: z.string().min(1, "Token wajib diisi"),
  newPassword: z.string().min(8, "Password minimal 8 karakter"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = confirmResetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token, newPassword } = parsed.data;

    // Find the reset token
    const resetRecord = await db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.token, token))
      .limit(1);

    if (resetRecord.length === 0) {
      return NextResponse.json(
        { error: "Token tidak valid atau sudah digunakan" },
        { status: 400 }
      );
    }

    const record = resetRecord[0];

    // Check if token has expired
    const expiresAt = new Date(record.expiresAt);
    if (expiresAt < new Date()) {
      // Delete expired token
      await db
        .delete(passwordResets)
        .where(eq(passwordResets.id, record.id));
      return NextResponse.json(
        { error: "Token sudah kadaluarsa. Silakan minta reset password baru." },
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, record.userId));

    // Delete the used token
    await db
      .delete(passwordResets)
      .where(eq(passwordResets.id, record.id));

    return NextResponse.json({
      message: "Password berhasil diubah. Silakan login dengan password baru.",
    });
  } catch (error) {
    console.error("Reset password confirm error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
