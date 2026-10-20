import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "vitest";
import { processImage } from "./imagePipeline";
import { ensureOgJpeg, pendingOgJobs } from "./ogImage";

test("concurrent first requests share one conversion, write atomically, and leave a valid cached JPEG", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eps-og-"));
  const processed = await processImage(
    await sharp({ create: { width: 1600, height: 1000, channels: 3, background: "#123" } }).png().toBuffer(),
    dir
  );
  const uuid = /\/uploads\/([0-9a-f-]{36})-/.exec(processed.url)![1];

  const a = ensureOgJpeg(uuid, dir);
  const b = ensureOgJpeg(uuid, dir);
  expect(pendingOgJobs()).toBe(1);
  const [pa, pb] = await Promise.all([a, b]);
  expect(pa).toBe(pb);
  expect(pendingOgJobs()).toBe(0);

  const ogDir = path.join(dir, "og");
  expect(fs.readdirSync(ogDir)).toEqual([`${uuid}.jpg`]); // no .tmp leftovers, one file
  const meta = await sharp(pa!).metadata();
  expect([meta.format, meta.width]).toEqual(["jpeg", 1200]);

  // second call is a cache hit
  expect(await ensureOgJpeg(uuid, dir)).toBe(pa);
  expect(await ensureOgJpeg("00000000-0000-0000-0000-000000000000", dir)).toBeNull();
  expect(await ensureOgJpeg("../etc", dir)).toBeNull();
});
