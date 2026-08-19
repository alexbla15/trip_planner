import { ExternalLink } from "lucide-react";
import type { WebsiteLinkButtonProps } from "./WebsiteLinkButton.types";
import styles from "./WebsiteLinkButton.module.css";

/** "Visit website" navigation button for an attraction's official site. Renders nothing
 *  when `url` is unset — every call site can render this unconditionally. */
export function WebsiteLinkButton({ url, variant = "full", className }: WebsiteLinkButtonProps) {
  if (!url) return null;

  if (variant === "compact") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.compact} ${className ?? ""}`}
        aria-label="Visit official website"
        title="Visit official website"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink size={16} aria-hidden="true" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.full} ${className ?? ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink size={14} aria-hidden="true" />
      Website
    </a>
  );
}
