import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { updateAccountPassword } from "../services/accountService";
import { apiRequest } from "../services/api";
import Toast from "../components/Toast";
import "../css/Dashboard.css";

function getStoredUser() {
  try {
    const savedAccount = sessionStorage.getItem("account");
    return savedAccount ? JSON.parse(savedAccount) : null;
  } catch {
    return null;
  }
}

function getInitials(user) {
  return (
    [user?.fname, user?.lname]
      .filter(Boolean)
      .map((name) => name.trim().charAt(0))
      .join("")
      .toUpperCase() || "U"
  );
}

function PasswordVisibilityButton({ visible, onToggle, label, disabled }) {
  return (
    <button
      type="button"
      className="dashboard-password-toggle"
      aria-label={`${visible ? "Hide" : "Show"} ${label}`}
      aria-pressed={visible}
      onClick={onToggle}
      disabled={disabled}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        {!visible && <path d="m3 3 18 18" />}
      </svg>
    </button>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("profile");
  const [fname, setFname] = useState(user?.fname || "");
  const [lname, setLname] = useState(user?.lname || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);
  
async function handleUpdate(event) {
  event.preventDefault();

  if (!user?.id) {
    setToast({
      type: "error",
      title: "Unable to update profile",
      message: "User information was not found. Please sign in again.",
    });
    return;
  }

  try {
    setIsLoading(true);
    setToast(null);

    // Send profile update with JWT authentication
    const result = await apiRequest(
      `/updateUserById?id=${encodeURIComponent(user.id)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          fname: fname.trim(),
          lname: lname.trim(),
        }),
      }
    );

    const updatedUser = result.data;

    if (!updatedUser) {
      throw new Error(
        "The server did not return updated account details."
      );
    }

    // Update React state
    setUser(updatedUser);

    // Update stored account information
    sessionStorage.setItem(
      "account",
      JSON.stringify(updatedUser)
    );

    setFname(updatedUser.fname || "");
    setLname(updatedUser.lname || "");
    setIsEditing(false);

    setToast({
      type: "success",
      title: "Profile updated",
      message: "Your profile has been updated.",
    });

  } catch (error) {
    setToast({
      type: "error",
      title: "Unable to update profile",
      message: error.message || "Something went wrong. Please try again.",
    });

  } finally {
    setIsLoading(false);
  }
}


  function handleCancelEdit() {
    setFname(user?.fname || "");
    setLname(user?.lname || "");
    setIsEditing(false);
    setToast(null);
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault();
    setPasswordMessage(null);

    if (!user?.id) {
      setPasswordMessage({
        type: "error",
        text: "User information was not found. Please sign in again.",
      });
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMessage({
        type: "error",
        text: "Enter your current password and a new password.",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "The new password and confirmation do not match.",
      });
      return;
    }

    try {
      setIsPasswordLoading(true);
      const result = await updateAccountPassword(user.id, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (result?.status !== undefined && result.status !== 200) {
        throw new Error(result.message || "Unable to update your password.");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      await handleLogout({ passwordChanged: true });
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text:
          error.message || "Unable to update your password. Please try again.",
      });
    } finally {
      setIsPasswordLoading(false);
    }
  }

  async function handleLogout({ passwordChanged = false } = {}) {
    setIsProfileMenuOpen(false);

    try {
      // Send logout request with JWT authorization
      await apiRequest("/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      // Always clear local authentication data
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("account");

      // Redirect to login
      navigate("/login", {
        replace: true,
        state: passwordChanged ? { passwordUpdated: true } : null,
      });
    }
  }

  function openSettings(tab = "profile") {
    setIsProfileMenuOpen(false);
    setActiveSettingsTab(tab);
    setToast(null);
    setPasswordMessage(null);
    setIsSettingsOpen(true);
  }

  if (!user) {
    return (
      <main className="dashboard-page dashboard-session">
        <section className="dashboard-session-card">
          <div className="dashboard-mark" aria-hidden="true">
            W
          </div>
          <h1>Session not found</h1>
          <p>Please sign in to access your workspace.</p>
          <button
            type="button"
            className="dashboard-primary-button"
            onClick={() => navigate("/login", { replace: true })}
          >
            Go to sign in
          </button>
        </section>
      </main>
    );
  }

  const fullName = [user.fname, user.lname].filter(Boolean).join(" ");

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link
          className="dashboard-brand"
          to="/dashboard"
          aria-label="Workspace home"
        >
          <span className="dashboard-mark" aria-hidden="true">
            W
          </span>
          <span>Workspace</span>
        </Link>

        <div className="dashboard-profile">
          <button
            type="button"
            className="dashboard-profile-trigger"
            aria-expanded={isProfileMenuOpen}
            aria-label={`Open profile menu for ${fullName || user.email || "your account"}`}
            onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
          >
            <span className="dashboard-avatar" aria-hidden="true">
              {getInitials(user)}
            </span>
            <span className="dashboard-profile-name">
              {fullName || user.email}
            </span>
            <span className="dashboard-chevron" aria-hidden="true" />
          </button>

          {isProfileMenuOpen && (
            <div className="dashboard-profile-menu">
              <div className="dashboard-menu-identity">
                <span
                  className="dashboard-avatar dashboard-avatar-small"
                  aria-hidden="true"
                >
                  {getInitials(user)}
                </span>
                <span className="dashboard-menu-user">
                  <strong>{fullName || "Your account"}</strong>
                  <span>{user.email}</span>
                </span>
              </div>
              <div className="dashboard-menu-divider" />
              <button type="button" onClick={() => openSettings("profile")}>
                Account settings
              </button>
              <button
                type="button"
                className="dashboard-menu-logout"
                onClick={() => handleLogout()}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <section
        className="dashboard-welcome"
        aria-labelledby="dashboard-welcome-title"
      >
        <p className="dashboard-eyebrow">YOUR WORKSPACE</p>
        <h1 id="dashboard-welcome-title">
          Welcome back{user.fname ? `, ${user.fname}` : ""}
        </h1>
        <p>Your workspace is ready when you are.</p>
      </section>

      {isSettingsOpen && (
        <div
          className="dashboard-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsSettingsOpen(false);
              setIsEditing(false);
            }
          }}
        >
          <section
            className="dashboard-settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-settings-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsSettingsOpen(false);
                setIsEditing(false);
              }
            }}
          >
            <header className="dashboard-dialog-header">
              <div>
                <p className="dashboard-eyebrow">PREFERENCES</p>
                <h2 id="dashboard-settings-title">Account settings</h2>
                <p>Manage your personal information and security.</p>
              </div>
              <button
                type="button"
                className="dashboard-dialog-close"
                aria-label="Close account settings"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsEditing(false);
                }}
              >
                ×
              </button>
            </header>

            <div
              className="dashboard-settings-tabs"
              role="tablist"
              aria-label="Account settings"
            >
              <button
                type="button"
                id="settings-profile-tab"
                role="tab"
                aria-selected={activeSettingsTab === "profile"}
                aria-controls="settings-profile-panel"
                onClick={() => setActiveSettingsTab("profile")}
              >
                Personal details
              </button>
              <button
                type="button"
                id="settings-security-tab"
                role="tab"
                aria-selected={activeSettingsTab === "security"}
                aria-controls="settings-security-panel"
                onClick={() => setActiveSettingsTab("security")}
              >
                Security
              </button>
            </div>

            {activeSettingsTab === "profile" ? (
              <div
                id="settings-profile-panel"
                className="dashboard-settings-panel"
                role="tabpanel"
                aria-labelledby="settings-profile-tab"
              >
                <div className="dashboard-section-heading">
                  <h3>Personal details</h3>
                  {!isEditing && (
                    <button
                      type="button"
                      className="dashboard-text-button"
                      onClick={() => {
                        setIsEditing(true);
                      }}
                    >
                      Edit details
                    </button>
                  )}
                </div>

                <form
                  className="dashboard-settings-form"
                  onSubmit={handleUpdate}
                >
                  <div className="dashboard-name-fields">
                    <div className="dashboard-field">
                      <label htmlFor="settings-first-name">First name</label>
                      <input
                        id="settings-first-name"
                        type="text"
                        value={fname}
                        onChange={(event) => setFname(event.target.value)}
                        disabled={!isEditing || isLoading}
                        autoComplete="given-name"
                        required
                      />
                    </div>
                    <div className="dashboard-field">
                      <label htmlFor="settings-last-name">Last name</label>
                      <input
                        id="settings-last-name"
                        type="text"
                        value={lname}
                        onChange={(event) => setLname(event.target.value)}
                        disabled={!isEditing || isLoading}
                        autoComplete="family-name"
                        required
                      />
                    </div>
                  </div>
                  <div className="dashboard-field">
                    <label htmlFor="settings-email">Email address</label>
                    <input
                      id="settings-email"
                      type="email"
                      value={user.email || ""}
                      disabled
                      autoComplete="email"
                    />
                    <span className="dashboard-field-note">
                      Your email address cannot be changed here.
                    </span>
                  </div>

                  {isEditing && (
                    <div className="dashboard-form-actions">
                      <button
                        type="button"
                        className="dashboard-secondary-button"
                        onClick={handleCancelEdit}
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="dashboard-primary-button"
                        disabled={isLoading}
                      >
                        {isLoading ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            ) : (
              <div
                id="settings-security-panel"
                className="dashboard-settings-panel"
                role="tabpanel"
                aria-labelledby="settings-security-tab"
              >
                <div className="dashboard-section-heading">
                  <h3>Change password</h3>
                </div>
                <p className="dashboard-security-copy">
                  For your security, choose a password you do not use elsewhere.
                </p>
                {passwordMessage && (
                  <p
                    className={`dashboard-feedback dashboard-feedback-${passwordMessage.type}`}
                    role={passwordMessage.type === "error" ? "alert" : "status"}
                  >
                    {passwordMessage.text}
                  </p>
                )}
                <form
                  className="dashboard-settings-form"
                  onSubmit={handlePasswordUpdate}
                  noValidate
                >
                  <div className="dashboard-field">
                    <label htmlFor="current-password">Current password</label>
                    <div className="dashboard-password-control">
                      <input
                        id="current-password"
                        type={
                          visiblePasswords.currentPassword ? "text" : "password"
                        }
                        value={passwordForm.currentPassword}
                        onChange={(event) => {
                          setPasswordForm((form) => ({
                            ...form,
                            currentPassword: event.target.value,
                          }));
                          setPasswordMessage(null);
                        }}
                        autoComplete="current-password"
                        disabled={isPasswordLoading}
                        required
                      />
                      <PasswordVisibilityButton
                        visible={visiblePasswords.currentPassword}
                        onToggle={() =>
                          setVisiblePasswords((state) => ({
                            ...state,
                            currentPassword: !state.currentPassword,
                          }))
                        }
                        label="current password"
                        disabled={isPasswordLoading}
                      />
                    </div>
                  </div>
                  <div className="dashboard-field">
                    <label htmlFor="new-password">New password</label>
                    <div className="dashboard-password-control">
                      <input
                        id="new-password"
                        type={
                          visiblePasswords.newPassword ? "text" : "password"
                        }
                        value={passwordForm.newPassword}
                        onChange={(event) => {
                          setPasswordForm((form) => ({
                            ...form,
                            newPassword: event.target.value,
                          }));
                          setPasswordMessage(null);
                        }}
                        autoComplete="new-password"
                        disabled={isPasswordLoading}
                        required
                      />
                      <PasswordVisibilityButton
                        visible={visiblePasswords.newPassword}
                        onToggle={() =>
                          setVisiblePasswords((state) => ({
                            ...state,
                            newPassword: !state.newPassword,
                          }))
                        }
                        label="new password"
                        disabled={isPasswordLoading}
                      />
                    </div>
                  </div>
                  <div className="dashboard-field">
                    <label htmlFor="confirm-password">
                      Confirm new password
                    </label>
                    <div className="dashboard-password-control">
                      <input
                        id="confirm-password"
                        type={
                          visiblePasswords.confirmPassword ? "text" : "password"
                        }
                        value={passwordForm.confirmPassword}
                        onChange={(event) => {
                          setPasswordForm((form) => ({
                            ...form,
                            confirmPassword: event.target.value,
                          }));
                          setPasswordMessage(null);
                        }}
                        autoComplete="new-password"
                        disabled={isPasswordLoading}
                        required
                      />
                      <PasswordVisibilityButton
                        visible={visiblePasswords.confirmPassword}
                        onToggle={() =>
                          setVisiblePasswords((state) => ({
                            ...state,
                            confirmPassword: !state.confirmPassword,
                          }))
                        }
                        label="confirm new password"
                        disabled={isPasswordLoading}
                      />
                    </div>
                  </div>
                  <p className="dashboard-security-notice" role="note">
                    Your password is sent securely to the account service and is
                    never saved in this browser.
                  </p>
                  <button
                    type="submit"
                    className="dashboard-primary-button"
                    disabled={isPasswordLoading}
                  >
                    {isPasswordLoading ? "Updating..." : "Update password"}
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      )}
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

export default Dashboard;
