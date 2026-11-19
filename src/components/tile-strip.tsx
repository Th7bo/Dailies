import type { GameLite } from "@/lib/data";
import { GameIcon } from "./game-icon";
import { cn } from "./ui";

/** A row of game tiles; done tiles turn sun-yellow. */
export function TileStrip({
  games,
  done = {},
  size = 40,
  max,
}: {
  games: GameLite[];
  done?: Record<string, unknown>;
  size?: number;
  max?: number;
}) {
  const shown = max ? games.slice(0, max) : games;
  const extra = games.length - shown.length;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Games">
      {shown.map((g) => {
        const isDone = g.id in done;
        return (
          <li
            key={g.id}
            title={`${g.name}${isDone ? " — done" : ""}`}
            className={cn(
              "grid place-items-center rounded-tile border-2",
              isDone ? "border-sun bg-sun" : "border-rim bg-dusk",
            )}
            style={{ width: size, height: size }}
          >
            <GameIcon url={g.url} name={g.name} size={size * 0.6} />
            <span className="sr-only">{isDone ? `${g.name}, done` : g.name}</span>
          </li>
        );
      })}
      {extra > 0 && (
        <li
          className="grid place-items-center rounded-tile border-2 border-dashed border-rim text-sm text-haze"
          style={{ width: size, height: size }}
        >
          +{extra}
        </li>
      )}
    </ul>
  );
}
