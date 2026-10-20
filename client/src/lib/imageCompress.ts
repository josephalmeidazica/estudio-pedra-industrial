export type CompressResult = {
  /** JPEG data URL when the browser could decode the image; the original data URL otherwise. */
  dataUrl: string;
  /** False when the browser could not decode the image at all (e.g. HEIC outside Safari). */
  decoded: boolean;
};

/**
 * Resize (longest side ≤ `maxSide`) and JPEG-encode a data URL in the browser.
 * Resolves the ORIGINAL data URL with `decoded: false` when the browser cannot
 * decode it, so the caller can try a HEIC conversion or let the server answer
 * with its specific message. The server does the real work (WebP variants);
 * this step only keeps the upload small.
 */
export function compressImage(dataUrl: string, quality = 0.85, maxSide = 2400): Promise<CompressResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve({ dataUrl, decoded: true });
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
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", quality), decoded: true });
    };
    img.onerror = () => resolve({ dataUrl, decoded: false });
    img.src = dataUrl;
  });
}
