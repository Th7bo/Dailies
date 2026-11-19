import { notFound } from "next/navigation";
import { getDayState, getNewTabPrefs, getPlaylist, getStreaks, requireViewer } from "@/lib/data";
import { getToday } from "@/lib/today";
import { Player } from "./player";

export async function generateMetadata(props: PageProps<"/play/[id]">) {
  const { id } = await props.params;
  const viewer = await requireViewer(`/play/${id}`);
  const p = await getPlaylist(id, viewer.id);
  return { title: p ? `Playing ${p.title}` : "List not found" };
}

export default async function PlayPage(props: PageProps<"/play/[id]">) {
  const { id } = await props.params;
  const viewer = await requireViewer(`/play/${id}`);
  const p = await getPlaylist(id, viewer.id);
  if (!p || p.games.length === 0) notFound();
  const today = await getToday();
  const ids = p.games.map((g) => g.id);
  const [done, streaks, newTab] = await Promise.all([
    getDayState(viewer.id, ids, today),
    getStreaks(viewer.id, ids, today),
    getNewTabPrefs(viewer.id, ids),
  ]);

  return (
    <Player
      key={today}
      playlist={{ id: p.id, title: p.title }}
      games={p.games}
      today={today}
      initialDone={done}
      streaks={streaks.perGame}
      allDoneStreak={streaks.allDone}
      initialNewTab={newTab}
    />
  );
}
