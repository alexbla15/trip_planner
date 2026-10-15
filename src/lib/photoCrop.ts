import type { CSSProperties } from "react";

export interface PhotoCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Turns a stored crop (fractions 0-1 of the photo's own natural width/height) into the
 *  inline style that reproduces it on an absolutely-positioned `<img>`/`fill`-mode
 *  `next/image` sitting in an `overflow: hidden` container of the target aspect ratio.
 *
 *  The trick: scale the whole image up by 1/w horizontally and 1/h vertically, then
 *  shift it left/up by the crop's own offset at that same scale, so exactly the cropped
 *  rectangle fills the container. Because w/h are locked to the container's aspect ratio
 *  at crop time (see CoverImageField), this box's width/height ratio always comes out
 *  equal to the photo's own natural aspect ratio — i.e. the full, undistorted photo,
 *  scaled and shifted, never stretched. `object-fit` is irrelevant once width/height are
 *  set explicitly like this, but `fill` is set anyway as a harmless no-op safeguard.
 *
 *  Returns undefined when there's no custom crop — callers should fall back to a plain
 *  `object-fit: cover` class in that case (the pre-crop default, unchanged). */
export function photoCropStyle(crop: PhotoCrop | null | undefined): CSSProperties | undefined {
  if (!crop || crop.w <= 0 || crop.h <= 0) return undefined;
  return {
    position: "absolute",
    width: `${100 / crop.w}%`,
    height: `${100 / crop.h}%`,
    left: `${(-100 * crop.x) / crop.w}%`,
    top: `${(-100 * crop.y) / crop.h}%`,
    objectFit: "fill",
    maxWidth: "none",
  };
}
