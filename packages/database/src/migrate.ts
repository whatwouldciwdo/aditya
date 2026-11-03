import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL wajib diisi");

const client = postgres(databaseUrl, { max: 1 });
try {
  const migrationsFolder = fileURLToPath(
    new URL("../drizzle", import.meta.url),
  );
  await migrate(drizzle(client), { migrationsFolder });
  console.log("Database migration selesai.");
} finally {
  await client.end();
}
