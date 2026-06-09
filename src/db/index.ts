import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadEnvConfig } from "@next/env";
import * as schema from "./schema";

// Load environment variables locally
loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

export const runtime = "nodejs";
