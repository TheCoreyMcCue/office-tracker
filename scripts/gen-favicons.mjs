import sharp from "../node_modules/sharp/lib/index.js";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// SVG source: 512x512, dark indigo background, white office building
const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#312e81;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e1b4b;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="512" height="512" fill="url(#bg)" />

  <!-- Main building body -->
  <rect x="136" y="196" width="240" height="220" fill="white" opacity="0.95" />

  <!-- Building roof / upper section -->
  <rect x="176" y="144" width="160" height="60" fill="white" opacity="0.95" />

  <!-- Door -->
  <rect x="220" y="336" width="72" height="80" fill="#312e81" />

  <!-- Windows row 1 (upper section) -->
  <rect x="196" y="160" width="30" height="28" rx="2" fill="#6366f1" />
  <rect x="241" y="160" width="30" height="28" rx="2" fill="#6366f1" />
  <rect x="286" y="160" width="30" height="28" rx="2" fill="#6366f1" />

  <!-- Windows row 2 -->
  <rect x="152" y="220" width="30" height="28" rx="2" fill="#6366f1" />
  <rect x="197" y="220" width="30" height="28" rx="2" fill="#6366f1" />
  <rect x="242" y="220" width="30" height="28" rx="2" fill="#6366f1" />
  <rect x="287" y="220" width="30" height="28" rx="2" fill="#6366f1" />
  <rect x="332" y="220" width="30" height="28" rx="2" fill="#6366f1" />

  <!-- Windows row 3 -->
  <rect x="152" y="268" width="30" height="28" rx="2" fill="#6366f1" />
  <rect x="197" y="268" width="30" height="28" rx="2" fill="#6366f1" />
  <rect x="287" y="268" width="30" height="28" rx="2" fill="#6366f1" />
  <rect x="332" y="268" width="30" height="28" rx="2" fill="#6366f1" />

  <!-- Windows row 4 -->
  <rect x="152" y="316" width="30" height="28" rx="2" fill="#6366f1" />
  <rect x="197" y="316" width="30" height="28" rx="2" fill="#6366f1" />
  <rect x="287" y="316" width="30" height="28" rx="2" fill="#6366f1" />
  <rect x="332" y="316" width="30" height="28" rx="2" fill="#6366f1" />
</svg>`;

const svgBuffer = Buffer.from(svgString);

async function generatePng(size) {
  return sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toBuffer();
}

// Build a valid ICO file from PNG buffers
// ICO format: 6-byte header + N*16-byte directory + PNG data
function buildIco(entries) {
  // entries: array of { size, pngBuffer }
  const count = entries.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataOffset = headerSize + count * dirEntrySize;

  // Compute total size
  let totalDataSize = 0;
  const offsets = [];
  for (const entry of entries) {
    offsets.push(dataOffset + totalDataSize);
    totalDataSize += entry.pngBuffer.length;
  }

  const buf = Buffer.alloc(dataOffset + totalDataSize);
  let pos = 0;

  // Header
  buf.writeUInt16LE(0, pos); pos += 2;       // reserved = 0
  buf.writeUInt16LE(1, pos); pos += 2;       // type = 1 (ICO)
  buf.writeUInt16LE(count, pos); pos += 2;   // count

  // Directory entries
  for (let i = 0; i < entries.length; i++) {
    const { size, pngBuffer } = entries[i];
    const w = size >= 256 ? 0 : size;
    const h = size >= 256 ? 0 : size;
    buf.writeUInt8(w, pos); pos += 1;            // width (0 = 256)
    buf.writeUInt8(h, pos); pos += 1;            // height
    buf.writeUInt8(0, pos); pos += 1;            // color count
    buf.writeUInt8(0, pos); pos += 1;            // reserved
    buf.writeUInt16LE(1, pos); pos += 2;         // planes
    buf.writeUInt16LE(32, pos); pos += 2;        // bit count
    buf.writeUInt32LE(pngBuffer.length, pos); pos += 4; // size in bytes
    buf.writeUInt32LE(offsets[i], pos); pos += 4;       // offset to data
  }

  // PNG data
  for (const { pngBuffer } of entries) {
    pngBuffer.copy(buf, pos);
    pos += pngBuffer.length;
  }

  return buf;
}

async function main() {
  console.log("Generating favicon assets...");

  const sizes = {
    16: null,
    32: null,
    48: null,
    180: null,
    192: null,
    512: null,
  };

  for (const size of Object.keys(sizes)) {
    sizes[size] = await generatePng(Number(size));
    console.log(`  Generated ${size}x${size} PNG`);
  }

  // public/ directory
  const pub = join(root, "public");
  mkdirSync(pub, { recursive: true });

  writeFileSync(join(pub, "favicon-16x16.png"), sizes[16]);
  console.log("  Saved public/favicon-16x16.png");

  writeFileSync(join(pub, "favicon-32x32.png"), sizes[32]);
  console.log("  Saved public/favicon-32x32.png");

  writeFileSync(join(pub, "apple-touch-icon.png"), sizes[180]);
  console.log("  Saved public/apple-touch-icon.png");

  writeFileSync(join(pub, "icon-192.png"), sizes[192]);
  console.log("  Saved public/icon-192.png");

  writeFileSync(join(pub, "icon-512.png"), sizes[512]);
  console.log("  Saved public/icon-512.png");

  // src/app/favicon.ico — multi-size ICO with 16 and 32
  const icoBuffer = buildIco([
    { size: 16, pngBuffer: sizes[16] },
    { size: 32, pngBuffer: sizes[32] },
    { size: 48, pngBuffer: sizes[48] },
  ]);
  writeFileSync(join(root, "src", "app", "favicon.ico"), icoBuffer);
  console.log("  Saved src/app/favicon.ico");

  // site.webmanifest
  const manifest = {
    name: "Office Tracker",
    short_name: "Office Tracker",
    description: "Track your in-office days against the 60% policy",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: "#312e81",
    background_color: "#020617",
    display: "standalone",
    start_url: "/",
  };
  writeFileSync(join(pub, "site.webmanifest"), JSON.stringify(manifest, null, 2));
  console.log("  Saved public/site.webmanifest");

  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
