"use client";

import { useState, type ReactNode } from "react";
import { Check, X as XIcon, Loader2, AlertCircle } from "lucide-react";
import { ApiError } from "@/services";
import styles from "./AdminClient.module.css";

interface AdminEntityFormProps {
  /** Returns a validation error message, or null if the form is valid. Checked before `onSave`. */
  validate: () => string | null;
  /** Performs the create/update API call and any cache invalidation. Throw to surface an error. */
  onSave: () => Promise<void>;
  /** Called after `onSave` resolves successfully. */
  onDone: () => void;
  onCancel: () => void;
  /** Whether this form is editing an existing record (vs. creating a new one) — drives button/error copy. */
  isEditing: boolean;
  /** The field inputs, rendered inside the shared form-card/grid shell. */
  children: ReactNode;
}

/** Shared card/validation/save-state shell for the admin CRUD forms (attraction types,
 *  categories, mood tags) — each caller only supplies its own field inputs and save logic. */
export function AdminEntityForm({ validate, onSave, onDone, onCancel, isEditing, children }: AdminEntityFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave();
    } catch (err) {
      const body = err instanceof ApiError ? (err.body as { error?: string } | null) : null;
      setError(body?.error ?? (isEditing ? "Failed to update" : "Failed to create"));
      setSaving(false);
      return;
    }
    onDone();
  }

  return (
    <div className={styles.formCard}>
      <div className={styles.formGrid}>{children}</div>

      {error && (
        <p className={styles.formError}>
          <AlertCircle size={13} aria-hidden="true" /> {error}
        </p>
      )}

      <div className={styles.formActions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
          <XIcon size={14} /> Cancel
        </button>
        <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className={styles.spin} /> : <Check size={14} />}
          {isEditing ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );
}
