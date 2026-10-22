import { expect, test } from "vitest";
import { instagramEmbedUrl } from "./instagram";
test("post and reel urls → embed url; others → null", () => {
  expect(instagramEmbedUrl("https://www.instagram.com/p/Cx1Ab2/?img_index=1")).toBe("https://www.instagram.com/p/Cx1Ab2/embed");
  expect(instagramEmbedUrl("https://instagram.com/reel/Zz9/")).toBe("https://www.instagram.com/p/Zz9/embed");
  expect(instagramEmbedUrl("https://instagram.com/estudio.pedraindustrial")).toBeNull();
});
