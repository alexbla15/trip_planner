"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, Image as ImageIcon, RotateCcw } from "lucide-react";
import type { PhotoCrop } from "@/lib/photoCrop";
import { isValidCoverUrl } from "./CoverImageField.utils";
import styles from "./CoverImageField.module.css";

const MIN_CROP_FRACTION = 0.15;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function aspectValue(ratio: "4:3" | "16:9"): number {
  return ratio === "16:9" ? 16 / 9 : 4 / 3;
}

/** The largest centered rectangle of `targetAspect` that fits inside a
 *  `naturalW`x`naturalH` photo — the starting crop before the user adjusts anything. */
function centeredCrop(naturalW: number, naturalH: number, targetAspect: number): PhotoCrop {
  const imgAspect = naturalW / naturalH;
  let w: number, h: number;
  if (imgAspect > targetAspect) {
    h = 1;
    w = targetAspect / imgAspect;
  } else {
    w = 1;
    h = imgAspect / targetAspect;
  }
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

/** Where/how big the photo renders inside a `containerW`x`containerH` box under
 *  `object-fit: contain` — the letterboxed rectangle the crop overlay is positioned
 *  against, in pixels. */
function containRect(containerW: number, containerH: number, naturalW: number, naturalH: number) {
  const containerAspect = containerW / containerH;
  const imgAspect = naturalW / naturalH;
  let rw: number, rh: number;
  if (imgAspect > containerAspect) {
    rw = containerW;
    rh = containerW / imgAspect;
  } else {
    rh = containerH;
    rw = containerH * imgAspect;
  }
  return { rw, rh, ox: (containerW - rw) / 2, oy: (containerH - rh) / 2 };
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
  /** The crop rectangle's locked shape — must match whatever real render site this
   *  photo ends up cropped to (`object-fit: cover`) elsewhere in the app, or the crop
   *  tool shapes a rectangle that doesn't match what's actually saved. "4:3" (default)
   *  for attraction/brand photos (AttractionGridCard, AttractionDetailModal,
   *  BrandModal); "16:9" for trip cover photos (TripCard). */
  aspectRatio?: "4:3" | "16:9";
  /** Fractions (0-1) of the photo's own natural width/height. Undefined means no
   *  custom crop — the default browser auto-center `object-fit: cover`. Only
   *  meaningful together with `onCropChange` — without it, the preview is
   *  non-interactive, same as before this feature existed. */
  crop?: PhotoCrop;
  onCropChange?: (crop: PhotoCrop | undefined) => void;
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
  crop,
  onCropChange,
}: CoverImageFieldProps) {
  const showPreview = value !== "" && isValidCoverUrl(value);
  const adjustable = showPreview && !!onCropChange;
  const targetAspect = aspectValue(aspectRatio);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const dragRef = useRef<{ mode: "move" | "resize"; startFx: number; startFy: number; startCrop: PhotoCrop } | null>(null);

  // Tracks the URL that has actually finished loading. Deriving `imgLoaded` from this
  // (rather than resetting a boolean flag via an effect) means the preview automatically
  // hides again the instant `value` changes, with no separate reset step needed.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const imgLoaded = loadedUrl === value;

  useEffect(() => {
    setNaturalSize(null);
  }, [value]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !adjustable) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      // Guard against redundant updates — ResizeObserver can fire with the same size
      // (e.g. once on initial observe(), again after a reflow that didn't actually change
      // this element), and an unconditional setState there is the textbook way to trip
      // React's "Maximum update depth exceeded" if anything downstream of this state
      // feeds back into layout. w/h are plain numbers, so a cheap equality check is enough.
      setContainerSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [adjustable]);

  function captureNaturalSize(img: HTMLImageElement) {
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const w = img.naturalWidth, h = img.naturalHeight;
      setNaturalSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    }
  }

  // A cached image can already be `complete` by the time this ref attaches, in which
  // case the native `load` event never fires again and `onLoad` alone would leave the
  // preview hidden forever. Checking `.complete` here catches that case; `key={value}`
  // below makes this callback re-run for every new URL so the check applies to each
  // pasted value, not just the first.
  const checkAlreadyLoaded = useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0) {
        setLoadedUrl(value);
        captureNaturalSize(img);
      }
    },
    [value]
  );

  const renderRect = useMemo(
    () => (naturalSize && containerSize.w > 0 ? containRect(containerSize.w, containerSize.h, naturalSize.w, naturalSize.h) : null),
    [naturalSize, containerSize]
  );

  const displayCrop = crop ?? (naturalSize ? centeredCrop(naturalSize.w, naturalSize.h, targetAspect) : null);

  function clientToImageFraction(clientX: number, clientY: number): { fx: number; fy: number } | null {
    const containerBox = containerRef.current?.getBoundingClientRect();
    if (!containerBox || !renderRect) return null;
    const localX = clientX - containerBox.left - renderRect.ox;
    const localY = clientY - containerBox.top - renderRect.oy;
    return { fx: localX / renderRect.rw, fy: localY / renderRect.rh };
  }

  function startDrag(e: React.PointerEvent, mode: "move" | "resize") {
    if (!adjustable || !naturalSize || !displayCrop) return;
    e.preventDefault();
    e.stopPropagation();
    if (!crop) onCropChange!(displayCrop); // first touch commits the centered starting crop
    const pt = clientToImageFraction(e.clientX, e.clientY);
    if (!pt) return;
    dragRef.current = { mode, startFx: pt.fx, startFy: pt.fy, startCrop: displayCrop };
    containerRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || !naturalSize) return;
    const pt = clientToImageFraction(e.clientX, e.clientY);
    if (!pt) return;

    if (drag.mode === "move") {
      const { w, h } = drag.startCrop;
      const x = clamp(drag.startCrop.x + (pt.fx - drag.startFx), 0, 1 - w);
      const y = clamp(drag.startCrop.y + (pt.fy - drag.startFy), 0, 1 - h);
      onCropChange!({ x, y, w, h });
    } else {
      const imgAspect = naturalSize.w / naturalSize.h;
      const { x: anchorX, y: anchorY } = drag.startCrop;
      let w = clamp(pt.fx - anchorX, MIN_CROP_FRACTION, 1 - anchorX);
      let h = (w * imgAspect) / targetAspect;
      if (anchorY + h > 1) {
        h = 1 - anchorY;
        w = (h * targetAspect) / imgAspect;
      }
      if (w < MIN_CROP_FRACTION) {
        w = MIN_CROP_FRACTION;
        h = (w * imgAspect) / targetAspect;
      }
      onCropChange!({ x: anchorX, y: anchorY, w, h });
    }
  }

  function endDrag(e: React.PointerEvent) {
    dragRef.current = null;
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // already released (e.g. pointer left the window) — nothing to do
    }
  }

  const rectPx = renderRect && displayCrop
    ? {
        left: renderRect.ox + displayCrop.x * renderRect.rw,
        top: renderRect.oy + displayCrop.y * renderRect.rh,
        width: displayCrop.w * renderRect.rw,
        height: displayCrop.h * renderRect.rh,
      }
    : null;

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
            ref={containerRef}
            className={`${styles.preview} ${adjustable ? styles.previewCrop : (aspectRatio === "16:9" ? styles.preview169 : styles.preview43)}`}
            aria-label="Cover photo preview"
            onPointerMove={adjustable ? handlePointerMove : undefined}
            onPointerUp={adjustable ? endDrag : undefined}
            onPointerCancel={adjustable ? endDrag : undefined}
          >
            <Image
              key={value}
              ref={checkAlreadyLoaded}
              src={value}
              alt="Cover photo preview"
              fill
              draggable={false}
              className={`${styles.previewImg} ${adjustable ? styles.previewImgContain : styles.previewImgCover}${imgLoaded ? ` ${styles.previewImgLoaded}` : ""}`}
              sizes="(max-width: 640px) 100vw, 480px"
              unoptimized
              loading="eager"
              onLoad={(e) => { setLoadedUrl(value); captureNaturalSize(e.currentTarget); }}
              onError={() => setLoadedUrl((prev) => (prev === value ? null : prev))}
            />
            {adjustable && imgLoaded && rectPx && (
              <div
                className={styles.cropRect}
                style={{ left: rectPx.left, top: rectPx.top, width: rectPx.width, height: rectPx.height }}
                onPointerDown={(e) => startDrag(e, "move")}
                role="group"
                aria-label="Crop area — drag to reposition, drag the corner handle to resize"
                tabIndex={0}
              >
                <div
                  className={styles.cropHandle}
                  onPointerDown={(e) => startDrag(e, "resize")}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          {adjustable && imgLoaded && (
            <div className={styles.focalHintRow}>
              <p className={styles.hint}>
                Drag the box to reposition, or its corner handle to resize — only what&apos;s inside it will show once cropped.
              </p>
              {crop && (
                <button
                  type="button"
                  className={styles.resetFocalBtn}
                  onClick={() => onCropChange!(undefined)}
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
