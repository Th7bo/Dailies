import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getGameLibrary, getPlaylist, requireViewer } from "@/lib/data";
import { Editor } from "./editor";

export const metadata = { title: "Edit list" };

export default function EditPage(props: PageProps<"/p/[id]/edit">) {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <Load params={props.params} />
    </Suspense>
  );
}

async function Load({ params }: { params: PageProps<"/p/[id]/edit">["params"] }) {
  const { id } = await params;
  const viewer = await requireViewer(`/p/${id}/edit`);
  const [p, library] = await Promise.all([getPlaylist(id, viewer.id), getGameLibrary(viewer.id)]);
  if (!p || !p.isOwner) notFound();
  // Games already in the list stay pickable even if they left the catalog.
  const known = new Set(library.map((g) => g.id));
  const all = [...library, ...p.games.filter((g) => !known.has(g.id))];
  return (
    <Editor
      id={p.id}
      initial={{ title: p.title, description: p.description ?? "", isPublic: p.isPublic }}
      initialGames={p.games.map((g) => g.id)}
      library={all}
    />
  );
}
