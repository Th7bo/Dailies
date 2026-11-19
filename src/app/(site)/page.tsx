import { Suspense } from "react";
import { Flame, Plus, Play } from "lucide-react";
import { getFollowedPlaylists, getOwnPlaylists, getPublicPlaylists, getStreaks, getDayState, getViewer, type PlaylistCard as Card } from "@/lib/data";
import { getToday } from "@/lib/today";
import { formatDayLong } from "@/lib/day";
import { createPlaylistAndEdit, createStarterPlaylist, signInWithDiscord } from "@/lib/actions";
import { CATALOG } from "@/db/catalog";
import { TileStrip } from "@/components/tile-strip";
import { GameIcon } from "@/components/game-icon";
import { PlaylistCard } from "@/components/playlist-card";
import { Button, ButtonLink, DiscordMark, cn } from "@/components/ui";

export default function Home() {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <HomeSwitch />
    </Suspense>
  );
}

async function HomeSwitch() {
  const user = await getViewer();
  return user ? <Today userId={user.id} /> : <Landing />;
}

/* ---------------- signed in ---------------- */

async function Today({ userId }: { userId: string }) {
  const [today, own, followed] = await Promise.all([getToday(), getOwnPlaylists(userId), getFollowedPlaylists(userId)]);
  const lists = [...own.map((p) => ({ ...p, mine: true })), ...followed.map((p) => ({ ...p, mine: false }))];
  const allGameIds = [...new Set(lists.flatMap((l) => l.games.map((g) => g.id)))];
  const done = await getDayState(userId, allGameIds, today);
  const doneCount = allGameIds.filter((id) => id in done).length;

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-bold sm:text-6xl">{formatDayLong(today)}</h1>
          <p className="mt-3 text-lg text-haze">
            {allGameIds.length === 0
              ? "No games lined up yet."
              : doneCount === allGameIds.length
                ? `All ${allGameIds.length} games done. See you tomorrow.`
                : `${doneCount} of ${allGameIds.length} games done today.`}
          </p>
        </div>
        {lists.length > 0 && (
          <form action={createPlaylistAndEdit}>
            <Button variant="outline">
              <Plus className="size-4" /> New list
            </Button>
          </form>
        )}
      </header>

      {lists.length === 0 ? (
        <EmptyToday />
      ) : (
        <ul className="space-y-4">
          {lists.map((l) => (
            <li key={l.id}>
              <Suspense fallback={<LineupRow list={l} done={done} streak={0} mine={l.mine} />}>
                <LineupWithStreak list={l} done={done} userId={userId} today={today} mine={l.mine} />
              </Suspense>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function LineupWithStreak(props: { list: Card; done: Record<string, unknown>; userId: string; today: string; mine: boolean }) {
  const { allDone } = await getStreaks(props.userId, props.list.games.map((g) => g.id), props.today);
  return <LineupRow list={props.list} done={props.done} streak={allDone} mine={props.mine} />;
}

function LineupRow({ list, done, streak, mine }: { list: Card; done: Record<string, unknown>; streak: number; mine: boolean }) {
  const total = list.games.length;
  const n = list.games.filter((g) => g.id in done).length;
  const complete = total > 0 && n === total;
  return (
    <article
      className={cn(
        "grid gap-5 rounded-panel border p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6",
        complete ? "border-sun/50 bg-sun/[0.07]" : "border-rim bg-dusk/60",
      )}
    >
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <a href={`/p/${list.id}`} className="font-display text-2xl font-semibold hover:text-sun">
            {list.title}
          </a>
          {!mine && <span className="text-sm text-haze">following, by {list.ownerName}</span>}
          {streak > 1 && (
            <span className="inline-flex items-center gap-1 text-sm text-coral" title="Days in a row with every game done">
              <Flame className="size-4" /> {streak} days
            </span>
          )}
        </div>
        {total > 0 ? (
          <TileStrip games={list.games} done={done} size={44} />
        ) : (
          <p className="text-haze">This list is empty. Add some games to it.</p>
        )}
      </div>
      <div className="flex items-center gap-4 sm:flex-col sm:items-end">
        <p className="font-display text-3xl tabular-nums">
          {n}
          <span className="text-haze">/{total}</span>
        </p>
        {total > 0 ? (
          <ButtonLink href={`/play/${list.id}`} variant={complete ? "outline" : "sun"} size="lg">
            <Play className="size-4 fill-current" /> {complete ? "Replay" : n > 0 ? "Continue" : "Play"}
          </ButtonLink>
        ) : (
          mine && <ButtonLink href={`/p/${list.id}/edit`}>Add games</ButtonLink>
        )}
      </div>
    </article>
  );
}

function EmptyToday() {
  return (
    <section className="grid gap-8 rounded-panel border border-dashed border-rim p-8 sm:grid-cols-2 sm:p-10">
      <div>
        <h2 className="font-display text-3xl font-semibold">Start a list</h2>
        <p className="mt-2 max-w-md text-haze">
          Begin with a few favourites (Wordle, Connections, Strands, the Mini, Worldle, Framed and Costcodle) and change it however you like.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <form action={createStarterPlaylist}>
            <Button variant="sun" size="lg">Use the starter list</Button>
          </form>
          <form action={createPlaylistAndEdit}>
            <Button variant="outline" size="lg">Start empty</Button>
          </form>
        </div>
      </div>
      <div>
        <h2 className="font-display text-3xl font-semibold">Or follow one</h2>
        <p className="mt-2 max-w-md text-haze">Public lists made by other people. Following keeps them in sync when the owner changes them.</p>
        <ButtonLink href="/explore" className="mt-6" size="lg">Browse public lists</ButtonLink>
      </div>
    </section>
  );
}

/* ---------------- signed out ---------------- */

const HERO_IDS = ["wordle", "connections", "worldle", "framed", "nerdle", "strands", "costcodle", "bandle", "globle"];
const HERO_DONE = 4;

async function Landing() {
  const popular = (await getPublicPlaylists()).slice(0, 6);
  const heroGames = HERO_IDS.map((id) => CATALOG.find((g) => g.id === id)!).filter(Boolean);
  return (
    <div className="space-y-24">
      <section className="grid gap-12 pt-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <h1 className="font-display text-5xl font-bold leading-[0.95] sm:text-7xl">
            Every daily game, one after another.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-haze">
            Put Wordle, Connections, Worldle and the rest into one list. Play through them in order, tick each off as you go, and keep your streaks.
          </p>
          <form action={signInWithDiscord} className="mt-8">
            <input type="hidden" name="next" value="/" />
            <Button variant="discord" size="lg">
              <DiscordMark className="size-5" /> Sign in with Discord
            </Button>
          </form>
        </div>

        <div aria-hidden className="relative">
          <div className="rounded-[1.75rem] border border-rim bg-night-deep p-5 shadow-[0_30px_80px_-20px] shadow-night-deep">
            <div className="flex items-center justify-between text-sm text-haze">
              <span className="font-display text-base text-paper">Morning run</span>
              <span className="tabular-nums">{HERO_DONE}/{heroGames.length}</span>
            </div>
            <div className="mt-4 grid grid-cols-9 gap-1.5">
              {heroGames.map((g, i) => (
                <div
                  key={g.id}
                  className={cn(
                    "animate-deal grid aspect-square place-items-center rounded-tile border-2",
                    i < HERO_DONE ? "border-sun bg-sun" : i === HERO_DONE ? "border-paper bg-dusk -translate-y-1" : "border-rim bg-dusk",
                  )}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <GameIcon url={g.url} name={g.name} size={22} />
                </div>
              ))}
            </div>
            <div className="mt-5 grid h-44 place-items-center rounded-2xl border border-rim bg-dusk/70">
              <div className="text-center">
                <p className="font-display text-2xl">{heroGames[HERO_DONE].name}</p>
                <p className="mt-1 text-sm text-haze">{heroGames[HERO_DONE].description}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-10 sm:grid-cols-3">
        {[
          ["Make lists", "Pick from the catalog or paste any link. Reorder until it matches your morning."],
          ["Play in a row", "Games open one after another, with a progress bar at the top. Sites that can't be embedded open in a new tab."],
          ["Share one result", "Paste each game's share text as you go, then copy them all at once for Discord."],
        ].map(([t, d]) => (
          <div key={t}>
            <h2 className="font-display text-2xl font-semibold">{t}</h2>
            <p className="mt-2 text-haze">{d}</p>
          </div>
        ))}
      </section>

      {popular.length > 0 && (
        <section>
          <h2 className="font-display text-3xl font-semibold">Popular lists</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((p) => (
              <PlaylistCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
