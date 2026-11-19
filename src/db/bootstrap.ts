import "server-only";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./index";
import { games } from "./schema";
import { CATALOG } from "./catalog";
import { parseGameUrl, urlKey } from "@/lib/url";
import { checkEmbeddable } from "@/lib/embed-check";

export async function runMigrations() {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}

export async function seedCatalog() {
  for (const g of CATALOG) {
    const u = parseGameUrl(g.url);
    if (!u) continue;
    const { forceNewTab, ...entry } = g;
    const embedOverride = forceNewTab ? false : null;
    try {
      await db
        .insert(games)
        .values({ ...entry, url: u.href, urlKey: urlKey(u), inCatalog: true, embedOverride })
        .onConflictDoUpdate({
          target: games.id,
          set: {
            name: g.name,
            url: u.href,
            urlKey: urlKey(u),
            category: g.category,
            description: g.description,
            inCatalog: true,
            // Only set the override from the catalog when it forces new tab,
            // so an admin's manual choice isn't reset on every restart.
            ...(forceNewTab ? { embedOverride } : {}),
          },
        });
    } catch (err) {
      console.warn(`[seed] skipped ${g.id}:`, (err as Error).message);
    }
  }
}

/** Re-check games never checked, or last checked more than 7 days ago. */
export async function refreshEmbedChecks(limit = 50) {
  const stale = await db
    .select({ id: games.id, url: games.url })
    .from(games)
    .where(
      sql`${games.embedCheckedAt} is null or ${games.embedCheckedAt} < now() - interval '7 days'`,
    )
    .limit(limit);
  for (const g of stale) {
    const result = await checkEmbeddable(g.url).catch((e: Error) => ({
      embeddable: false,
      reason: e.message,
    }));
    await db
      .update(games)
      .set({ embeddable: result.embeddable, embedCheckedAt: new Date() })
      .where(eq(games.id, g.id));
  }
  return stale.length;
}

