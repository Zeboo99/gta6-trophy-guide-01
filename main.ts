// Sunset Ledger — entrypoint for make.fun's "Build the best GTA 6 trophy guide".
// Copies app/ and screenshots/ into the output directory and writes
// /output/dossier.json with buildDossier from vendor/makefun-frontend.ts.
// Node 22, standard library only; no network. Run twice and both runs
// must write the same bytes.
import { buildDossier } from "./vendor/makefun-frontend.ts";
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || "/output";

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  max_bytes: 1572864,
  max_images: 4,
  index_html_max_bytes: 1048576
};

function countEntries(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const info = statSync(full);
    total += 1;
    if (info.isDirectory()) total += countEntries(full);
  }
  return total;
}

async function main(): Promise<void> {
  const appDir = join(REPO_ROOT, "app");
  const shotsDir = join(REPO_ROOT, "screenshots");
  if (!existsSync(appDir)) throw new Error("app/ is missing from the repository");
  if (!existsSync(shotsDir)) throw new Error("screenshots/ is missing from the repository");

  mkdirSync(OUT_DIR, { recursive: true });
  cpSync(appDir, join(OUT_DIR, "app"), { recursive: true });
  cpSync(shotsDir, join(OUT_DIR, "screenshots"), { recursive: true });

  const dossier = await buildDossier(REPO_ROOT, DOSSIER_CAPS);
  // buildDossier returns the dossier as bytes; write them exactly as given.
  const dossierBytes = dossier instanceof Uint8Array ? dossier : Buffer.from(String(dossier));
  writeFileSync(join(OUT_DIR, "dossier.json"), dossierBytes);

  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith("."));
  console.log(
    "sunset-ledger: wrote " +
      countEntries(join(OUT_DIR, "app")) +
      " app entries, " +
      shots.length +
      " screenshots, dossier " +
      dossierBytes.byteLength +
      " bytes to " +
      OUT_DIR
  );
}

await main();
