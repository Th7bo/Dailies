"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Pencil, Plus } from "lucide-react";
import { forkPlaylist, toggleFollow } from "@/lib/actions";
import { Button, ButtonLink } from "@/components/ui";

export function PlaylistActions({
  id,
  isOwner,
  isPublic,
  isFollowing,
  signedIn,
}: {
  id: string;
  isOwner: boolean;
  isPublic: boolean;
  isFollowing: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [following, setFollowing] = useState(isFollowing);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needSignIn = () => router.push(`/signin?next=/p/${id}`);

  return (
    <div className="space-y-3">
      {isOwner ? (
        <ButtonLink href={`/p/${id}/edit`} className="w-full" size="lg">
          <Pencil className="size-4" /> Edit list
        </ButtonLink>
      ) : (
        isPublic && (
          <Button
            className="w-full"
            size="lg"
            variant={following ? "outline" : "sun"}
            disabled={pending}
            onClick={() => {
              if (!signedIn) return needSignIn();
              start(async () => {
                try {
                  setFollowing(await toggleFollow(id));
                  setError(null);
                } catch (e) {
                  setError((e as Error).message);
                }
              });
            }}
          >
            {following ? <Check className="size-4" /> : <Plus className="size-4" />}
            {following ? "Following" : "Follow"}
          </Button>
        )
      )}
      <div className="grid grid-cols-2 gap-3">
        <Button
          disabled={pending}
          onClick={() => {
            if (!signedIn) return needSignIn();
            start(async () => {
              try {
                await forkPlaylist(id);
              } catch (e) {
                if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
                setError((e as Error).message);
              }
            });
          }}
        >
          <Copy className="size-4" /> {isOwner ? "Duplicate" : "Copy"}
        </Button>
        {isPublic && (
          <Button
            onClick={async () => {
              await navigator.clipboard.writeText(`${location.origin}/p/${id}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
            {copied ? "Copied" : "Share link"}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-coral">{error}</p>}
    </div>
  );
}
