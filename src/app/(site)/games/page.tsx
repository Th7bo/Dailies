import { Suspense } from "react";
import { getAllCustomGames, getGameLibrary, getViewer } from "@/lib/data";
import { GameIcon } from "@/components/game-icon";
import { AdminGameControls } from "./admin-controls";
import { GameBrowser } from "./game-browser";

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
  return (
    <div className="space-y-12">
      <GameBrowser games={games} isAdmin={!!viewer?.isAdmin} />
      {viewer?.isAdmin && <AdminQueue />}
    </div>
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
