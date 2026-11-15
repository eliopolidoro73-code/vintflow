#!/usr/bin/env node
/** Vérifie robots / sitemap sur l'URL passée en argument. */
const origin = process.argv[2]?.replace(/\/$/, "");
if (!origin) {
  console.error("Usage: node scripts/check-seo-headers.mjs https://vintflow.io");
  process.exit(1);
}

async function head(path) {
  const res = await fetch(`${origin}${path}`, { redirect: "follow" });
  return {
    path,
    status: res.status,
    robots: res.headers.get("x-robots-tag"),
    type: res.headers.get("content-type"),
  };
}

const rows = await Promise.all([
  head("/"),
  head("/robots.txt"),
  head("/sitemap.xml"),
  head("/google69a22bc60fd55e06.html"),
]);

console.table(rows);
const home = rows[0];
if (home.robots?.toLowerCase().includes("noindex")) {
  console.error(
    "\nBloquant SEO: X-Robots-Tag contient noindex. Branche le domaine vintflow.io sur l'app Cursor.",
  );
  process.exit(2);
}
console.log("\nOK pour demander l'indexation Google sur cette origine.");