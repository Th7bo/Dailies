import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { getAllCustomGames, getGameLibrary, getViewer } from "@/lib/data";
import { CATEGORIES, type Category } from "@/db/catalog";
import { GameIcon } from "@/components/game-icon";
import { EmbedBadge } from "@/components/embed-badge";
import { AdminGameControls } from "./admin-controls";

export const metadata = { title: "Games" };

export default function GamesPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Games</h1>
        <p className="mt-2 max-w-2xl text-haze">
          Everything in the shared catalog. Games marked &ldquo;Plays here&rdquo; open inside Dailies; the rest block embedding, so they open in a new tab and you tick them off when you&apos;re back.
        </p>
      </header>
      <Suspense fallback={<div className="h-96" />}>
        <Catalog />
      </Suspense>
    </div>
  );
}

async function Catalog() {
  const viewer = await getViewer();
  const games = await getGameLibrary(viewer?.id);
  const catalog = games.filter((g) => g.inCatalog);
  const mine = games.filter((g) => !g.inCatalog);
  const groups = (Object.keys(CATEGORIES) as Category[])
    .map((c) => ({ c, games: catalog.filter((g) => g.category === c) }))
    .filter((x) => x.games.length);

  return (
    <div className="space-y-12">
      {groups.map(({ c, games }) => (
        <section key={c}>
          <h2 className="font-display text-2xl font-semibold">{CATEGORIES[c]}</h2>
          <GameGrid games={games} isAdmin={!!viewer?.isAdmin} />
        </section>
      ))}
      {mine.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-semibold">Added by you</h2>
          <p className="mt-1 text-sm text-haze">Games you added by link. Only you see these here.</p>
          <GameGrid games={mine} isAdmin={!!viewer?.isAdmin} />
        </section>
      )}
      {viewer?.isAdmin && <AdminQueue />}
    </div>
  );
}

function GameGrid({ games, isAdmin }: { games: Awaited<ReturnType<typeof getGameLibrary>>; isAdmin: boolean }) {
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((g) => (
        <li key={g.id} className="flex gap-3 rounded-2xl border border-rim bg-dusk/50 p-4">
          <GameIcon url={g.url} name={g.name} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{g.name}</p>
              <a href={g.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${g.name}`} className="text-haze hover:text-paper">
                <ExternalLink className="size-4" />
              </a>
            </div>
            {g.description && <p className="mt-0.5 text-sm text-haze">{g.description}</p>}
            <div className="mt-2 flex items-center gap-2">
              <EmbedBadge embeddable={g.embeddable} />
              {isAdmin && <AdminGameControls id={g.id} inCatalog={g.inCatalog} override={g.embedOverride} />}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function AdminQueue() {
  const custom = await getAllCustomGames();
  if (custom.length === 0) return null;
  return (
    <section className="rounded-panel border border-dashed border-rim p-6">
      <h2 className="font-display text-2xl font-semibold">Added by everyone</h2>
      <p className="mt-1 text-sm text-haze">Custom games people added by link. Add the good ones to the catalog.</p>
      <ul className="mt-4 divide-y divide-rim/60">
        {custom.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center gap-3 py-3">
            <GameIcon url={g.url} name={g.name} size={28} />
            <span className="font-medium">{g.name}</span>
            <a href={g.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-haze underline-offset-4 hover:underline">
              {g.url}
            </a>
            <span className="text-sm text-haze">
              by {g.createdBy ?? "unknown"}, in {g.usage} {g.usage === 1 ? "list" : "lists"}
            </span>
            <span className="ml-auto">
              <AdminGameControls id={g.id} inCatalog={false} override={g.embedOverride} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
