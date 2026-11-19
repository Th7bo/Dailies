import "server-only";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { completions, follows, gamePrefs, games, playlistItems, playlists, users } from "@/db/schema";
import { currentStreak, shiftDay } from "./day";

export async function getViewer() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireViewer(next = "/") {
  const user = await getViewer();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  return user;
}

export type GameLite = {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string | null;
  embeddable: boolean | null;
  /** Admin override, shown in admin tools only */
  embedOverride: boolean | null;
  inCatalog: boolean;
};

const gameCols = {
  id: games.id,
  name: games.name,
  url: games.url,
  category: games.category,
  description: games.description,
  // Effective value: the admin override wins over the header check.
  embeddable: sql<boolean | null>`coalesce(${games.embedOverride}, ${games.embeddable})`,
  embedOverride: games.embedOverride,
  inCatalog: games.inCatalog,
};

const followerCount = sql<number>`(select count(*)::int from ${follows} where ${follows.playlistId} = ${playlists.id})`;
const itemCount = sql<number>`(select count(*)::int from ${playlistItems} where ${playlistItems.playlistId} = ${playlists.id})`;

export type PlaylistCard = {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  ownerId: string;
  ownerName: string | null;
  ownerImage: string | null;
  followers: number;
  count: number;
  games: GameLite[];
};

async function attachGames<T extends { id: string }>(rows: T[]): Promise<(T & { games: GameLite[] })[]> {
  if (rows.length === 0) return [];
  const items = await db
    .select({ playlistId: playlistItems.playlistId, ...gameCols })
    .from(playlistItems)
    .innerJoin(games, eq(games.id, playlistItems.gameId))
    .where(inArray(playlistItems.playlistId, rows.map((r) => r.id)))
    .orderBy(asc(playlistItems.position));
  const by = new Map<string, GameLite[]>();
  for (const { playlistId, ...g } of items) {
    if (!by.has(playlistId)) by.set(playlistId, []);
    by.get(playlistId)!.push(g);
  }
  return rows.map((r) => ({ ...r, games: by.get(r.id) ?? [] }));
}

const cardCols = {
  id: playlists.id,
  title: playlists.title,
  description: playlists.description,
  isPublic: playlists.isPublic,
  ownerId: playlists.ownerId,
  ownerName: users.name,
  ownerImage: users.image,
  followers: followerCount,
  count: itemCount,
};

export async function getOwnPlaylists(userId: string): Promise<PlaylistCard[]> {
  const rows = await db
    .select(cardCols)
    .from(playlists)
    .innerJoin(users, eq(users.id, playlists.ownerId))
    .where(eq(playlists.ownerId, userId))
    .orderBy(desc(playlists.updatedAt));
  return attachGames(rows);
}

export async function getFollowedPlaylists(userId: string): Promise<PlaylistCard[]> {
  const rows = await db
    .select(cardCols)
    .from(follows)
    .innerJoin(playlists, eq(playlists.id, follows.playlistId))
    .innerJoin(users, eq(users.id, playlists.ownerId))
    .where(and(eq(follows.userId, userId), eq(playlists.isPublic, true)))
    .orderBy(desc(follows.createdAt));
  return attachGames(rows);
}

export async function getPublicPlaylists(q?: string): Promise<PlaylistCard[]> {
  const search = q?.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const rows = await db
    .select(cardCols)
    .from(playlists)
    .innerJoin(users, eq(users.id, playlists.ownerId))
    .where(
      and(
        eq(playlists.isPublic, true),
        search
          ? or(ilike(playlists.title, `%${search}%`), ilike(playlists.description, `%${search}%`))
          : undefined,
      ),
    )
    .orderBy(desc(followerCount), desc(playlists.updatedAt))
    .limit(60);
  return attachGames(rows);
}

export type PlaylistDetail = PlaylistCard & {
  forkedFromId: string | null;
  forkedFromTitle: string | null;
  isOwner: boolean;
  isFollowing: boolean;
};

