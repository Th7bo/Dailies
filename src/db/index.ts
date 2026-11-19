import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pg?: ReturnType<typeof postgres>;
};

// postgres() is lazy: no connection is opened until the first query,
// so importing this during `next build` is safe without a database.
const client =
  globalForDb.pg ??
  postgres(process.env.DATABASE_URL ?? "postgres://localhost:5432/dailies", {
    max: 10,
  });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };
