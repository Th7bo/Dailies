"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, Globe, GripVertical, Lock, Plus, Search, Trash2, X } from "lucide-react";
import { addCustomGame, deletePlaylist, setPlaylistGames, updatePlaylistMeta } from "@/lib/actions";
import type { GameLite } from "@/lib/data";
import { CATEGORIES, type Category } from "@/db/catalog";
import { GameIcon } from "@/components/game-icon";
import { Button, ButtonLink, cn } from "@/components/ui";
import { EmbedBadge } from "@/components/embed-badge";

type Meta = { title: string; description: string; isPublic: boolean };
type SaveState = "idle" | "saving" | "saved" | "error";

export function Editor({
  id,
  initial,
  initialGames,
  library: initialLibrary,
}: {
  id: string;
  initial: Meta;
  initialGames: string[];
  library: GameLite[];
}) {
  const [meta, setMeta] = useState(initial);
  const [order, setOrder] = useState(initialGames);
  const [library, setLibrary] = useState(initialLibrary);
  const [save, setSave] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const byId = useMemo(() => new Map(library.map((g) => [g.id, g])), [library]);

  /* -------- autosave -------- */
  const lastSaved = useRef(initialGames.join(","));
  useEffect(() => {
    const key = order.join(",");
    if (key === lastSaved.current) return;
    const t = setTimeout(() => {
      setSave("saving");
      setPlaylistGames(id, order)
        .then(() => {
          lastSaved.current = key;
          setSave("saved");
        })
        .catch((e: Error) => {
          setSave("error");
          setError(e.message);
        });
    }, 500);
    return () => clearTimeout(t);
  }, [id, order]);

  const saveMeta = (next: Meta) => {
    setMeta(next);
    if (!next.title.trim()) {
      setError("Give the list a name.");
      return;
    }
    setSave("saving");
    updatePlaylistMeta(id, next)
      .then(() => {
        setSave("saved");
        setError(null);
      })
      .catch((e: Error) => {
        setSave("error");
        setError(e.message);
      });
  };

  /* -------- list ops -------- */
  const toggle = (gid: string) => setOrder((o) => (o.includes(gid) ? o.filter((x) => x !== gid) : [...o, gid]));
  const move = (from: number, to: number) =>
    setOrder((o) => {
      if (to < 0 || to >= o.length) return o;
      const next = [...o];
      const [x] = next.splice(from, 1);
      next.splice(to, 0, x);
      return next;
    });
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href={`/p/${id}`} className="text-sm text-haze hover:text-paper">
          Back to list
        </Link>
        <div className="flex items-center gap-3">
          <SaveIndicator state={save} />
          <ButtonLink href={`/p/${id}`} variant="sun">
            Done
          </ButtonLink>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_26rem]">
        {/* -------- left: meta + order -------- */}
        <section className="min-w-0 space-y-8">
          <div className="space-y-4">
            <input
              aria-label="List name"
              value={meta.title}
              maxLength={60}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              onBlur={() => saveMeta(meta)}
              className="font-display w-full border-b-2 border-rim bg-transparent pb-2 text-4xl font-bold focus:border-sun focus:outline-none sm:text-5xl"
            />
            <textarea
              aria-label="Description"
              placeholder="What's this list for? (optional)"
              value={meta.description}
              maxLength={280}
              rows={2}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              onBlur={() => saveMeta(meta)}
              className="w-full resize-none rounded-2xl border border-rim bg-dusk/50 p-3 placeholder:text-haze focus:border-haze focus:outline-none"
            />
            <div role="radiogroup" aria-label="Visibility" className="inline-flex rounded-full border border-rim p-1">
              {[
                { v: false, label: "Private", icon: Lock },
                { v: true, label: "Public", icon: Globe },
              ].map(({ v, label, icon: Icon }) => (
                <button
                  key={label}
                  role="radio"
                  aria-checked={meta.isPublic === v}
                  onClick={() => saveMeta({ ...meta, isPublic: v })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm",
                    meta.isPublic === v ? "bg-paper text-night-deep" : "text-haze hover:text-paper",
                  )}
                >
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>
            <p className="text-sm text-haze">
              {meta.isPublic
                ? "Anyone with the link can see, follow and copy this list. It also shows up in Explore."
                : "Only you can see this list."}
            </p>
            {error && <p className="text-sm text-coral">{error}</p>}
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold">
              Play order <span className="text-haze">({order.length})</span>
            </h2>
            {order.length === 0 ? (
              <p className="mt-4 rounded-panel border border-dashed border-rim p-8 text-center text-haze">
                Pick games from the list on the right. They&apos;ll play in the order shown here.
              </p>
            ) : (
              <ol className="mt-4 space-y-2">
                {order.map((gid, i) => {
                  const g = byId.get(gid);
                  if (!g) return null;
                  return (
                    <li
                      key={gid}
                      draggable
                      onDragStart={() => setDragIndex(i)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragIndex !== null && dragIndex !== i) {
                          move(dragIndex, i);
                          setDragIndex(i);
                        }
                      }}
                      onDragEnd={() => setDragIndex(null)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-dusk/60 p-2.5 pr-2",
                        dragIndex === i ? "border-sun" : "border-rim",
                      )}
                    >
                      <GripVertical className="size-4 shrink-0 cursor-grab text-haze" aria-hidden />
                      <span className="w-5 text-right text-sm tabular-nums text-haze">{i + 1}</span>
                      <GameIcon url={g.url} name={g.name} size={32} />
                      <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
                      <EmbedBadge embeddable={g.embeddable} compact />
                      <div className="flex">
                        <IconBtn label={`Move ${g.name} up`} onClick={() => move(i, i - 1)} disabled={i === 0}>
                          <ArrowUp className="size-4" />
                        </IconBtn>
                        <IconBtn label={`Move ${g.name} down`} onClick={() => move(i, i + 1)} disabled={i === order.length - 1}>
                          <ArrowDown className="size-4" />
                        </IconBtn>
                        <IconBtn label={`Remove ${g.name}`} onClick={() => toggle(gid)}>
                          <X className="size-4" />
                        </IconBtn>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <DeleteList id={id} />
        </section>

        {/* -------- right: picker -------- */}
        <Picker
          library={library}
          selected={order}
          onToggle={toggle}
          onAdded={(g) => {
            setLibrary((l) => (l.some((x) => x.id === g.id) ? l : [...l, g]));
            setOrder((o) => (o.includes(g.id) ? o : [...o, g.id]));
          }}
        />
      </div>
    </div>
  );
}

function IconBtn({ label, children, ...props }: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full text-haze hover:bg-rim/60 hover:text-paper disabled:opacity-30 disabled:hover:bg-transparent"
      {...props}
    >
      {children}
    </button>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const text = { idle: "", saving: "Saving…", saved: "Saved", error: "Couldn't save" }[state];
  return (
    <span aria-live="polite" className={cn("text-sm", state === "error" ? "text-coral" : "text-haze")}>
      {state === "saved" && <Check className="mr-1 inline size-4 text-mint" />}
      {text}
    </span>
  );
}

function Picker({
  library,
  selected,
  onToggle,
  onAdded,
}: {
  library: GameLite[];
  selected: string[];
  onToggle: (id: string) => void;
  onAdded: (g: GameLite) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const sel = new Set(selected);
  const shown = library.filter(
    (g) => (cat === "all" || g.category === cat) && (!q || g.name.toLowerCase().includes(q.toLowerCase())),
  );
  const usedCats = (Object.keys(CATEGORIES) as Category[]).filter((c) => library.some((g) => g.category === c));

  return (
    <section className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <h2 className="font-display text-2xl font-semibold">Add games</h2>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-haze" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search games"
          aria-label="Search games"
          className="h-11 w-full rounded-full border border-rim bg-dusk/60 pl-10 pr-4 placeholder:text-haze focus:border-haze focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["all", ...usedCats] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            aria-pressed={cat === c}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              cat === c ? "border-paper bg-paper text-night-deep" : "border-rim text-haze hover:text-paper",
            )}
          >
            {c === "all" ? "All" : CATEGORIES[c]}
          </button>
        ))}
      </div>
      <ul className="max-h-[26rem] space-y-1 overflow-y-auto rounded-panel border border-rim bg-night-deep/60 p-1.5">
        {shown.map((g) => {
          const on = sel.has(g.id);
          return (
            <li key={g.id}>
              <button
                onClick={() => onToggle(g.id)}
                aria-pressed={on}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl p-2 text-left",
                  on ? "bg-sun/10" : "hover:bg-dusk",
                )}
              >
                <GameIcon url={g.url} name={g.name} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{g.name}</span>
                  {!g.inCatalog && <span className="block text-xs text-haze">Added by link</span>}
                </span>
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full border",
                    on ? "border-sun bg-sun text-night-deep" : "border-rim text-haze",
                  )}
                >
                  {on ? <Check className="size-4" /> : <Plus className="size-4" />}
                </span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && <li className="p-6 text-center text-sm text-haze">No games match. Add it by link below.</li>}
      </ul>
      <AddByLink onAdded={onAdded} defaultName={q} />
    </section>
  );
}

