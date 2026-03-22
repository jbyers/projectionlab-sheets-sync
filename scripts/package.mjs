import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const chromeDir = join(root, "chrome");
const mdFiles = readdirSync(root)
  .filter((f) => f.endsWith(".md"))
  .map((f) => join(root, f));

const manifest = JSON.parse(
  readFileSync(join(chromeDir, "manifest.json"), "utf8"),
);
const { version } = manifest;

mkdirSync(join(root, "releases"), { recursive: true });

function zip(zipPath, sourceDir, extraFiles = []) {
  const files = readdirSync(sourceDir).map((f) => join(sourceDir, f));
  const args = [...files, ...extraFiles].map((f) => `"${f}"`).join(" ");
  execSync(`zip -j "${zipPath}" ${args}`);
  console.log(`Created ${zipPath}`);
}

// chrome-X.Y.Z.zip: chrome/ files + *.md
zip(join(root, `releases/chrome-${version}.zip`), chromeDir, mdFiles);

// ProjectionLab-Sheets-Sync-X.Y.Z.zip: same but manifest has <all_urls> in host_permissions
const tmpDir = join(root, ".tmp-package");
mkdirSync(tmpDir, { recursive: true });
try {
  for (const file of readdirSync(chromeDir)) {
    copyFileSync(join(chromeDir, file), join(tmpDir, file));
  }
  const allUrlsManifest = structuredClone(manifest);
  allUrlsManifest.host_permissions = ["<all_urls>"];
  writeFileSync(
    join(tmpDir, "manifest.json"),
    `${JSON.stringify(allUrlsManifest, null, 2)}\n`,
  );
  zip(
    join(root, `releases/ProjectionLab-Sheets-Sync-${version}.zip`),
    tmpDir,
    mdFiles,
  );
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
