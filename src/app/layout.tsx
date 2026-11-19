import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Onest } from "next/font/google";
import { TzSync } from "@/components/tz-sync";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  title: { default: "Dailies", template: "%s · Dailies" },
  description: "Keep all your daily games in one lineup and play through them in a row.",
};

export const viewport: Viewport = {
  themeColor: "#1c1a4a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${onest.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TzSync />
        {children}
      </body>
    </html>
  );
}