function AddByLink({ onAdded, defaultName }: { onAdded: (g: GameLite) => void; defaultName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add a game by link
      </Button>
    );
  }
  return (
    <form
      className="space-y-3 rounded-panel border border-rim bg-dusk/60 p-4"
      action={(fd) =>
        start(async () => {
          const res = await addCustomGame({
            name: String(fd.get("name")),
            url: String(fd.get("url")),
            category: String(fd.get("category")) as Category,
          });
          if (!res.ok) return setError(res.error);
          setError(null);
          setOpen(false);
          onAdded(res.game);
        })
      }
    >
      <label className="block text-sm">
        <span className="text-haze">Link</span>
        <input name="url" required type="text" inputMode="url" placeholder="https://…" className="mt-1 h-10 w-full rounded-xl border border-rim bg-night-deep/60 px-3 focus:border-haze focus:outline-none" />
      </label>
      <label className="block text-sm">
        <span className="text-haze">Name</span>
        <input name="name" required defaultValue={defaultName} maxLength={50} className="mt-1 h-10 w-full rounded-xl border border-rim bg-night-deep/60 px-3 focus:border-haze focus:outline-none" />
      </label>
      <label className="block text-sm">
        <span className="text-haze">Category</span>
        <select name="category" defaultValue="other" className="mt-1 h-10 w-full rounded-xl border border-rim bg-night-deep/60 px-3 focus:border-haze focus:outline-none">
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-sm text-coral">{error}</p>}
      <div className="flex gap-2">
        <Button variant="sun" disabled={pending} className="flex-1">
          {pending ? "Checking the site…" : "Add game"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DeleteList({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="border-t border-rim/60 pt-6">
      {confirm ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">Delete this list for good? Followers will lose it too.</span>
          <Button variant="danger" size="sm" disabled={pending} onClick={() => start(() => deletePlaylist(id))}>
            Delete list
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
            Keep it
          </Button>
        </div>
      ) : (
        <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
          <Trash2 className="size-4" /> Delete list
        </Button>
      )}
    </div>
  );
}
