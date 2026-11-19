"use client";

import { useTransition } from "react";
import { recheckEmbed, setEmbedOverride, setInCatalog } from "@/lib/actions";

export function AdminGameControls({ id, inCatalog, override }: { id: string; inCatalog: boolean; override: boolean | null }) {
  const [pending, start] = useTransition();
  return (
    <span className="ml-auto flex flex-wrap items-center gap-2 text-xs">
      <select
        aria-label="How this game opens"
        disabled={pending}
        value={override === null ? "auto" : override ? "embed" : "tab"}
        onChange={(e) => {
          const v = e.target.value;
          start(() => setEmbedOverride(id, v === "auto" ? null : v === "embed"));
        }}
        className="rounded-md border border-rim bg-night-deep px-1.5 py-0.5"
      >
        <option value="auto">Auto</option>
        <option value="embed">Always embed</option>
        <option value="tab">Always new tab</option>
      </select>
      <button disabled={pending} onClick={() => start(() => recheckEmbed(id))} className="text-haze hover:text-paper disabled:opacity-50">
        Recheck
      </button>
      <button
        disabled={pending}
        onClick={() => start(() => setInCatalog(id, !inCatalog))}
        className="text-sun hover:underline disabled:opacity-50"
      >
        {inCatalog ? "Remove from catalog" : "Add to catalog"}
      </button>
    </span>
  );
}
