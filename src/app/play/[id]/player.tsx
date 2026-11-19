"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, ClipboardPaste, Copy, ExternalLink, Flame, Trophy, X } from "lucide-react";
import type { DayState, GameLite } from "@/lib/data";
import { markDone, setNewTabPref, unmarkDone } from "@/lib/actions";
import { dayKey, formatDayLong } from "@/lib/day";
import { hostOf } from "@/lib/url";
import { GameIcon } from "@/components/game-icon";
import { Button, buttonClass, cn } from "@/components/ui";

type Props = {
  playlist: { id: string; title: string };
  games: GameLite[];
  today: string;
  initialDone: DayState;
  streaks: Record<string, number>;
  allDoneStreak: number;
  initialNewTab: string[];
};

const MAX_MOUNTED = 6;

export function Player({ playlist, games, today, initialDone, streaks: initialStreaks, allDoneStreak, initialNewTab }: Props) {
  const router = useRouter();
  const [newTab, setNewTab] = useState(() => new Set(initialNewTab));
  /** Plays inside Dailies unless the site blocks it or the user opted out. */
  const embeds = (g: GameLite) => g.embeddable !== false && !newTab.has(g.id);
  const toggleNewTab = (g: GameLite, on: boolean) => {
    setNewTab((s) => {
      const n = new Set(s);
      if (on) n.add(g.id);
      else n.delete(g.id);
      return n;
    });
    if (!on) setMounted((m) => (m.includes(g.id) ? m : [...m, g.id].slice(-MAX_MOUNTED)));
    setNewTabPref(g.id, on).catch((e: Error) => setError(e.message));
  };
  const [done, setDone] = useState<DayState>(initialDone);
  const [streaks, setStreaks] = useState(initialStreaks);
  const [error, setError] = useState<string | null>(null);
  const [justFlipped, setJustFlipped] = useState<string | null>(null);

  // Start on the first game not done yet (or the results screen).
  const firstOpen = games.findIndex((g) => !(g.id in initialDone));
  const [index, setIndex] = useState(firstOpen === -1 ? games.length : firstOpen);
  const onResults = index >= games.length;
  const game = onResults ? null : games[index];

  // Keep recently visited embeddable games mounted so their state survives prev/next.
  const [mounted, setMounted] = useState<string[]>(() =>
    game && game.embeddable !== false && !initialNewTab.includes(game.id) ? [game.id] : [],
  );

  const doneCount = games.filter((g) => g.id in done).length;
  const allDone = doneCount === games.length;

  // If the user's day rolls over while playing, reload with fresh state.
  useEffect(() => {
    const t = setInterval(() => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (dayKey(tz) !== today) router.refresh();
    }, 60_000);
    return () => clearInterval(t);
  }, [today, router]);

  const go = (i: number) => {
    const c = Math.max(0, Math.min(games.length, i));
    setIndex(c);
    const g = games[c];
    if (g && embeds(g)) {
      setMounted((m) => (m.includes(g.id) ? m : [...m, g.id].slice(-MAX_MOUNTED)));
    }
  };

  const nextOpenAfter = (i: number, state: DayState) => {
    for (let k = 1; k <= games.length; k++) {
      const j = (i + k) % games.length;
      if (!(games[j].id in state)) return j;
    }
    return games.length; // everything done: results
  };

  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const complete = async (g: GameLite, shareText?: string) => {
    const wasDone = g.id in done;
    const next = { ...done, [g.id]: { shareText: shareText ?? done[g.id]?.shareText ?? null } };
    setDone(next);
    if (!wasDone) {
      setJustFlipped(g.id);
      setStreaks((s) => ({ ...s, [g.id]: (s[g.id] ?? 0) + 1 }));
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      const from = games.indexOf(g);
      advanceTimer.current = setTimeout(() => go(nextOpenAfter(from, next)), 750);
    }
    try {
      await markDone(g.id, today, shareText);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setDone(done);
    }
  };

  const undo = async (g: GameLite) => {
    const prev = done;
    const next = { ...done };
    delete next[g.id];
    setDone(next);
    setStreaks((s) => ({ ...s, [g.id]: Math.max(0, (s[g.id] ?? 1) - 1) }));
    try {
      await unmarkDone(g.id, today);
    } catch (e) {
      setError((e as Error).message);
      setDone(prev);
    }
  };

  // Keyboard: ← → to move, D to toggle done. (Keys pressed inside a game iframe stay in the game.)
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("input, textarea, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "ArrowLeft") go(index - 1);
    else if ((e.key === "d" || e.key === "D") && game) {
      if (game.id in done) undo(game);
      else complete(game);
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-night-deep">
      {/* ---------- progress bar ---------- */}
      <header className="border-b border-rim/70 bg-night">
        <div className="flex items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4">
          <Link href="/" className={buttonClass("ghost", "sm", "shrink-0 px-2")} aria-label="Back to Today">
            <ChevronLeft className="size-5" />
            <span className="hidden max-w-40 truncate md:inline">{playlist.title}</span>
          </Link>

          <ol className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1.5 [scrollbar-width:none]" aria-label="Progress">
            {games.map((g, i) => {
              const isDone = g.id in done;
              const current = i === index;
              return (
                <li key={g.id} className="shrink-0">
                  <button
                    onClick={() => go(i)}
                    aria-current={current ? "step" : undefined}
                    aria-label={`${i + 1}. ${g.name}${isDone ? ", done" : ""}`}
                    title={g.name}
                    className={cn(
                      "tile-flip grid size-10 place-items-center rounded-tile border-2",
                      isDone ? "border-sun bg-sun" : "border-rim bg-dusk hover:border-haze",
                      current && "-translate-y-0.5 shadow-[0_4px_0_0] shadow-paper",
                      current && !isDone && "border-paper",
                      justFlipped === g.id && "animate-flip",
                    )}
                  >
                    <GameIcon url={g.url} name={g.name} size={24} />
                  </button>
                </li>
              );
            })}
            <li className="shrink-0">
              <button
                onClick={() => go(games.length)}
                aria-current={onResults ? "step" : undefined}
                aria-label="Results"
                title="Results"
                className={cn(
                  "grid size-10 place-items-center rounded-tile border-2 border-dashed",
                  allDone ? "border-sun text-sun" : "border-rim text-haze hover:border-haze",
                  onResults && "-translate-y-0.5 border-solid border-paper text-paper shadow-[0_4px_0_0] shadow-paper",
                )}
              >
                <Trophy className="size-4" />
              </button>
            </li>
          </ol>

          <span className="font-display hidden shrink-0 text-lg tabular-nums sm:inline">
            {doneCount}
            <span className="text-haze">/{games.length}</span>
          </span>
          <div className="flex shrink-0">
            <button onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous game" className="grid size-10 place-items-center rounded-full hover:bg-dusk disabled:opacity-30">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={() => go(index + 1)} disabled={onResults} aria-label="Next game" className="grid size-10 place-items-center rounded-full hover:bg-dusk disabled:opacity-30">
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
        {/* thin fill line under the tiles */}
        <div className="h-1 bg-dusk" aria-hidden>
          <div className="h-full bg-sun transition-[width] duration-500" style={{ width: `${(doneCount / games.length) * 100}%` }} />
        </div>
      </header>

      {/* ---------- game toolbar ---------- */}
      {game && (
        <GameToolbar
          key={game.id}
          game={game}
          isDone={game.id in done}
          shareText={done[game.id]?.shareText ?? null}
          streak={streaks[game.id] ?? 0}
          onDone={(text) => complete(game, text)}
          onUndo={() => undo(game)}
          onAlwaysNewTab={embeds(game) ? () => toggleNewTab(game, true) : undefined}
        />
      )}
      {error && (
        <p role="alert" className="bg-coral/15 px-4 py-2 text-sm text-coral">
          {error}
        </p>
      )}

      {/* ---------- stage ---------- */}
      <main className="relative min-h-0 flex-1">
        {games
          .filter((g) => mounted.includes(g.id) && embeds(g))
          .map((g) => (
            <iframe
              key={g.id}
              src={g.url}
              title={g.name}
              allow="clipboard-write; clipboard-read; fullscreen; autoplay"
              referrerPolicy="strict-origin-when-cross-origin"
              className={cn("absolute inset-0 size-full border-0 bg-white", g.id !== game?.id && "invisible")}
            />
          ))}
        {game && !embeds(game) && (
          <NewTabStage
            game={game}
            isDone={game.id in done}
            onTryHere={game.embeddable !== false ? () => toggleNewTab(game, false) : undefined}
          />
        )}
        {onResults && (
          <Results
            games={games}
            done={done}
            today={today}
            streak={allDone ? Math.max(allDoneStreak, 1) : allDoneStreak}
            onPick={go}
          />
        )}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function GameToolbar({
  game,
  isDone,
  shareText,
  streak,
  onDone,
  onUndo,
  onAlwaysNewTab,
}: {
  game: GameLite;
  isDone: boolean;
  shareText: string | null;
  streak: number;
  onDone: (text?: string) => void;
  onUndo: () => void;
  onAlwaysNewTab?: () => void;
}) {
  const [pasting, setPasting] = useState(false);
  const [draft, setDraft] = useState(shareText ?? "");
  const [hint, setHint] = useState<string | null>(null);

  const openPaste = async () => {
    setPasting(true);
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) setDraft(text);
    } catch {
      setHint("Paste your result here (Ctrl+V).");
    }
  };

  return (
    <div className="relative border-b border-rim/70 bg-night/70">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <GameIcon url={game.url} name={game.name} size={26} />
          <h1 className="font-display truncate text-lg font-semibold">{game.name}</h1>
          {streak > 0 && (
            <span className="inline-flex items-center gap-0.5 text-sm text-coral" title="Days in a row">
              <Flame className="size-4" /> {streak}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {onAlwaysNewTab && (
            <button onClick={onAlwaysNewTab} className="hidden text-sm text-haze underline-offset-4 hover:text-paper hover:underline lg:inline">
              Not loading? Always use a new tab
            </button>
          )}
          <a href={game.url} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")} title="Open in a new tab">
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">New tab</span>
          </a>
          <Button size="sm" variant="outline" onClick={openPaste}>
            <ClipboardPaste className="size-4" />
            <span className="hidden sm:inline">{shareText ? "Edit result" : "Paste result"}</span>
          </Button>
          {isDone ? (
            <Button size="sm" variant="sun" onClick={onUndo} title="Mark as not done (D)">
              <Check className="size-4" /> Done
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => onDone()} className="border-sun/60 text-sun hover:bg-sun/10" title="Mark done (D)">
              <Check className="size-4" /> Mark done
            </Button>
          )}
        </div>
      </div>

      {pasting && (
        <div className="absolute right-3 top-full z-20 mt-2 w-[min(26rem,calc(100vw-1.5rem))] rounded-panel border border-rim bg-dusk p-4 shadow-2xl shadow-night-deep">
          <div className="flex items-center justify-between">
            <p className="font-medium">Your {game.name} result</p>
            <button onClick={() => setPasting(false)} aria-label="Close" className="rounded-full p-1 text-haze hover:text-paper">
              <X className="size-4" />
            </button>
          </div>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            maxLength={2000}
            placeholder={hint ?? "Use the game's Share button, then paste here."}
            className="mt-3 w-full resize-none rounded-xl border border-rim bg-night-deep/70 p-3 text-sm leading-snug placeholder:text-haze focus:border-haze focus:outline-none"
          />
          <Button
            variant="sun"
            className="mt-3 w-full"
            disabled={!draft.trim()}
            onClick={() => {
              onDone(draft);
              setPasting(false);
            }}
          >
            Save result and mark done
          </Button>
        </div>
      )}
    </div>
  );
}

function NewTabStage({ game, isDone, onTryHere }: { game: GameLite; isDone: boolean; onTryHere?: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto p-6">
      <div className="max-w-md text-center">
        <GameIcon url={game.url} name={game.name} size={72} className="mx-auto" />
        <h2 className="font-display mt-5 text-4xl font-bold">{game.name}</h2>
        {game.description && <p className="mt-2 text-haze">{game.description}</p>}
        <a
          href={game.url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass(isDone ? "outline" : "sun", "lg", "mt-8")}
        >
          <ExternalLink className="size-4" /> Open {game.name}
        </a>
        <p className="mt-6 text-sm text-haze">
          {onTryHere
            ? "You chose to open this game in its own tab. Come back here and mark it done when you finish."
            : `${hostOf(game.url)} doesn't allow being shown inside other sites, so it opens in its own tab. Come back here and mark it done when you finish.`}
        </p>
        {onTryHere && (
          <button onClick={onTryHere} className="mt-3 text-sm text-haze underline underline-offset-4 hover:text-paper">
            Play it inside Dailies instead
          </button>
        )}
      </div>
    </div>
  );
}

function buildShareText(games: GameLite[], done: DayState, today: string, streak: number) {
  const finished = games.filter((g) => g.id in done);
  const lines = [`Dailies, ${formatDayLong(today)}: ${finished.length}/${games.length}${streak > 1 ? ` 🔥${streak}` : ""}`];
  for (const g of finished) {
    const text = done[g.id]?.shareText?.trim();
    lines.push("", text ? text : `✅ ${g.name}`);
  }
  return lines.join("\n");
}

function Results({
  games,
  done,
  today,
  streak,
  onPick,
}: {
  games: GameLite[];
  done: DayState;
  today: string;
  streak: number;
  onPick: (i: number) => void;
}) {
  const text = useMemo(() => buildShareText(games, done, today, streak), [games, done, today, streak]);
  const [copied, setCopied] = useState(false);
  const n = games.filter((g) => g.id in done).length;
  const left = games.length - n;

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-10 lg:grid-cols-[1fr_24rem]">
        <section>
          <p className="text-haze">{formatDayLong(today)}</p>
          <h2 className="font-display mt-1 text-5xl font-bold sm:text-6xl">
            {left === 0 ? "All done." : `${left} to go.`}
          </h2>
          {streak > 1 && left === 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-lg text-coral">
              <Flame className="size-5" /> Every game done {streak} days in a row
            </p>
          )}
          <ul className="mt-8 divide-y divide-rim/60 border-y border-rim/60">
            {games.map((g, i) => {
              const d = done[g.id];
              return (
                <li key={g.id}>
                  <button onClick={() => onPick(i)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-dusk/50">
                    <span className={cn("grid size-7 place-items-center rounded-lg border-2", d ? "border-sun bg-sun text-night-deep" : "border-rim")}>
                      {d && <Check className="size-4" />}
                    </span>
                    <span className="flex-1 font-medium">{g.name}</span>
                    <span className="text-sm text-haze">{d ? (d.shareText ? "Result saved" : "Done") : "Not played"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Link href="/" className={buttonClass("outline", "md", "mt-8")}>
            Back to Today
          </Link>
        </section>

        <section className="lg:pt-8">
          <h3 className="font-display text-xl font-semibold">Share to Discord</h3>
          <p className="mt-1 text-sm text-haze">Every result you pasted, in one message.</p>
          <pre className="mt-4 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-panel border border-rim bg-night p-4 text-sm leading-snug">{text}</pre>
          <Button
            variant="sun"
            size="lg"
            className="mt-4 w-full"
            disabled={n === 0}
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy everything"}
          </Button>
        </section>
      </div>
    </div>
  );
}
