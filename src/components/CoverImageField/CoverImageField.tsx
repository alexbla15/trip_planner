"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { AlertCircle, Image as ImageIcon } from "lucide-react";
import { isValidCoverUrl } from "./CoverImageField.utils";
import styles from "./CoverImageField.module.css";

interface CoverImageFieldProps {
  id: string;
  label?: string;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
}

export function CoverImageField({
  id,
  label = "Cover photo",
  hint = "Paste a direct image URL (e.g. from Unsplash)",
  placeholder = "https://…",
  value,
  onChange,
  onBlur,
  error,
}: CoverImageFieldProps) {
  const showPreview = value !== "" && isValidCoverUrl(value);

  // Tracks the URL that has actually finished loading. Deriving `imgLoaded`
  // from this (rather than resetting a boolean flag via an effect) means the
  // preview automatically hides again the instant `value` changes, with no
  // separate reset step needed.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const imgLoaded = loadedUrl === value;

  // A cached image can already be `complete` by the time this ref attaches,
  // in which case the native `load` event never fires again and `onLoad`
  // alone would leave the preview hidden forever. Checking `.complete` here
  // catches that case; `key={value}` below makes this callback re-run for
  // every new URL so the check applies to each pasted value, not just the
  // first.
  const checkAlreadyLoaded = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0) {
        setLoadedUrl(value);
      }
    },
    [value]
  );

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        <ImageIcon size={14} aria-hidden="true" />
        {label}
      </label>
      <p className={styles.hint}>{hint}</p>
      <input
        id={id}
        type="url"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`${styles.input}${error ? ` ${styles.inputError}` : ""}`}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className={styles.errorMsg} role="alert">
          <AlertCircle size={12} aria-hidden="true" />
          {error}
        </p>
      )}
      {showPreview && (
        <div
          className={styles.preview}
          aria-live="polite"
          aria-label="Cover photo preview"
        >
          <Image
            key={value}
            ref={checkAlreadyLoaded}
            src={value}
            alt="Cover photo preview"
            fill
            className={`${styles.previewImg}${imgLoaded ? ` ${styles.previewImgLoaded}` : ""}`}
            sizes="(max-width: 640px) 100vw, 480px"
            unoptimized
            loading="eager"
            onLoad={() => setLoadedUrl(value)}
            onError={() => setLoadedUrl((prev) => (prev === value ? null : prev))}
          />
        </div>
      )}
    </div>
  );
}
