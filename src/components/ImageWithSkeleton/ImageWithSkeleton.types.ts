import type { ImageProps } from "next/image";

export interface ImageWithSkeletonProps extends Omit<ImageProps, "onLoad"> {
  /** Extra class applied to the positioning wrapper (not the <img> itself). */
  wrapperClassName?: string;
}
