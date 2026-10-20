/**
 * Resize (longest side ≤ `maxSide`) and JPEG-encode a data URL in the browser.
 * Resolves the ORIGINAL data URL on any failure: that is what lets a
 * Safari-decoded HEIC become a JPEG here, and what lets an undecodable file
 * reach the server, which answers with a specific message. The server does
 * the real work (WebP variants); this step only keeps the upload small.
 */
export function compressImage(dataUrl: string, quality = 0.85, maxSide = 2400): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      let width = img.width;
      let height = img.height;
      if (width > maxSide || height > maxSide) {
        const ratio = Math.min(maxSide / width, maxSide / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
