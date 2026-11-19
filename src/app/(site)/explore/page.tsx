import { Suspense } from "react";
import { Search } from "lucide-react";
import { getPublicPlaylists } from "@/lib/data";
import { PlaylistCard } from "@/components/playlist-card";

export const metadata = { title: "Explore lists" };

export default function Explore(props: PageProps<"/explore">) {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Public lists</h1>
          <p className="mt-2 text-haze">Follow a list to keep it on your Today page, or copy it and make it your own.</p>
        </div>
        <form className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-haze" />
          <Suspense>
            <SearchInput searchParams={props.searchParams} />
          </Suspense>
        </form>
      </header>
      <Suspense fallback={<div className="h-64" />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchInput({ searchParams }: { searchParams: PageProps<"/explore">["searchParams"] }) {
  const q = (await searchParams).q;
  return (
    <input
      name="q"
      defaultValue={typeof q === "string" ? q : ""}
      placeholder="Search lists"
      className="h-11 w-full rounded-full border border-rim bg-dusk/60 pl-10 pr-4 placeholder:text-haze focus:border-haze focus:outline-none"
    />
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/explore">["searchParams"] }) {
  const q = (await searchParams).q;
  const lists = await getPublicPlaylists(typeof q === "string" ? q : undefined);
  if (lists.length === 0) {
    return (
      <p className="rounded-panel border border-dashed border-rim p-10 text-center text-haze">
        {q ? "No public lists match that search." : "No public lists yet. Make one of yours public to be the first."}
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lists.map((p) => (
        <PlaylistCard key={p.id} p={p} />
      ))}
    </div>
  );
}
