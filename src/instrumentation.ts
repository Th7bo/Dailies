export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_BOOTSTRAP === "1") return;

  const { runMigrations, seedCatalog, refreshEmbedChecks } = await import("./db/bootstrap");
  try {
    await runMigrations();
    await seedCatalog();
    console.log("[bootstrap] migrations applied, catalog seeded");
  } catch (err) {
    console.error("[bootstrap] failed:", err);
    return;
  }

  // Embed checks hit the network; run them in the background, then daily.
  const tick = () =>
    refreshEmbedChecks()
      .then((n) => n && console.log(`[bootstrap] embed-checked ${n} games`))
      .catch((e) => console.error("[bootstrap] embed check failed:", e));
  void tick();
  setInterval(tick, 24 * 60 * 60 * 1000).unref();
}
