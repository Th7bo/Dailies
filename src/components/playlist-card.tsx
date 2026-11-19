import Link from "next/link";
import type { PlaylistCard as Card } from "@/lib/data";
import { TileStrip } from "./tile-strip";

export function PlaylistCard({ p }: { p: Card }) {
  return (
    <Link
      href={`/p/${p.id}`}
      className="group flex flex-col gap-4 rounded-panel border border-rim bg-dusk/60 p-5 transition-colors hover:border-haze hover:bg-dusk"
    >
      <div>
        <h3 className="font-display text-xl font-semibold leading-tight group-hover:text-sun">{p.title}</h3>
        <p className="mt-1 text-sm text-haze">
          by {p.ownerName ?? "someone"}, {p.count} {p.count === 1 ? "game" : "games"}
          {p.followers > 0 && `, ${p.followers} following`}
        </p>
      </div>
      {p.description && <p className="line-clamp-2 text-sm text-paper/80">{p.description}</p>}
      <div className="mt-auto">
        <TileStrip games={p.games} size={34} max={10} />
      </div>
    </Link>
  );
}
