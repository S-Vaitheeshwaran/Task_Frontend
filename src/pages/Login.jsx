
import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { loginAccount } from "../services/accountService";
import Toast from "../components/Toast";
import "../css/Login.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState(() => (
    location.state?.passwordUpdated
      ? {
          type: "success",
          title: "Password updated",
          message: "Please sign in again using your new password.",
        }
      : null
  ));

  useEffect(() => {
    if (location.state?.passwordUpdated) {
      navigate(location.pathname, {
        replace: true,
        state: null,
      });
    }
  }, [location.pathname, location.state, navigate]);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    const validationErrors = {};

    // Validate email
    if (!email.trim()) {
      validationErrors.email = "Email address is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      validationErrors.email = "Enter a valid email address.";
    }

    // Validate password
    if (!password) {
      validationErrors.password = "Password is required.";
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    try {
      // Call login API
      const result = await loginAccount({
        email: email.trim(),
        password,
      });

      // Check login response
      if (
        result.status !== 200 ||
        !result.data?.token ||
        !result.data?.account
      ) {
        setToast({
          type: "error",
          title: "Login failed",
          message:
            result.message ||
            "Unable to sign in. Please try again.",
        });
        return;
      }

      // Clear any previous session
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("account");

      // Store JWT token
      sessionStorage.setItem(
        "token",
        result.data.token
      );

      // Store account details separately
      sessionStorage.setItem(
        "account",
        JSON.stringify(result.data.account)
      );

      // Show success notification
      setToast({
        type: "success",
        title: "Login successful",
        message:
          result.message ||
          "Welcome back! Redirecting to your dashboard.",
      });

      // Navigate to dashboard
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1200);

    } catch (error) {
      setToast({
        type: "error",
        title: error.isNetworkError
          ? "Service temporarily unavailable"
          : "Login failed",
        message:
          error.message || "Please try again.",
      });

    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Login</h1>

        <p className="login-subtitle">
          Welcome back! Sign in to your account
        </p>

        <form onSubmit={handleSubmit} noValidate>

          {/* Email field */}
          <div className="login-field">
            <label htmlFor="login-email">
              Email address
            </label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((previous) => ({
                  ...previous,
                  email: "",
                }));
              }}
              placeholder="Enter your email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? "login-email-error" : undefined
              }
            />

            {errors.email && (
              <span
                id="login-email-error"
                className="login-field-error"
              >
                {errors.email}
              </span>
            )}
          </div>

          {/* Password field */}
          <div className="login-field">
            <label htmlFor="login-password">
              Password
            </label>

            <div className="login-password-wrapper">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrors((previous) => ({
                    ...previous,
                    password: "",
                  }));
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password
                    ? "login-password-error"
                    : undefined
                }
              />

              <button
                type="button"
                className="login-password-toggle"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                aria-pressed={showPassword}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {!showPassword && <path d="m3 3 18 18" />}
                </svg>
              </button>
            </div>

            {errors.password && (
              <span
                id="login-password-error"
                className="login-field-error"
              >
                {errors.password}
              </span>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="login-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </button>

        </form>

        <p className="login-footer">
          Don't have an account?{" "}
          <Link to="/register">Create Account</Link>
        </p>
      </section>

      {/* Toast notification */}
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

export default Login;
