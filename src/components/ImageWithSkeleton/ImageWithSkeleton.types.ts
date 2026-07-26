import type { ImageProps } from "next/image";

/** Props for {@link ImageWithSkeleton} — accepts every `next/image` prop except `onLoad`, which the component uses internally to drive the skeleton/fade state. */
export interface ImageWithSkeletonProps extends Omit<ImageProps, "onLoad"> {
  /** Extra class applied to the positioning wrapper (not the <img> itself). */
  wrapperClassName?: string;
}
