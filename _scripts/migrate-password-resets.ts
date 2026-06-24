import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function runPasswordResetsMigration() {
  console.log("Running password_resets table migration...");
  try {
    // Create password_resets table
    console.log("Creating 'password_resets' table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "password_resets" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" text NOT NULL UNIQUE,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now()
      );
    `);

    // Create index on token for faster lookups
    console.log("Creating index on token column...");
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS "password_resets_token_idx" ON "password_resets" ("token");
      `);
    } catch (e: unknown) {
      console.log("Index 'password_resets_token_idx' already exists or failed to create. Skipping.");
    }

    // Create index on user_id for faster cleanup
    console.log("Creating index on user_id column...");
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS "password_resets_user_id_idx" ON "password_resets" ("user_id");
      `);
    } catch (e: unknown) {
      console.log("Index 'password_resets_user_id_idx' already exists or failed to create. Skipping.");
    }

    console.log("Password resets migration successful!");
    process.exit(0);
  } catch (error) {
    console.error("Password resets migration failed:", error);
    process.exit(1);
  }
}

runPasswordResetsMigration();
