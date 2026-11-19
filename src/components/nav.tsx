import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/data";
import { signOutAction } from "@/lib/actions";
import { Wordmark } from "./wordmark";
import { ButtonLink, DiscordMark } from "./ui";
import { NavLinks } from "./nav-links";

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-rim/60 bg-night/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" aria-label="Dailies home">
          <Wordmark compact />
        </Link>
        <NavLinks />
        <div className="ml-auto">
          <Suspense fallback={<span className="block size-9" />}>
            <Account />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function Account() {
  const user = await getViewer();
  if (!user) {
    return (
      <ButtonLink href="/signin" variant="discord" size="sm">
        <DiscordMark className="size-4" />
        Sign in
      </ButtonLink>
    );
  }
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full p-1 hover:bg-dusk [&::-webkit-details-marker]:hidden">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="size-8 rounded-full" />
        ) : (
          <span className="grid size-8 place-items-center rounded-full bg-dusk font-display">{user.name?.[0] ?? "?"}</span>
        )}
        <span className="hidden pr-2 text-sm sm:inline">{user.name}</span>
      </summary>
      <div className="absolute right-0 mt-2 w-48 rounded-panel border border-rim bg-dusk p-1.5 shadow-2xl shadow-night-deep">
        <form action={signOutAction}>
          <button className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-rim/60">Sign out</button>
        </form>
      </div>
    </details>
  );
}
