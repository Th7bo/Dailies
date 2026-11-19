import { ExternalLink, PanelTop } from "lucide-react";
import { cn } from "./ui";

/** Shows whether a game plays inside Dailies or opens in a new tab. */
export function EmbedBadge({ embeddable, compact }: { embeddable: boolean | null; compact?: boolean }) {
  if (embeddable === null) return null;
  const Icon = embeddable ? PanelTop : ExternalLink;
  const label = embeddable ? "Plays here" : "Opens in new tab";
  return (
    <span
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full text-xs",
        embeddable ? "text-mint" : "text-haze",
        !compact && "border border-current/30 px-2 py-0.5",
      )}
    >
      <Icon className="size-3.5" />
      <span className={compact ? "sr-only" : undefined}>{label}</span>
    </span>
  );
}
