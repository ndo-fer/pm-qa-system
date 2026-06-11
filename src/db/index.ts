import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadEnvConfig } from "@next/env";
import * as schema from "./schema";

// Load environment variables locally
loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL!;

let client: postgres.Sql;

if (process.env.NODE_ENV === "production") {
  client = postgres(connectionString, { prepare: false, max: 10 });
} else {
  const globalWithPostgres = global as typeof globalThis & {
    postgresClient?: postgres.Sql;
  };
  if (!globalWithPostgres.postgresClient) {
    globalWithPostgres.postgresClient = postgres(connectionString, {
      prepare: false,
      max: 5, // Batasi jumlah koneksi di dev agar tidak memicu circuit breaker
      idle_timeout: 20, // Tutup koneksi idle setelah 20 detik
      connect_timeout: 10 // Batasi waktu tunggu koneksi 10 detik
    });
  }
  client = globalWithPostgres.postgresClient;
}

export const db = drizzle(client, { schema });

export const runtime = "nodejs";
