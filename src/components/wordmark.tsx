import { cn } from "./ui";

/** Three tiles, the last one done. */
export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span aria-hidden className="flex gap-[3px]">
        <span className="size-3 rounded-[3px] bg-sun" />
        <span className="size-3 rounded-[3px] bg-sun" />
        <span className="size-3 rounded-[3px] border-2 border-haze" />
      </span>
      <span className={cn("font-display text-xl font-bold", compact && "hidden sm:inline")}>dailies</span>
    </span>
  );
}
