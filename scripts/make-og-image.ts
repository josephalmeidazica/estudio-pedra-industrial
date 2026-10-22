// Generates client/public/og-default.jpg (1200x630): the beige signature centred
// on brand black. Run with `npm run og:image` after changing the logo. The
// result is committed, so production never generates images at boot.
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const LOGO = path.join(ROOT, "client", "public", "brand", "assinatura-bege.png");
const OUT = path.join(ROOT, "client", "public", "og-default.jpg");
const WIDTH = 1200;
const HEIGHT = 630;
const LOGO_HEIGHT = 300;
const BACKGROUND = "#000000";

async function main() {
  const logo = await sharp(LOGO)
    .resize({ height: LOGO_HEIGHT, fit: "inside" })
    .png()
    .toBuffer();
  const info = await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: BACKGROUND } })
    .composite([{ input: logo, gravity: "centre" }])
    .jpeg({ quality: 90 })
    .toFile(OUT);
  console.log(`${OUT}: ${info.width}x${info.height} ${info.format}, ${Math.round(info.size / 1024)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
