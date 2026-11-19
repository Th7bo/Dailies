import { Nav } from "@/components/nav";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-10 sm:px-6">{children}</main>
      <footer className="mx-auto w-full max-w-6xl px-4 pb-10 text-sm text-haze sm:px-6">
        Games belong to their makers. Dailies just lines them up.
      </footer>
    </>
  );
}
