"use client";

import { AlertCircle } from "lucide-react";
import styles from "./FormFieldError.module.css";

export interface FormFieldErrorProps {
  /** Id referenced by the field's `aria-describedby`. */
  id: string;
  /** Error message to show. Nothing renders when this is falsy. */
  message: string | null | undefined;
}

/** Shared inline field-level validation error, paired with a form input via `aria-describedby`. */
export function FormFieldError({ id, message }: FormFieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} className={styles.fieldError} role="alert">
      <AlertCircle size={12} aria-hidden="true" />
      {message}
    </p>
  );
}
