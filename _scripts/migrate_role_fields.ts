import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "erp_pm.db");
const sqlite = new Database(dbPath);

async function migrate() {
  console.log("Running migration: Add ERP role fields...");

  try {
    // Add erpRole to tasks
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN erp_role TEXT DEFAULT 'all_roles';`);
    console.log("✓ Added erp_role to tasks table");

    // Add roleSpecificFeatures to tasks
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN role_specific_features TEXT;`);
    console.log("✓ Added role_specific_features to tasks table");

    // Add erpRole to test_cases
    sqlite.exec(`ALTER TABLE test_cases ADD COLUMN erp_role TEXT;`);
    console.log("✓ Added erp_role to test_cases table");

    // Add testType to test_cases
    sqlite.exec(`ALTER TABLE test_cases ADD COLUMN test_type TEXT DEFAULT 'functional';`);
    console.log("✓ Added test_type to test_cases table");

    // Add loginCredentials to test_cases
    sqlite.exec(`ALTER TABLE test_cases ADD COLUMN login_credentials TEXT;`);
    console.log("✓ Added login_credentials to test_cases table");

    sqlite.close();
    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    sqlite.close();
    process.exit(1);
  }
}

migrate();
