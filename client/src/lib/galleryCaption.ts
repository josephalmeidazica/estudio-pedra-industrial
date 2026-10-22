/** Caption as typed, plus the linked piece name unless the caption already mentions it. */
export function galleryCaption(caption: string, productName: string | undefined): string {
  if (!productName) return caption;
  if (!caption) return productName;
  return caption.toLowerCase().includes(productName.toLowerCase()) ? caption : `${caption} · ${productName}`;
}
