"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./ImageWithSkeleton.module.css";
import type { ImageWithSkeletonProps } from "./ImageWithSkeleton.types";

/** Wraps `next/image` with a shimmer skeleton shown until the image's `onLoad` fires, then fades the image in. Supports both `fill` and `width`/`height` usage. */
export function ImageWithSkeleton({ className, wrapperClassName, ...imageProps }: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={`${styles.wrapper}${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
      {!loaded && <span className={styles.skeleton} aria-hidden="true" />}
      <Image
        loading="eager"
        {...imageProps}
        className={`${styles.image}${loaded ? ` ${styles.imageLoaded}` : ""}${className ? ` ${className}` : ""}`}
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}
