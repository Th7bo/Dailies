import { Suspense } from "react";
import { redirect } from "next/navigation";
import { signInWithDiscord } from "@/lib/actions";
import { getViewer } from "@/lib/data";
import { Button, DiscordMark } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Sign in" };

export default function SignIn(props: PageProps<"/signin">) {
  return (
    <div className="mx-auto max-w-md pt-10 text-center">
      <Wordmark className="justify-center" />
      <h1 className="font-display mt-8 text-4xl font-bold">Sign in to keep your lists</h1>
      <p className="mt-3 text-haze">
        Dailies uses your Discord name and avatar. It doesn&apos;t see your servers or messages.
      </p>
      <Suspense>
        <SignInForm searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function SignInForm({ searchParams }: { searchParams: PageProps<"/signin">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";
  if (await getViewer()) redirect(next);
  const error = typeof sp.error === "string" ? sp.error : null;
  return (
    <form action={signInWithDiscord} className="mt-8">
      <input type="hidden" name="next" value={next} />
      <Button variant="discord" size="lg" className="w-full">
        <DiscordMark className="size-5" /> Continue with Discord
      </Button>
      {error && <p className="mt-4 text-sm text-coral">Discord sign-in didn&apos;t finish ({error}). Try again.</p>}
    </form>
  );
}
