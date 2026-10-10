// One-off: rasterize public/icon.svg into the PNG sizes the manifest and iOS
// need. Uses the `sharp` that ships with Next (no extra dependency). Re-run with
// `node scripts/gen-icons.mjs` whenever icon.svg changes; the PNGs are committed.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const svg = await readFile(path.join(pub, "icon.svg"));

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  const png = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain" })
    .png()
    .toBuffer();
  await writeFile(path.join(pub, file), png);
  console.log(`wrote public/${file} (${size}x${size})`);
}
