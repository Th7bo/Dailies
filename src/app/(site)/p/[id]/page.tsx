import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Lock, Play } from "lucide-react";
import { getPlaylist, getViewer } from "@/lib/data";
import { CATEGORIES } from "@/db/catalog";
import { GameIcon } from "@/components/game-icon";
import { ButtonLink } from "@/components/ui";
import { PlaylistActions } from "./playlist-actions";
import { hostOf } from "@/lib/url";

export default function PlaylistPage(props: PageProps<"/p/[id]">) {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <Detail params={props.params} />
    </Suspense>
  );
}

export async function generateMetadata(props: PageProps<"/p/[id]">) {
  const { id } = await props.params;
  const viewer = await getViewer();
  const p = await getPlaylist(id, viewer?.id);
  return { title: p?.title ?? "List not found" };
}

async function Detail({ params }: { params: PageProps<"/p/[id]">["params"] }) {
  const { id } = await params;
  const viewer = await getViewer();
  const p = await getPlaylist(id, viewer?.id);
  if (!p) notFound();

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div>
        <header>
          <p className="flex items-center gap-2 text-sm text-haze">
            {p.ownerImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.ownerImage} alt="" className="size-5 rounded-full" />
            )}
            {p.isOwner ? "Your list" : `By ${p.ownerName ?? "someone"}`}
            {!p.isPublic && (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3.5" /> private
              </span>
            )}
          </p>
          <h1 className="font-display mt-2 text-4xl font-bold sm:text-6xl">{p.title}</h1>
          {p.description && <p className="mt-4 max-w-2xl text-lg text-paper/85">{p.description}</p>}
          {p.forkedFromId && p.forkedFromTitle && (
            <p className="mt-3 text-sm text-haze">
              Copied from{" "}
              <Link href={`/p/${p.forkedFromId}`} className="underline decoration-rim underline-offset-4 hover:text-paper">
                {p.forkedFromTitle}
              </Link>
            </p>
          )}
        </header>

        <ol className="mt-10 divide-y divide-rim/60 border-y border-rim/60">
          {p.games.map((g, i) => (
            <li key={g.id} className="flex items-center gap-4 py-3.5">
              <span className="w-6 text-right text-sm tabular-nums text-haze">{i + 1}</span>
              <GameIcon url={g.url} name={g.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{g.name}</p>
                <p className="truncate text-sm text-haze">
                  {g.description ?? hostOf(g.url)}
                </p>
              </div>
              <span className="hidden text-sm text-haze sm:inline">{CATEGORIES[g.category as keyof typeof CATEGORIES] ?? "Other"}</span>
              <a
                href={g.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full p-2 text-haze hover:bg-dusk hover:text-paper"
                aria-label={`Open ${g.name} in a new tab`}
              >
                <ExternalLink className="size-4" />
              </a>
            </li>
          ))}
          {p.games.length === 0 && <li className="py-10 text-center text-haze">No games in this list yet.</li>}
        </ol>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        {p.games.length > 0 && (
          <ButtonLink href={`/play/${p.id}`} variant="sun" size="lg" className="w-full">
            <Play className="size-4 fill-current" /> Play {p.games.length} {p.games.length === 1 ? "game" : "games"}
          </ButtonLink>
        )}
        <PlaylistActions
          id={p.id}
          isOwner={p.isOwner}
          isPublic={p.isPublic}
          isFollowing={p.isFollowing}
          signedIn={!!viewer}
        />
        <p className="pt-2 text-sm text-haze">
          {p.followers} {p.followers === 1 ? "person follows" : "people follow"} this list.
        </p>
      </aside>
    </div>
  );
}
