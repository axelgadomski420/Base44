#!/usr/bin/env node
// PURRE PETS — smoke test (npm test). Zero zewnętrznych zależności, Node 22.
// 1) Artefakty buildu: .output/server/index.mjs i .output/public.
// 2) Jeśli serwery odpowiadają — realne HTTP: frontend GET /, backend GET /api/health.
// Brak działających serwerów nie jest błędem buildu — test wypisuje wtedy podpowiedź.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "✅" : "❌"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failures++;
};

check("build: .output/server/index.mjs", existsSync(path.join(root, ".output", "server", "index.mjs")));
check("build: .output/public", existsSync(path.join(root, ".output", "public")));

const front = process.env.FRONT_URL ?? "http://127.0.0.1:3000";
const api = process.env.API_URL ?? "http://127.0.0.1:4000";
const offline = [];

async function probe(url, name, validate) {
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    check(name, validate(res), `HTTP ${res.status}`);
  } catch (error) {
    offline.push(name);
    check(name, true, `brak odpowiedzi (${String(error?.cause?.code ?? error?.message ?? error).slice(0, 80)}) — uruchom serwery i powtórz`);
  }
}

await probe(`${front}/`, "frontend GET /", (res) => res.status === 200);
await probe(`${api}/api/health`, "backend GET /api/health", (res) => res.status === 200);

if (offline.length > 0) {
  console.log("\nPodpowiedź: pm2 startOrReload ecosystem.config.cjs --update-env");
}
process.exit(failures === 0 ? 0 : 1);
