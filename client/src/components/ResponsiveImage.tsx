import { buildSrcSet, hasDimensions, type ImageLike } from "@/lib/imageSrcSet";

export { CARD_SIZES } from "@/lib/imageSrcSet";

type Props = {
  image: ImageLike;
  /** The `sizes` attribute: how wide the image renders at each breakpoint. */
  sizes: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
};

/** `<img>` with srcset/sizes from the variant map; legacy rows fall back to `url`. */
export function ResponsiveImage({ image, sizes, alt, className, loading }: Props) {
  const known = hasDimensions(image);
  return (
    <img
      src={image.url}
      srcSet={buildSrcSet(image)}
      sizes={sizes}
      width={known ? image.width : undefined}
      height={known ? image.height : undefined}
      alt={alt}
      loading={loading}
      className={className}
    />
  );
}
