import fs from "fs";
import path from "path";

// Manually load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      // Remove surrounding quotes if any
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  }
  console.log("Loaded environment variables from .env.local");
} else {
  console.log("No .env.local file found, using system environment variables.");
}

import { syncGoogleSheets } from "../src/lib/google-sheets";

async function run() {
  console.log("Starting Google Sheets Sync...");
  try {
    const result = await syncGoogleSheets({ scope: "all" });
    console.log("Sync completed successfully!");
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error("Sync failed:", error.message || error);
    process.exit(1);
  }
}

run();
