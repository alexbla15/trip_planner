"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plane, Lock, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { resetPassword, type ResetPasswordResponse } from "@/services";
import { validateResetPasswordForm } from "@/lib";
import { FormErrorBanner, FormFieldError, Spinner } from "@/components";
import styles from "./ResetPasswordClient.module.css";

type ViewState = "form" | "success" | "invalid";

export function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [view, setView] = useState<ViewState>(token ? "form" : "invalid");

  const newPasswordId = useId();
  const confirmPasswordId = useId();

  const errors = validateResetPasswordForm(newPassword, confirmPassword);
  const isValid = Object.keys(errors).length === 0;

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ newPassword: true, confirmPassword: true });
    if (!isValid || !token) return;

    setLoading(true);
    setApiError("");

    try {
      const res = await resetPassword(token, newPassword);
      const data = await res.json() as ResetPasswordResponse;

      if (!res.ok) {
        if (data.code === "INVALID_TOKEN") {
          setView("invalid");
        } else {
          setApiError(data.error ?? "Failed to reset password. Please try again.");
        }
        return;
      }

      setView("success");
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo} aria-label="TripPlanner">
          <Plane size={20} className={styles.logoIcon} aria-hidden="true" />
          <span className={styles.logoName}>TripPlanner</span>
        </div>

        {view === "invalid" && (
          <div role="alert">
            <div className={`${styles.iconCircle} ${styles.iconCircleError}`} aria-hidden="true">
              <AlertCircle size={24} />
            </div>
            <h1 className={styles.heading}>Invalid reset link</h1>
            <p className={styles.subheading}>
              This password reset link is invalid or has expired. Request a new one.
            </p>
            <p className={styles.switchText}>
              <Link href="/forgot-password" className={styles.switchLink}>
                Request a new link
              </Link>
            </p>
          </div>
        )}

        {view === "success" && (
          <div role="status">
            <div className={styles.iconCircle} aria-hidden="true">
              <Check size={24} />
            </div>
            <h1 className={styles.heading}>Password updated</h1>
            <p className={styles.subheading}>You can now sign in with your new password.</p>
            <Link href="/login" className={styles.submitBtn}>
              Sign in
            </Link>
          </div>
        )}

        {view === "form" && (
          <>
            <h1 className={styles.heading}>Choose a new password</h1>
            <p className={styles.subheading}>Enter and confirm your new password</p>

            <FormErrorBanner message={apiError} />

            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor={newPasswordId} className={styles.label}>
                  <Lock size={14} aria-hidden="true" />
                  New password
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    id={newPasswordId}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={touched.newPassword && !!errors.newPassword}
                    aria-describedby={
                      touched.newPassword && errors.newPassword ? `${newPasswordId}-error` : undefined
                    }
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onBlur={() => handleBlur("newPassword")}
                    className={`${styles.input} ${styles.passwordInput} ${touched.newPassword && errors.newPassword ? styles.inputError : ""}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
                <FormFieldError id={`${newPasswordId}-error`} message={touched.newPassword ? errors.newPassword : undefined} />
              </div>

              <div className={styles.field}>
                <label htmlFor={confirmPasswordId} className={styles.label}>
                  <Lock size={14} aria-hidden="true" />
                  Confirm password
                </label>
                <input
                  id={confirmPasswordId}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={touched.confirmPassword && !!errors.confirmPassword}
                  aria-describedby={
                    touched.confirmPassword && errors.confirmPassword ? `${confirmPasswordId}-error` : undefined
                  }
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => handleBlur("confirmPassword")}
                  className={`${styles.input} ${touched.confirmPassword && errors.confirmPassword ? styles.inputError : ""}`}
                  placeholder="••••••••"
                />
                <FormFieldError id={`${confirmPasswordId}-error`} message={touched.confirmPassword ? errors.confirmPassword : undefined} />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading} aria-disabled={loading}>
                {loading ? (
                  <>
                    <Spinner variant="icon" iconSize={18} />
                    Updating…
                  </>
                ) : (
                  <>
                    <Check size={18} aria-hidden="true" />
                    Reset password
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
