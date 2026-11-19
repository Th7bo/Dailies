"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

const links = [
  { href: "/", label: "Today" },
  { href: "/explore", label: "Explore" },
  { href: "/games", label: "Games" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm">
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 transition-colors",
              active ? "bg-dusk text-paper" : "text-haze hover:text-paper",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
