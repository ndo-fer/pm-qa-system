import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function runSchemaMigration() {
  console.log("Running schema migration...");
  try {
    // 1. Add column if not exists
    console.log("Adding column 'code' to 'projects'...");
    await db.execute(sql`
      ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "code" text;
    `);

    // 2. Set default code for existing project
    console.log("Setting default code 'ERP-PM' for projects with null code...");
    await db.execute(sql`
      UPDATE "projects" SET "code" = 'ERP-PM' WHERE "code" IS NULL;
    `);

    // 3. Make column unique and not null
    console.log("Adding NOT NULL constraint and UNIQUE constraint to 'code' column...");
    await db.execute(sql`
      ALTER TABLE "projects" ALTER COLUMN "code" SET NOT NULL;
    `);
    
    // Add unique constraint (catch if it already exists)
    try {
      await db.execute(sql`
        ALTER TABLE "projects" ADD CONSTRAINT "projects_code_unique" UNIQUE ("code");
      `);
    } catch (e: any) {
      if (e.message && e.message.includes("already exists")) {
        console.log("Unique constraint 'projects_code_unique' already exists.");
      } else {
        throw e;
      }
    }

    // 4. Create project_members table
    console.log("Creating 'project_members' table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "project_members" (
        "id" text PRIMARY KEY,
        "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "role" text NOT NULL,
        "created_at" timestamp DEFAULT now()
      );
    `);

    console.log("Schema migration successful!");
    process.exit(0);
  } catch (error) {
    console.error("Schema migration failed:", error);
    process.exit(1);
  }
}

runSchemaMigration();
