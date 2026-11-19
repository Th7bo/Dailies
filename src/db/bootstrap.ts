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
    const description = entry.description || null;
    const embedOverride = forceNewTab ? false : null;
    try {
      await db
        .insert(games)
        .values({ ...entry, description, url: u.href, urlKey: urlKey(u), inCatalog: true, embedOverride })
        .onConflictDoUpdate({
          target: games.id,
          set: {
            name: g.name,
            url: u.href,
            urlKey: urlKey(u),
            category: g.category,
            description,
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
export async function refreshEmbedChecks(limit = 1000, concurrency = 8) {
  const stale = await db
    .select({ id: games.id, url: games.url })
    .from(games)
    .where(
      sql`${games.embedCheckedAt} is null or ${games.embedCheckedAt} < now() - interval '7 days'`,
    )
    .limit(limit);
  const queue = [...stale];
  const worker = async () => {
    for (let g = queue.shift(); g; g = queue.shift()) {
      const result = await checkEmbeddable(g.url).catch(() => null);
      // On a network error, leave `embeddable` as it was (unknown games still try the iframe)
      // and just stamp the time so we don't hammer the site; it's retried next week.
      await db
        .update(games)
        .set(result ? { embeddable: result.embeddable, embedCheckedAt: new Date() } : { embedCheckedAt: new Date() })
        .where(eq(games.id, g.id));
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return stale.length;
}

