import { neon } from "@neondatabase/serverless";

/** The app's Neon database. Schema: db/schema.sql. */
export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return neon(process.env.DATABASE_URL);
}
