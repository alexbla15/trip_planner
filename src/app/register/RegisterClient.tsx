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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { register as registerRequest, login as loginRequest, ApiError } from "@/services";
import { validateRegisterForm } from "@/lib";
import { FormErrorBanner, FormFieldError, Spinner } from "@/components";
import styles from "./RegisterClient.module.css";

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

  const errors = validateRegisterForm(name, email, password);
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
      try {
        await registerRequest(name, email, password);
      } catch (err) {
        if (err instanceof ApiError) {
          setApiError((err.body as { error?: string } | null)?.error ?? "Registration failed. Please try again.");
          return;
        }
        throw err;
      }

      // Auto-login after successful registration
      const loginRes = await loginRequest(email, password);

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
        <FormErrorBanner message={apiError} />

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
            <FormFieldError id={`${nameId}-error`} message={touched.name ? errors.name : undefined} />
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
            <FormFieldError id={`${passwordId}-error`} message={touched.password ? errors.password : undefined} />
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
                <Spinner variant="icon" iconSize={18} />
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
