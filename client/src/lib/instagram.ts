const POST_URL = /^https:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)\/?(?:[?#].*)?$/;

/** Embed URL for a public post or reel link; null for anything else. */
export function instagramEmbedUrl(postUrl: string): string | null {
  const match = POST_URL.exec(postUrl.trim());
  return match ? `https://www.instagram.com/p/${match[1]}/embed` : null;
}
