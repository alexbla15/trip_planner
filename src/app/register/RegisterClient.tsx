"use client";

import { useState, useRef, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plane,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./RegisterClient.module.css";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
}

function validate(name: string, email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!name.trim()) errors.name = "Name is required";
  if (!email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";
  return errors;
}

export function RegisterClient() {
  const { login } = useAuth();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const errors = validate(name, email, password);
  const isValid = Object.keys(errors).length === 0;

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (!isValid) {
      nameRef.current?.focus();
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        setApiError(registerData.error ?? "Registration failed. Please try again.");
        return;
      }

      // Auto-login after successful registration
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        setApiError("Account created! Please sign in.");
        router.replace("/login");
        return;
      }

      await login(loginData.token as string);
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

        <h1 className={styles.heading}>Create your account</h1>
        <p className={styles.subheading}>Start planning your perfect trips</p>

        {/* API error banner */}
        {apiError && (
          <div className={styles.errorBanner} role="alert" aria-live="assertive">
            <AlertCircle size={16} aria-hidden="true" />
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div className={styles.field}>
            <label htmlFor={nameId} className={styles.label}>
              <User size={14} aria-hidden="true" />
              Full name
            </label>
            <input
              id={nameId}
              ref={nameRef}
              type="text"
              autoComplete="name"
              aria-required="true"
              aria-invalid={touched.name && !!errors.name}
              aria-describedby={touched.name && errors.name ? `${nameId}-error` : undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur("name")}
              className={`${styles.input} ${touched.name && errors.name ? styles.inputError : ""}`}
              placeholder="Alex Smith"
            />
            {touched.name && errors.name && (
              <p id={`${nameId}-error`} className={styles.fieldError} role="alert">
                <AlertCircle size={12} aria-hidden="true" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label htmlFor={emailId} className={styles.label}>
              <Mail size={14} aria-hidden="true" />
              Email
            </label>
            <input
              id={emailId}
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
            {touched.email && errors.email && (
              <p id={`${emailId}-error`} className={styles.fieldError} role="alert">
                <AlertCircle size={12} aria-hidden="true" />
                {errors.email}
              </p>
            )}
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
                autoComplete="new-password"
                aria-required="true"
                aria-invalid={touched.password && !!errors.password}
                aria-describedby={
                  touched.password && errors.password ? `${passwordId}-error` : undefined
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur("password")}
                className={`${styles.input} ${styles.passwordInput} ${touched.password && errors.password ? styles.inputError : ""}`}
                placeholder="Min. 8 characters"
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
            {touched.password && errors.password && (
              <p id={`${passwordId}-error`} className={styles.fieldError} role="alert">
                <AlertCircle size={12} aria-hidden="true" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
            aria-disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className={styles.spinner} aria-hidden="true" />
                Creating account…
              </>
            ) : (
              <>
                <UserPlus size={18} aria-hidden="true" />
                Create account
              </>
            )}
          </button>
        </form>

        {/* Switch link */}
        <p className={styles.switchText}>
          Already have an account?{" "}
          <Link href="/login" className={styles.switchLink}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
