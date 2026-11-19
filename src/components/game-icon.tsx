import { faviconUrl } from "@/lib/url";
import { cn } from "./ui";

/** Game favicon on a paper chip; falls back to the initial if the icon is blank. */
export function GameIcon({ url, name, size = 32, className }: { url: string; name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[30%] bg-paper", className)}
      style={{ width: size, height: size }}
    >
      <span aria-hidden className="font-display absolute text-night-deep/40" style={{ fontSize: size * 0.5 }}>
        {name.slice(0, 1)}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={faviconUrl(url, 64)}
        alt=""
        width={size * 0.62}
        height={size * 0.62}
        loading="lazy"
        className="relative"
        style={{ width: size * 0.62, height: size * 0.62 }}
      />
    </span>
  );
}
