/** Parse + validate a user-supplied game URL. Returns null if unusable. */
export function parseGameUrl(input: string): URL | null {
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    if (u.username || u.password) return null;
    u.hash = "";
    return u;
  } catch {
    return null;
  }
}

/** Key used to dedupe games: host (no www) + path (no trailing slash) + query. */
export function urlKey(u: URL): string {
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const path = u.pathname.replace(/\/+$/, "").replace(/\/index\.html?$/, "");
  return `${host}${path}${u.search}`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function faviconUrl(url: string, size = 64): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=${size}`;
}
