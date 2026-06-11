import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadEnvConfig } from "@next/env";
import * as schema from "./schema";

// Load environment variables locally
loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL!;

let client: postgres.Sql;

if (process.env.NODE_ENV === "production") {
  client = postgres(connectionString, { prepare: false });
} else {
  const globalWithPostgres = global as typeof globalThis & {
    postgresClient?: postgres.Sql;
  };
  if (!globalWithPostgres.postgresClient) {
    globalWithPostgres.postgresClient = postgres(connectionString, { prepare: false });
  }
  client = globalWithPostgres.postgresClient;
}

export const db = drizzle(client, { schema });

export const runtime = "nodejs";
