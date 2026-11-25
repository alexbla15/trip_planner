"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./ImageWithSkeleton.module.css";
import type { ImageWithSkeletonProps } from "./ImageWithSkeleton.types";

/** Wraps `next/image` with a shimmer skeleton shown until the image's `onLoad` fires, then fades the image in. Supports both `fill` and `width`/`height` usage. If the image fails to load, the skeleton is cleared and the broken image is hidden; `onLoadError` lets the parent swap in its own fallback. */
export function ImageWithSkeleton({ className, wrapperClassName, onLoadError, onError, ...imageProps }: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const settled = loaded || errored;

  return (
    <span className={`${styles.wrapper}${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
      {!settled && <span className={styles.skeleton} aria-hidden="true" />}
      <Image
        loading="eager"
        {...imageProps}
        className={`${styles.image}${loaded ? ` ${styles.imageLoaded}` : ""}${errored ? ` ${styles.imageErrored}` : ""}${className ? ` ${className}` : ""}`}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setErrored(true);
          onError?.(e);
          onLoadError?.();
        }}
      />
    </span>
  );
}
