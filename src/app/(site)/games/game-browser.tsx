"use client";

import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import type { GameLite } from "@/lib/data";
import { CATEGORIES, type Category } from "@/db/catalog";
import { hostOf } from "@/lib/url";
import { GameIcon } from "@/components/game-icon";
import { EmbedBadge } from "@/components/embed-badge";
import { Button, cn } from "@/components/ui";
import { AdminGameControls } from "./admin-controls";

const PAGE = 60;

export function GameBrowser({ games, isAdmin }: { games: GameLite[]; isAdmin: boolean }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [shown, setShown] = useState(PAGE);

  const query = q.trim().toLowerCase();
  const filtered = games
    .filter((g) => (cat === "all" || g.category === cat) && (!query || g.name.toLowerCase().includes(query) || hostOf(g.url).includes(query)))
    // Hand-picked games (the ones with descriptions) first, then A–Z.
    .sort((a, b) => Number(!!b.description) - Number(!!a.description) || a.name.localeCompare(b.name));
  const counts = new Map<string, number>();
  for (const g of games) counts.set(g.category, (counts.get(g.category) ?? 0) + 1);
  const cats = (Object.keys(CATEGORIES) as Category[]).filter((c) => counts.get(c));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-haze" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShown(PAGE);
            }}
            placeholder={`Search ${games.length} games`}
            aria-label="Search games"
            className="h-11 w-full rounded-full border border-rim bg-dusk/60 pl-10 pr-4 placeholder:text-haze focus:border-haze focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...cats] as const).map((c) => (
            <button
              key={c}
              onClick={() => {
                setCat(c);
                setShown(PAGE);
              }}
              aria-pressed={cat === c}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                cat === c ? "border-paper bg-paper text-night-deep" : "border-rim text-haze hover:text-paper",
              )}
            >
              {c === "all" ? "All" : CATEGORIES[c]}
              <span className={cn("ml-1.5 tabular-nums", cat === c ? "text-night-deep/60" : "text-haze/70")}>
                {c === "all" ? games.length : counts.get(c)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-panel border border-dashed border-rim p-10 text-center text-haze">
          No games match. You can add any game by link from a list&apos;s editor.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, shown).map((g) => (
            <li key={g.id} className="flex gap-3 rounded-2xl border border-rim bg-dusk/50 p-4">
              <GameIcon url={g.url} name={g.name} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{g.name}</p>
                  <a href={g.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${g.name}`} className="text-haze hover:text-paper">
                    <ExternalLink className="size-4" />
                  </a>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-haze">{g.description || hostOf(g.url)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <EmbedBadge embeddable={g.embeddable} />
                  {!g.inCatalog && <span className="text-xs text-haze">Added by you</span>}
                  {isAdmin && <AdminGameControls id={g.id} inCatalog={g.inCatalog} override={g.embedOverride} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {filtered.length > shown && (
        <Button className="mx-auto flex" onClick={() => setShown((n) => n + PAGE)}>
          Show more ({filtered.length - shown} left)
        </Button>
      )}
    </div>
  );
}
