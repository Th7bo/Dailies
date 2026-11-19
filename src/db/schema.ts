import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ---------- Auth.js tables ---------- */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

/* ---------- App tables ---------- */

export const games = pgTable(
  "game",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    /** Normalized URL (no protocol / trailing slash) used for dedupe */
    urlKey: text("url_key").notNull(),
    description: text("description"),
    category: text("category").notNull().default("other"),
    /** null = not checked yet */
    embeddable: boolean("embeddable"),
    embedCheckedAt: timestamp("embed_checked_at", { mode: "date" }),
    /** Admin override: null = trust the header check, false = always new tab, true = always embed */
    embedOverride: boolean("embed_override"),
    inCatalog: boolean("in_catalog").notNull().default(false),
    createdById: text("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("game_url_key_idx").on(t.urlKey)],
);

export const playlists = pgTable(
  "playlist",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    isPublic: boolean("is_public").notNull().default(false),
    forkedFromId: text("forked_from_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("playlist_owner_idx").on(t.ownerId)],
);

export const playlistItems = pgTable(
  "playlist_item",
  {
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.playlistId, t.gameId] })],
);

export const follows = pgTable(
  "follow",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    playlistId: text("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.playlistId] }),
    index("follow_playlist_idx").on(t.playlistId),
  ],
);

export const completions = pgTable(
  "completion",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    /** User-local calendar day, YYYY-MM-DD */
    day: text("day").notNull(),
    shareText: text("share_text"),
    completedAt: timestamp("completed_at", { mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.gameId, t.day] })],
);

/** Per-user choice to open a game in a new tab even if it can be embedded. */
export const gamePrefs = pgTable(
  "game_pref",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    newTab: boolean("new_tab").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.userId, t.gameId] })],
);

export type Game = typeof games.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