/** Returns null if missing or private and not owned by the viewer. */
export async function getPlaylist(id: string, viewerId?: string): Promise<PlaylistDetail | null> {
  const [row] = await db
    .select({
      ...cardCols,
      forkedFromId: playlists.forkedFromId,
      forkedFromTitle: sql<string | null>`(select p2.title from ${playlists} p2 where p2.id = ${playlists.forkedFromId} and p2.is_public)`,
    })
    .from(playlists)
    .innerJoin(users, eq(users.id, playlists.ownerId))
    .where(eq(playlists.id, id));
  if (!row) return null;
  const isOwner = row.ownerId === viewerId;
  if (!row.isPublic && !isOwner) return null;
  const [withGames] = await attachGames([row]);
  let isFollowing = false;
  if (viewerId && !isOwner) {
    const f = await db
      .select({ x: sql`1` })
      .from(follows)
      .where(and(eq(follows.userId, viewerId), eq(follows.playlistId, id)));
    isFollowing = f.length > 0;
  }
  return { ...withGames, isOwner, isFollowing };
}

/** Catalog games plus custom games the viewer created. */
export async function getGameLibrary(viewerId?: string): Promise<GameLite[]> {
  return db
    .select(gameCols)
    .from(games)
    .where(viewerId ? or(eq(games.inCatalog, true), eq(games.createdById, viewerId)) : eq(games.inCatalog, true))
    .orderBy(asc(games.name));
}

export async function getAllCustomGames() {
  return db
    .select({ ...gameCols, createdBy: users.name, usage: sql<number>`(select count(*)::int from ${playlistItems} where ${playlistItems.gameId} = ${games.id})` })
    .from(games)
    .leftJoin(users, eq(users.id, games.createdById))
    .where(eq(games.inCatalog, false))
    .orderBy(desc(games.createdAt))
    .limit(200);
}

/** Game ids this user chose to always open in a new tab. */
export async function getNewTabPrefs(userId: string, gameIds: string[]): Promise<string[]> {
  if (gameIds.length === 0) return [];
  const rows = await db
    .select({ gameId: gamePrefs.gameId })
    .from(gamePrefs)
    .where(and(eq(gamePrefs.userId, userId), eq(gamePrefs.newTab, true), inArray(gamePrefs.gameId, gameIds)));
  return rows.map((r) => r.gameId);
}

export type DayState = Record<string, { shareText: string | null }>;

export async function getDayState(userId: string, gameIds: string[], day: string): Promise<DayState> {
  if (gameIds.length === 0) return {};
  const rows = await db
    .select({ gameId: completions.gameId, shareText: completions.shareText })
    .from(completions)
    .where(and(eq(completions.userId, userId), eq(completions.day, day), inArray(completions.gameId, gameIds)));
  return Object.fromEntries(rows.map((r) => [r.gameId, { shareText: r.shareText }]));
}

/** Streak per game, plus an "all done" streak across the given set. */
export async function getStreaks(userId: string, gameIds: string[], today: string) {
  if (gameIds.length === 0) return { perGame: {} as Record<string, number>, allDone: 0 };
  const since = shiftDay(today, -400);
  const rows = await db
    .select({ gameId: completions.gameId, day: completions.day })
    .from(completions)
    .where(and(eq(completions.userId, userId), inArray(completions.gameId, gameIds), gte(completions.day, since)));
  const byGame = new Map<string, Set<string>>();
  const byDay = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!byGame.has(r.gameId)) byGame.set(r.gameId, new Set());
    byGame.get(r.gameId)!.add(r.day);
    if (!byDay.has(r.day)) byDay.set(r.day, new Set());
    byDay.get(r.day)!.add(r.gameId);
  }
  const perGame: Record<string, number> = {};
  for (const id of gameIds) perGame[id] = currentStreak(byGame.get(id) ?? new Set(), today);
  const fullDays = new Set([...byDay].filter(([, s]) => gameIds.every((g) => s.has(g))).map(([d]) => d));
  return { perGame, allDone: currentStreak(fullDays, today) };
}
