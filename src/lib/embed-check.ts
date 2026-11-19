import "server-only";
import dns from "node:dns";
import net from "node:net";
import { Agent, fetch } from "undici";

/**
 * Checks whether a URL can be shown inside an <iframe> by looking at
 * X-Frame-Options and CSP frame-ancestors on the final response.
 *
 * Fetching user-supplied URLs from the server is an SSRF vector, so every
 * connection (including each redirect hop) goes through a DNS lookup that
 * rejects private, loopback, link-local and other non-public addresses.
 * Validating inside the socket's lookup also closes the DNS-rebinding gap.
 */

const blocked = new net.BlockList();
for (const [addr, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(addr, prefix, "ipv4");
}
for (const [addr, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["64:ff9b::", 96],
] as const) {
  blocked.addSubnet(addr, prefix, "ipv6");
}

function isPublicAddress(address: string, family: number): boolean {
  // IPv4-mapped IPv6 (::ffff:a.b.c.d)
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return !blocked.check(mapped[1], "ipv4");
  return !blocked.check(address, family === 6 ? "ipv6" : "ipv4");
}

const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as dns.LookupAddress[];
    const ok = list.filter((a) => isPublicAddress(a.address, a.family));
    if (ok.length === 0 || ok.length !== list.length) {
      return callback(new Error(`Blocked non-public address for ${hostname}`), "", 0);
    }
    if ((options as dns.LookupOptions).all) return callback(null, ok as never, 0);
    callback(null, ok[0].address, ok[0].family);
  });
};

const agent = new Agent({
  connect: { lookup: safeLookup, timeout: 5000 },
  headersTimeout: 6000,
  bodyTimeout: 6000,
});

export type EmbedResult = { embeddable: boolean; reason: string; finalUrl?: string };

export function framingAllowed(headers: { get(name: string): string | null }): {
  ok: boolean;
  reason: string;
} {
  const xfo = headers.get("x-frame-options")?.toLowerCase().trim();
  if (xfo && (xfo.includes("deny") || xfo.includes("sameorigin"))) {
    return { ok: false, reason: `X-Frame-Options: ${xfo}` };
  }
  const csp = headers.get("content-security-policy");
  if (csp) {
    const directive = csp
      .split(/[;,]/)
      .map((d) => d.trim().toLowerCase())
      .find((d) => d.startsWith("frame-ancestors"));
    if (directive) {
      const sources = directive.split(/\s+/).slice(1);
      const self = process.env.AUTH_URL ? new URL(process.env.AUTH_URL).host : "";
      const allowsUs =
        sources.includes("*") ||
        sources.includes("https:") ||
        (!!self && sources.some((s) => s.includes(self)));
      if (!allowsUs) return { ok: false, reason: `CSP ${directive}` };
    }
  }
  return { ok: true, reason: "No framing restrictions" };
}

export async function checkEmbeddable(input: string): Promise<EmbedResult> {
  let url = new URL(input);
  for (let hop = 0; hop < 5; hop++) {
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { embeddable: false, reason: "Unsupported protocol" };
    }
    const res = await fetch(url, {
      dispatcher: agent,
      redirect: "manual",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; DailiesEmbedCheck/1.0)",
        accept: "text/html,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });
    // We only need headers; drop the body.
    await res.body?.cancel().catch(() => {});

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      url = new URL(loc, url);
      continue;
    }
    const verdict = framingAllowed(res.headers);
    // http pages can't be framed by an https site (mixed content).
    if (verdict.ok && url.protocol === "http:") {
      return { embeddable: false, reason: "Served over http", finalUrl: url.href };
    }
    return { embeddable: verdict.ok, reason: verdict.reason, finalUrl: url.href };
  }
  return { embeddable: false, reason: "Too many redirects" };
}
