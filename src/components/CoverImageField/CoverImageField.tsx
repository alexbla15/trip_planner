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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Cover photo preview"
            className={styles.previewImg}
            onLoad={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "block";
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
    </div>
  );
}
