"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/db";
import { completions, follows, gamePrefs, games, playlistItems, playlists } from "@/db/schema";
import { CATEGORIES } from "@/db/catalog";
import { dayKey, isDayKey, shiftDay } from "./day";
import { parseGameUrl, urlKey } from "./url";
import { checkEmbeddable } from "./embed-check";
import type { GameLite } from "./data";

const newId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 10);
const MAX_GAMES = 60;
const MAX_PLAYLISTS = 50;

async function viewer() {
  const s = await auth();
  if (!s?.user?.id) throw new Error("Sign in to do that.");
  return s.user;
}

async function ownedPlaylist(id: string, userId: string) {
  const [p] = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(eq(playlists.id, id), eq(playlists.ownerId, userId)));
  if (!p) throw new Error("That list doesn't exist or isn't yours.");
  return p;
}

/** Accept the client's local day only if it's within a day of server UTC. */
function checkDay(day: string) {
  if (!isDayKey(day)) throw new Error("Invalid day.");
  const utc = dayKey("UTC");
  if (day !== utc && day !== shiftDay(utc, 1) && day !== shiftDay(utc, -1)) {
    throw new Error("Day is out of range.");
  }
}

/* ---------- auth ---------- */

export async function signInWithDiscord(formData: FormData) {
  const next = String(formData.get("next") ?? "/");
  await signIn("discord", { redirectTo: next.startsWith("/") && !next.startsWith("//") ? next : "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/* ---------- playlists ---------- */

const playlistMeta = z.object({
  title: z.string().trim().min(1, "Give the list a name.").max(60),
  description: z.string().trim().max(280).optional().transform((v) => v || null),
  isPublic: z.boolean(),
});

export async function createPlaylist(input: { title: string; gameIds?: string[] }) {
  const user = await viewer();
  const title = z.string().trim().min(1).max(60).parse(input.title);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(playlists)
    .where(eq(playlists.ownerId, user.id));
  if (n >= MAX_PLAYLISTS) throw new Error(`You can have up to ${MAX_PLAYLISTS} lists.`);
  const id = newId();
  await db.insert(playlists).values({ id, ownerId: user.id, title });
  if (input.gameIds?.length) await writeItems(id, input.gameIds, user.id);
  revalidatePath("/");
  return id;
}

export async function createPlaylistAndEdit(formData: FormData) {
  const id = await createPlaylist({ title: String(formData.get("title") || "My dailies") });
  redirect(`/p/${id}/edit`);
}

export async function updatePlaylistMeta(id: string, input: z.input<typeof playlistMeta>) {
  const user = await viewer();
  await ownedPlaylist(id, user.id);
  const data = playlistMeta.parse(input);
  await db.update(playlists).set({ ...data, updatedAt: new Date() }).where(eq(playlists.id, id));
  revalidatePath(`/p/${id}`);
  revalidatePath("/");
}

async function writeItems(playlistId: string, gameIds: string[], userId: string) {
  const unique = [...new Set(gameIds)].slice(0, MAX_GAMES);
  if (unique.length) {
    // Only allow catalog games or games this user created.
    const allowed = await db
      .select({ id: games.id })
      .from(games)
      .where(
        and(
          inArray(games.id, unique),
          sql`(${games.inCatalog} or ${games.createdById} = ${userId} or exists (
            select 1 from ${playlistItems} pi where pi.game_id = ${games.id} and pi.playlist_id = ${playlistId}))`,
        ),
      );
    const ok = new Set(allowed.map((a) => a.id));
    const ordered = unique.filter((g) => ok.has(g));
    await db.transaction(async (tx) => {
      await tx.delete(playlistItems).where(eq(playlistItems.playlistId, playlistId));
      if (ordered.length) {
        await tx.insert(playlistItems).values(ordered.map((gameId, position) => ({ playlistId, gameId, position })));
      }
    });
  } else {
    await db.delete(playlistItems).where(eq(playlistItems.playlistId, playlistId));
  }
}

export async function setPlaylistGames(id: string, gameIds: string[]) {
  const user = await viewer();
  await ownedPlaylist(id, user.id);
  await writeItems(id, z.array(z.string().max(40)).max(200).parse(gameIds), user.id);
  await db.update(playlists).set({ updatedAt: new Date() }).where(eq(playlists.id, id));
  revalidatePath(`/p/${id}`);
  revalidatePath("/");
}

export async function deletePlaylist(id: string) {
  const user = await viewer();
  await ownedPlaylist(id, user.id);
  await db.delete(playlists).where(eq(playlists.id, id));
  revalidatePath("/");
  redirect("/");
}

export async function forkPlaylist(id: string) {
  const user = await viewer();
  const [src] = await db.select().from(playlists).where(eq(playlists.id, id));
  if (!src || (!src.isPublic && src.ownerId !== user.id)) throw new Error("That list isn't available.");
  const items = await db
    .select({ gameId: playlistItems.gameId })
    .from(playlistItems)
    .where(eq(playlistItems.playlistId, id))
    .orderBy(playlistItems.position);
  const newIdValue = newId();
  await db.transaction(async (tx) => {
    await tx.insert(playlists).values({
      id: newIdValue,
      ownerId: user.id,
      title: src.ownerId === user.id ? `${src.title} (copy)` : src.title,
      description: src.description,
      forkedFromId: src.id,
    });
    if (items.length) {
      await tx.insert(playlistItems).values(items.map((it, position) => ({ playlistId: newIdValue, gameId: it.gameId, position })));
    }
  });
  revalidatePath("/");
  redirect(`/p/${newIdValue}/edit`);
}

export async function toggleFollow(id: string) {
  const user = await viewer();
  const [p] = await db.select({ ownerId: playlists.ownerId, isPublic: playlists.isPublic }).from(playlists).where(eq(playlists.id, id));
  if (!p || !p.isPublic) throw new Error("Only public lists can be followed.");
  if (p.ownerId === user.id) throw new Error("You can't follow your own list.");
  const existing = await db
    .delete(follows)
    .where(and(eq(follows.userId, user.id), eq(follows.playlistId, id)))
    .returning();
  if (existing.length === 0) await db.insert(follows).values({ userId: user.id, playlistId: id });
  revalidatePath(`/p/${id}`);
  revalidatePath("/");
  return existing.length === 0;
}

/* ---------- games ---------- */

const customGame = z.object({
  name: z.string().trim().min(1, "Name the game.").max(50),
  url: z.string().trim().min(1, "Paste the game's link.").max(500),
  category: z.enum(Object.keys(CATEGORIES) as [keyof typeof CATEGORIES]).default("other"),
});

export type AddGameResult = { ok: true; game: GameLite } | { ok: false; error: string };

function toLite(g: typeof games.$inferSelect): GameLite {
  return {
    id: g.id,
    name: g.name,
    url: g.url,
    category: g.category,
    description: g.description,
    embeddable: g.embedOverride ?? g.embeddable,
    embedOverride: g.embedOverride,
    inCatalog: g.inCatalog,
  };
}

export async function addCustomGame(input: z.input<typeof customGame>): Promise<AddGameResult> {
  const user = await viewer();
  const parsed = customGame.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const u = parseGameUrl(parsed.data.url);
  if (!u) return { ok: false, error: "That doesn't look like a web link." };
  const key = urlKey(u);

  const [existing] = await db.select().from(games).where(eq(games.urlKey, key));
  // Already known (catalog or someone's custom game): reuse it.
  if (existing) return { ok: true, game: toLite(existing) };

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(games)
    .where(eq(games.createdById, user.id));
  if (n >= 100) return { ok: false, error: "You've added the maximum of 100 custom games." };

  const check = await checkEmbeddable(u.href).catch(() => null);
  const [game] = await db
    .insert(games)
    .values({
      id: newId(),
      name: parsed.data.name,
      url: u.href,
      urlKey: key,
      category: parsed.data.category,
      createdById: user.id,
      embeddable: check?.embeddable ?? null,
      embedCheckedAt: check ? new Date() : null,
    })
    .returning();
  revalidatePath("/games");
  return { ok: true, game: toLite(game) };
}

async function admin() {
  const user = await viewer();
  if (!user.isAdmin) throw new Error("Admins only.");
  return user;
}

export async function setInCatalog(gameId: string, inCatalog: boolean) {
  await admin();
  await db.update(games).set({ inCatalog }).where(eq(games.id, gameId));
  revalidatePath("/games");
}

/** null = automatic, false = always new tab, true = always embed */
export async function setEmbedOverride(gameId: string, value: boolean | null) {
  await admin();
  await db.update(games).set({ embedOverride: value }).where(eq(games.id, gameId));
  revalidatePath("/games");
}

export async function setNewTabPref(gameId: string, newTab: boolean) {
  const user = await viewer();
  if (newTab) {
    await db
      .insert(gamePrefs)
      .values({ userId: user.id, gameId, newTab: true })
      .onConflictDoUpdate({ target: [gamePrefs.userId, gamePrefs.gameId], set: { newTab: true } });
  } else {
    await db.delete(gamePrefs).where(and(eq(gamePrefs.userId, user.id), eq(gamePrefs.gameId, gameId)));
  }
}

export async function recheckEmbed(gameId: string) {
  await admin();
  const [g] = await db.select({ url: games.url }).from(games).where(eq(games.id, gameId));
  if (!g) return;
  const r = await checkEmbeddable(g.url).catch(() => ({ embeddable: false }));
  await db.update(games).set({ embeddable: r.embeddable, embedCheckedAt: new Date() }).where(eq(games.id, gameId));
  revalidatePath("/games");
}

/* ---------- daily progress ---------- */

export async function markDone(gameId: string, day: string, shareText?: string | null) {
  const user = await viewer();
  checkDay(day);
  const text = shareText ? z.string().max(2000).parse(shareText).trim() || null : null;
  await db
    .insert(completions)
    .values({ userId: user.id, gameId, day, shareText: text })
    .onConflictDoUpdate({
      target: [completions.userId, completions.gameId, completions.day],
      set: text ? { shareText: text } : { completedAt: sql`${completions.completedAt}` },
    });
}

export async function unmarkDone(gameId: string, day: string) {
  const user = await viewer();
  checkDay(day);
  await db
    .delete(completions)
    .where(and(eq(completions.userId, user.id), eq(completions.gameId, gameId), eq(completions.day, day)));
}

export async function createStarterPlaylist() {
  const id = await createPlaylist({
    title: "My dailies",
    gameIds: ["wordle", "connections", "strands", "nyt-mini", "worldle", "framed", "costcodle"],
  });
  redirect(`/p/${id}/edit`);
}
