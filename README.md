# Dailies

All your daily games (Wordle, Connections, Worldle…) in one list. Play through them in a row with a progress bar on top, tick each one off, keep streaks, and copy every result into one Discord message.

- **Lists**: make your own, keep them private or public, follow other people's lists (stays in sync) or copy them.
- **Player**: games that allow embedding play inside the page. Ones that block it (NYT, LinkedIn, …) open in a new tab and you mark them done when you're back.
- **Catalog**: a shared set of known dailies, plus any link you paste. Admins can promote custom games into the catalog and force how a game opens.

Stack: Next.js 16 (App Router), Tailwind 4, Auth.js v5 (Discord), Drizzle ORM, Postgres.

## Local development

```bash
cp .env.example .env            # fill in AUTH_SECRET + Discord app creds
podman run -d --name dailies-pg -p 5432:5432 \
  -e POSTGRES_USER=dailies -e POSTGRES_PASSWORD=dailies -e POSTGRES_DB=dailies \
  postgres:17-alpine            # or docker
pnpm install
pnpm dev
```

Migrations and the catalog seed run automatically on server start (`src/instrumentation.ts`).
After changing `src/db/schema.ts`, generate a migration with `pnpm drizzle-kit generate`.

## Discord app

1. https://discord.com/developers/applications → New Application → OAuth2.
2. Add redirects: `https://daily.th7bo.dev/api/auth/callback/discord` (and `http://localhost:3000/api/auth/callback/discord` for dev).
3. Copy the Client ID / Secret into `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET`.

Only the `identify` scope is requested.

## Deploying on Dokploy

1. New **Compose** service → this repo, compose file `docker-compose.yml`.
2. Environment: `AUTH_SECRET`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, `POSTGRES_PASSWORD`, optionally `ADMIN_DISCORD_IDS` (comma-separated Discord user IDs) and `AUTH_URL` (defaults to `https://daily.th7bo.dev`).
3. Domains → `daily.th7bo.dev` → service `app`, port `3000`, HTTPS on.

Health check: `GET /api/health`.

## Game catalog

`src/db/catalog.ts` has the hand-picked games, which come with descriptions. `src/db/catalog-imported.ts` adds about 500 more, generated from the community list at [aukspot/dles](https://github.com/aukspot/dles) (names, links and categories only). Dead links were removed. The catalog is upserted on every server start.

## How embedding is decided

On add (and weekly after) the server fetches the game's page and reads `X-Frame-Options` / CSP `frame-ancestors`. That fetch blocks private and loopback addresses at the socket level, so user-submitted links can't reach internal services. Some sites block iframes with JavaScript instead of headers. For those, an admin can set the game to "Always new tab", and any user can pick "Always use a new tab" per game from the player.
