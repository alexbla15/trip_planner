"use client";

import { useState, useRef, useId } from "react";
import Link from "next/link";
import { Plane, Mail, Send } from "lucide-react";
import { forgotPassword } from "@/services";
import { validateForgotPasswordForm } from "@/lib";
import { FormErrorBanner, FormFieldError, Spinner } from "@/components";
import styles from "./ForgotPasswordClient.module.css";

export function ForgotPasswordClient() {
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [sent, setSent] = useState(false);

  const emailId = useId();

  const errors = validateForgotPasswordForm(email);
  const isValid = Object.keys(errors).length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid) {
      emailRef.current?.focus();
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      await forgotPassword(email);
      setSent(true);
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

        {sent ? (
          <div role="status">
            <div className={styles.iconCircle} aria-hidden="true">
              <Mail size={24} />
            </div>
            <h1 className={styles.heading}>Check your email</h1>
            <p className={styles.subheading}>
              If an account exists for that email, we&apos;ve sent a link to reset your password.
            </p>
            <p className={styles.switchText}>
              <Link href="/login" className={styles.switchLink}>
                Back to sign in
              </Link>
            </p>
          </div>
        ) : (
          <>
            <h1 className={styles.heading}>Forgot your password?</h1>
            <p className={styles.subheading}>Enter your email and we&apos;ll send you a reset link</p>

            <FormErrorBanner message={apiError} />

            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor={emailId} className={styles.label}>
                  <Mail size={14} aria-hidden="true" />
                  Email
                </label>
                <input
                  id={emailId}
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  aria-required="true"
                  aria-invalid={touched && !!errors.email}
                  aria-describedby={touched && errors.email ? `${emailId}-error` : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  className={`${styles.input} ${touched && errors.email ? styles.inputError : ""}`}
                  placeholder="you@example.com"
                />
                <FormFieldError id={`${emailId}-error`} message={touched ? errors.email : undefined} />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={loading} aria-disabled={loading}>
                {loading ? (
                  <>
                    <Spinner variant="icon" iconSize={18} />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={18} aria-hidden="true" />
                    Send reset link
                  </>
                )}
              </button>
            </form>

            <p className={styles.switchText}>
              Remembered your password?{" "}
              <Link href="/login" className={styles.switchLink}>
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
