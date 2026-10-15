"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, Image as ImageIcon, Crosshair, RotateCcw } from "lucide-react";
import { isValidCoverUrl } from "./CoverImageField.utils";
import styles from "./CoverImageField.module.css";

export interface FocalPoint {
  x: number;
  y: number;
}

interface CoverImageFieldProps {
  id: string;
  label?: string;
  /** Suppress the built-in label (e.g. when an outer collapsible section header
   *  already names this field — see NewAttractionModal's Photo section). */
  hideLabel?: boolean;
  hint?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  /** Preview crop ratio — must match whatever real render site this photo ends up
   *  cropped to (`object-fit: cover`) elsewhere in the app, or the focal-point
   *  adjustment below previews a different crop than what's actually saved. "4:3"
   *  (default) for attraction/brand photos (AttractionGridCard, AttractionDetailModal,
   *  BrandModal); "16:9" for trip cover photos (TripCard). */
  aspectRatio?: "4:3" | "16:9";
  /** Normalized 0-100 percentages anchoring where the photo is cropped to everywhere
   *  else in the app renders it at a fixed aspect ratio (the card grid, detail modal —
   *  all `object-fit: cover`). Undefined/omitted means the default center crop. Only
   *  meaningful together with `onFocalPointChange` — without it, the preview is
   *  non-interactive, same as before this feature existed. */
  focalPoint?: FocalPoint;
  onFocalPointChange?: (point: FocalPoint | undefined) => void;
}

export function CoverImageField({
  id,
  label = "Cover photo",
  hideLabel = false,
  hint = "Paste a direct image URL (e.g. from Unsplash)",
  placeholder = "https://…",
  value,
  onChange,
  onBlur,
  error,
  aspectRatio = "4:3",
  focalPoint,
  onFocalPointChange,
}: CoverImageFieldProps) {
  const showPreview = value !== "" && isValidCoverUrl(value);
  const adjustable = showPreview && !!onFocalPointChange;
  const previewRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

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

  const objectPosition = focalPoint ? `${focalPoint.x}% ${focalPoint.y}%` : undefined;

  function pointFromEvent(e: { clientX: number; clientY: number }): FocalPoint | null {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x), y: Math.round(y) };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!adjustable) return;
    e.preventDefault(); // stop the browser starting its own native image-drag gesture,
    // which would swallow every pointermove after this and make dragging look like it
    // does nothing — capture happens on currentTarget (this div), not target (which,
    // when the pointer lands on the <img>, would be the image element instead).
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = pointFromEvent(e);
    if (point) onFocalPointChange!(point);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!adjustable || !draggingRef.current) return;
    const point = pointFromEvent(e);
    if (point) onFocalPointChange!(point);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div className={styles.field}>
      {!hideLabel && (
        <label htmlFor={id} className={styles.label}>
          <ImageIcon size={14} aria-hidden="true" />
          {label}
        </label>
      )}
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
        <>
          <div
            ref={previewRef}
            className={`${styles.preview} ${aspectRatio === "16:9" ? styles.preview169 : styles.preview43}${adjustable ? ` ${styles.previewAdjustable}` : ""}`}
            aria-live="polite"
            aria-label="Cover photo preview"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <Image
              key={value}
              ref={checkAlreadyLoaded}
              src={value}
              alt="Cover photo preview"
              fill
              draggable={false}
              className={`${styles.previewImg}${imgLoaded ? ` ${styles.previewImgLoaded}` : ""}`}
              style={objectPosition ? { objectPosition } : undefined}
              sizes="(max-width: 640px) 100vw, 480px"
              unoptimized
              loading="eager"
              onLoad={() => setLoadedUrl(value)}
              onError={() => setLoadedUrl((prev) => (prev === value ? null : prev))}
            />
            {adjustable && imgLoaded && (
              <div
                className={styles.focalMarker}
                style={{ left: `${focalPoint?.x ?? 50}%`, top: `${focalPoint?.y ?? 50}%` }}
                aria-hidden="true"
              >
                <Crosshair size={18} />
              </div>
            )}
          </div>
          {adjustable && imgLoaded && (
            <div className={styles.focalHintRow}>
              <p className={styles.hint}>
                Doesn&apos;t fit the frame? Click or drag on the preview to choose which part stays visible when it&apos;s cropped.
              </p>
              {focalPoint && (
                <button
                  type="button"
                  className={styles.resetFocalBtn}
                  onClick={() => onFocalPointChange!(undefined)}
                >
                  <RotateCcw size={12} aria-hidden="true" />
                  Reset
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
