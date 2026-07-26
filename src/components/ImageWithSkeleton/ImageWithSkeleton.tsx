"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./ImageWithSkeleton.module.css";
import type { ImageWithSkeletonProps } from "./ImageWithSkeleton.types";

export function ImageWithSkeleton({ className, wrapperClassName, ...imageProps }: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={`${styles.wrapper}${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
      {!loaded && <span className={styles.skeleton} aria-hidden="true" />}
      <Image
        {...imageProps}
        className={`${styles.image}${loaded ? ` ${styles.imageLoaded}` : ""}${className ? ` ${className}` : ""}`}
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}
