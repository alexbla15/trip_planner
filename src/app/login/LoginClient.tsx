"use client";

import { useState, useRef, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plane,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  User,
  Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { login as loginRequest, demoLogin } from "@/services";
import { validateLoginForm, isProduction } from "@/lib";
import { FormErrorBanner, FormFieldError, Spinner } from "@/components";
import styles from "./LoginClient.module.css";

export function LoginClient() {
  const { login } = useAuth();
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [quickLoginRole, setQuickLoginRole] = useState<"demo" | "admin" | null>(null);

  const emailId = useId();
  const passwordId = useId();

  const errors = validateLoginForm(email, password);
  const isValid = Object.keys(errors).length === 0;

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleQuickLogin(role: "demo" | "admin") {
    setQuickLoginRole(role);
    setApiError("");

    try {
      const res = await demoLogin(role);
      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error ?? "Quick login failed. Please try again.");
        return;
      }

      await login(data.token as string);
      router.replace("/");
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setQuickLoginRole(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!isValid) {
      const firstError = errors.email ? emailRef.current : null;
      firstError?.focus();
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const res = await loginRequest(email, password);

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error ?? "Login failed. Please try again.");
        return;
      }

      await login(data.token as string);
      router.replace("/");
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo} aria-label="TripPlanner">
          <Plane size={20} className={styles.logoIcon} aria-hidden="true" />
          <span className={styles.logoName}>TripPlanner</span>
        </div>

        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.subheading}>Sign in to plan your next adventure</p>

        {/* API error banner */}
        <FormErrorBanner message={apiError} />

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
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
              aria-invalid={touched.email && !!errors.email}
              aria-describedby={touched.email && errors.email ? `${emailId}-error` : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur("email")}
              className={`${styles.input} ${touched.email && errors.email ? styles.inputError : ""}`}
              placeholder="you@example.com"
            />
            <FormFieldError id={`${emailId}-error`} message={touched.email ? errors.email : undefined} />
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label htmlFor={passwordId} className={styles.label}>
              <Lock size={14} aria-hidden="true" />
              Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id={passwordId}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-required="true"
                aria-invalid={touched.password && !!errors.password}
                aria-describedby={
                  touched.password && errors.password ? `${passwordId}-error` : undefined
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur("password")}
                className={`${styles.input} ${styles.passwordInput} ${touched.password && errors.password ? styles.inputError : ""}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={16} aria-hidden="true" />
                ) : (
                  <Eye size={16} aria-hidden="true" />
                )}
              </button>
            </div>
            <FormFieldError id={`${passwordId}-error`} message={touched.password ? errors.password : undefined} />
            <Link href="/forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || quickLoginRole !== null}
            aria-disabled={loading || quickLoginRole !== null}
          >
            {loading ? (
              <>
                <Spinner variant="icon" iconSize={18} />
                Signing in…
              </>
            ) : (
              <>
                <LogIn size={18} aria-hidden="true" />
                Sign in
              </>
            )}
          </button>
        </form>

        {/* Quick login */}
        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerLabel}>or</span>
          <span className={styles.dividerLine} />
        </div>

        <div className={styles.quickLoginGroup}>
          <button
            type="button"
            className={styles.quickLoginBtn}
            onClick={() => handleQuickLogin("demo")}
            disabled={loading || quickLoginRole !== null}
          >
            {quickLoginRole === "demo" ? (
              <Spinner variant="icon" iconSize={16} />
            ) : (
              <User size={16} aria-hidden="true" />
            )}
            Continue as Demo User
          </button>

          {!isProduction() && (
            <button
              type="button"
              className={styles.quickLoginBtn}
              onClick={() => handleQuickLogin("admin")}
              disabled={loading || quickLoginRole !== null}
            >
              {quickLoginRole === "admin" ? (
                <Spinner variant="icon" iconSize={16} />
              ) : (
                <Shield size={16} aria-hidden="true" />
              )}
              Continue as Admin
            </button>
          )}
        </div>

        {/* Switch link */}
        <p className={styles.switchText}>
          Don&apos;t have an account?{" "}
          <Link href="/register" className={styles.switchLink}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
