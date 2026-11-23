
import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { registerAccount } from "../services/accountService";
import Toast from "../components/Toast";
import "../css/CreateAccount.css";

function getPasswordStrength(password) {
  const checks = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9\s]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let label = "Weak";

  if (score >= 3 && score < 5) {
    label = "Medium";
  } else if (score === 5) {
    label = "Strong";
  }

  return {
    score,
    label,
    checks,
    isValid: Object.values(checks).every(Boolean),
  };
}

function CreateAccount() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = getPasswordStrength(form.password);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  }

  function validateForm() {
    const newErrors = {};

    if (!form.firstName.trim()) {
      newErrors.firstName = "First name is required.";
    } else if (form.firstName.trim().length < 2) {
      newErrors.firstName = "First name must contain at least 2 characters.";
    }

    if (!form.lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!form.password) {
      newErrors.password = "Password is required.";
    } else if (!passwordStrength.isValid) {
      newErrors.password = "Please meet all password requirements.";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    return newErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setToast(null);

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerAccount({
        fname: form.firstName.trim(),
        lname: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      // Display the success message returned by Spring Boot.
      setToast({
        type: "success",
        title: "Registration successful",
        message:
          result?.message || "Your account has been created successfully.",
      });

      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setErrors({});
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      // Only connection errors use the service-unavailable title.
      setToast({
        type: "error",
        title: error.isNetworkError
          ? "Service temporarily unavailable"
          : "Registration failed",
        message:
          error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="signup-page">
      <section className="signup-card">
        <h1>Create Account</h1>

        <p className="signup-subtitle">
          Enter your information to create your account
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="name-row">
            <div className="signup-field">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="John"
                autoComplete="given-name"
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={
                  errors.firstName ? "firstName-error" : undefined
                }
              />

              {errors.firstName && (
                <span id="firstName-error" className="signup-error">
                  {errors.firstName}
                </span>
              )}
            </div>

            <div className="signup-field">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Doe"
                autoComplete="family-name"
                aria-invalid={Boolean(errors.lastName)}
                aria-describedby={
                  errors.lastName ? "lastName-error" : undefined
                }
              />

              {errors.lastName && (
                <span id="lastName-error" className="signup-error">
                  {errors.lastName}
                </span>
              )}
            </div>
          </div>

          <div className="signup-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="john@gmail.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
            />

            {errors.email && (
              <span id="email-error" className="signup-error">
                {errors.email}
              </span>
            )}
          </div>

          <div className="signup-field">
            <label htmlFor="password">Password</label>

            <div className="password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {form.password && (
              <div className="password-strength">
                <div className="strength-track">
                  <div
                    className={`strength-fill strength-${passwordStrength.label.toLowerCase()}`}
                    style={{
                      width: `${(passwordStrength.score / 5) * 100}%`,
                    }}
                  />
                </div>

                <span
                  className={`strength-label strength-text-${passwordStrength.label.toLowerCase()}`}
                >
                  {passwordStrength.label} password
                </span>

                <ul className="password-hints">
                  <li className={passwordStrength.checks.minLength ? "hint-valid" : ""}>
                    At least 8 characters
                  </li>
                  <li className={passwordStrength.checks.uppercase ? "hint-valid" : ""}>
                    At least one uppercase letter (A-Z)
                  </li>
                  <li className={passwordStrength.checks.lowercase ? "hint-valid" : ""}>
                    At least one lowercase letter (a-z)
                  </li>
                  <li className={passwordStrength.checks.number ? "hint-valid" : ""}>
                    At least one number (0-9)
                  </li>
                  <li className={passwordStrength.checks.special ? "hint-valid" : ""}>
                    At least one special character (!@#$%)
                  </li>
                </ul>
              </div>
            )}

            {errors.password && (
              <span id="password-error" className="signup-error">
                {errors.password}
              </span>
            )}
          </div>

          <div className="signup-field">
            <label htmlFor="confirmPassword">Confirm Password</label>

            <div className="password-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword
                    ? "confirmPassword-error"
                    : undefined
                }
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword((previous) => !previous)
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>

            {errors.confirmPassword && (
              <span id="confirmPassword-error" className="signup-error">
                {errors.confirmPassword}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="signup-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="signup-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </section>

      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={closeToast}
        />
      )}
    </main>
  );
}

export default CreateAccount;
