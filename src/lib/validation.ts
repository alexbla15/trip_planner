export interface LoginFormErrors {
  email?: string;
  password?: string;
}

/** Validates the login form; returns an empty object when there are no errors. */
export function validateLoginForm(email: string, password: string): LoginFormErrors {
  const errors: LoginFormErrors = {};
  if (!email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
  if (!password) errors.password = "Password is required";
  return errors;
}

export interface ForgotPasswordFormErrors {
  email?: string;
}

/** Validates the forgot-password form; returns an empty object when there are no errors. */
export function validateForgotPasswordForm(email: string): ForgotPasswordFormErrors {
  const errors: ForgotPasswordFormErrors = {};
  if (!email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
  return errors;
}

export interface ResetPasswordFormErrors {
  newPassword?: string;
  confirmPassword?: string;
}

/** Validates the reset-password form (min length 8, must match); returns an empty object when there are no errors. */
export function validateResetPasswordForm(newPassword: string, confirmPassword: string): ResetPasswordFormErrors {
  const errors: ResetPasswordFormErrors = {};
  if (!newPassword) errors.newPassword = "Password is required";
  else if (newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters";
  if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
  else if (newPassword && confirmPassword !== newPassword) errors.confirmPassword = "Passwords do not match";
  return errors;
}

export interface RegisterFormErrors {
  name?: string;
  email?: string;
  password?: string;
}

/** Validates the register form (name required, email format, password min length 8); returns an empty object when there are no errors. */
export function validateRegisterForm(name: string, email: string, password: string): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  if (!name.trim()) errors.name = "Name is required";
  if (!email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";
  return errors;
}
