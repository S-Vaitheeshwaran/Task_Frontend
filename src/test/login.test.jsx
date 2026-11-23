import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { render, screen, waitFor, act } from "@testing-library/react";

import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

import Login from "../pages/Login";
import { loginAccount } from "../services/accountService";

// Mock the account service so tests never call the real backend.
vi.mock("../services/accountService", () => ({
  loginAccount: vi.fn(),
}));

// Helper to check the current route.
function CurrentLocation() {
  const location = useLocation();

  return <div data-testid="current-location">{location.pathname}</div>;
}

// Render the login page with routing enabled.
function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<h1>Dashboard Page</h1>} />
      </Routes>
      <CurrentLocation />
    </MemoryRouter>,
  );
}

// Helper to enter valid-format credentials.
async function enterCredentials(
  user,
  email = "test@example.com",
  password = "Password123!",
) {
  await user.type(screen.getByLabelText("Email address"), email);

  await user.type(screen.getByLabelText("Password", { exact: true }), password);
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Login component", () => {
  // 1. Render login form
  it("renders the login form", () => {
    renderLogin();

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();

    expect(screen.getByLabelText("Email address")).toBeInTheDocument();

    expect(
      screen.getByLabelText("Password", { exact: true }),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  // 2. Empty email and password
  it("shows validation errors when email and password are empty", async () => {
    const user = userEvent.setup();

    renderLogin();

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByText("Email address is required.")).toBeInTheDocument();

    expect(screen.getByText("Password is required.")).toBeInTheDocument();

    expect(loginAccount).not.toHaveBeenCalled();
  });

  // 3. Invalid email format
  it("shows an error when the email format is invalid", async () => {
    const user = userEvent.setup();

    renderLogin();

    await user.type(screen.getByLabelText("Email address"), "abc.com");

    await user.type(
      screen.getByLabelText("Password", { exact: true }),
      "Password123!",
    );

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(
      screen.getByText("Enter a valid email address."),
    ).toBeInTheDocument();

    expect(loginAccount).not.toHaveBeenCalled();
  });

  // 4. Empty password
  it("shows an error when the password is empty", async () => {
    const user = userEvent.setup();

    renderLogin();

    await user.type(screen.getByLabelText("Email address"), "test@example.com");

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByText("Password is required.")).toBeInTheDocument();

    expect(loginAccount).not.toHaveBeenCalled();
  });

  // 5. Successful login and success toast
  it("displays a success toast when login succeeds", async () => {
    const user = userEvent.setup();

    loginAccount.mockResolvedValue({
      status: 200,
      message: "Login successful!",
      data: {
        id: 1,
        fname: "Test",
        lname: "User",
        email: "test@example.com",
      },
    });

    renderLogin();

    await enterCredentials(user);

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Login successful!")).toBeInTheDocument();
  });

  // 6. Verify API arguments
  it("calls loginAccount with the entered credentials", async () => {
    const user = userEvent.setup();

    loginAccount.mockResolvedValue({
      status: 200,
      message: "Login successful!",
      data: { id: 1, email: "test@example.com" },
    });

    renderLogin();

    await enterCredentials(user);

    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(loginAccount).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password123!",
      });
    });
  });

  // 7. Incorrect credentials
  it("displays the backend error message when login fails", async () => {
    const user = userEvent.setup();

    loginAccount.mockRejectedValue(
      Object.assign(new Error("Invalid email or password."), {
        status: 401,
        isNetworkError: false,
      }),
    );

    renderLogin();

    await enterCredentials(user);

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();

    expect(screen.getByText("Login failed")).toBeInTheDocument();

    expect(
      screen.queryByText("Service temporarily unavailable"),
    ).not.toBeInTheDocument();
  });

  // 8. Unregistered email
  it("displays the backend message for an unregistered email", async () => {
    const user = userEvent.setup();

    loginAccount.mockRejectedValue(
      Object.assign(new Error("Email is not registered."), {
        status: 404,
        isNetworkError: false,
      }),
    );

    renderLogin();

    await enterCredentials(user, "unknown@example.com", "Password123!");

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(
      await screen.findByText("Email is not registered."),
    ).toBeInTheDocument();

    expect(screen.getByText("Login failed")).toBeInTheDocument();
  });

  // 9. Network failure
  it("displays a service unavailable toast for network failures", async () => {
    const user = userEvent.setup();

    loginAccount.mockRejectedValue(
      Object.assign(
        new Error("Temporarily out of service. Please try again later."),
        { isNetworkError: true },
      ),
    );

    renderLogin();

    await enterCredentials(user);

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(
      await screen.findByText("Service temporarily unavailable"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Temporarily out of service. Please try again later."),
    ).toBeInTheDocument();
  });

  // 10. Backend HTTP error
  it("shows Login failed for a backend server error", async () => {
    const user = userEvent.setup();

    loginAccount.mockRejectedValue(
      Object.assign(new Error("Internal server error."), {
        status: 500,
        isNetworkError: false,
      }),
    );

    renderLogin();

    await enterCredentials(user);

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(
      await screen.findByText("Internal server error."),
    ).toBeInTheDocument();

    expect(screen.getByText("Login failed")).toBeInTheDocument();
  });

  // 11. Show password
  it("shows the password when the Show button is clicked", async () => {
    const user = userEvent.setup();

    renderLogin();

    const passwordInput = screen.getByLabelText("Password", { exact: true });

    await user.type(passwordInput, "Password123!");

    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(passwordInput).toHaveAttribute("type", "text");
  });

  // 12. Hide password
  it("hides the password when the Hide button is clicked", async () => {
    const user = userEvent.setup();

    renderLogin();

    const passwordInput = screen.getByLabelText("Password", { exact: true });

    await user.type(passwordInput, "Password123!");

    await user.click(screen.getByRole("button", { name: "Show password" }));

    await user.click(screen.getByRole("button", { name: "Hide password" }));

    expect(passwordInput).toHaveAttribute("type", "password");
  });

  // 13. Store account details without storing the password
  it("stores account details in sessionStorage without the password", async () => {
    const user = userEvent.setup();

    loginAccount.mockResolvedValue({
      status: 200,
      message: "Login successful!",
      data: {
        id: 1,
        fname: "Test",
        lname: "User",
        email: "test@example.com",
      },
    });

    renderLogin();

    await enterCredentials(user);

    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(sessionStorage.getItem("account")).not.toBeNull();
    });

    const account = JSON.parse(sessionStorage.getItem("account"));

    expect(account).toEqual({
      id: 1,
      fname: "Test",
      lname: "User",
      email: "test@example.com",
    });

    expect(account).not.toHaveProperty("password");
  });

  // 14. Disable button while request is pending
  it("disables the Login button while the request is pending", async () => {
    const user = userEvent.setup();

    let resolveLogin;

    loginAccount.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );

    renderLogin();

    await enterCredentials(user);

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(
      screen.getByRole("button", { name: "Signing in..." }),
    ).toBeDisabled();

    await act(async () => {
      resolveLogin({
        status: 200,
        message: "Login successful!",
        data: { id: 1, email: "test@example.com" },
      });
    });
  });

  // 15. Redirect after successful login
  it("redirects to the dashboard after successful login", async () => {
    const user = userEvent.setup();

    loginAccount.mockResolvedValue({
      status: 200,
      message: "Login successful!",
      data: { id: 1, email: "test@example.com" },
    });

    renderLogin();

    await enterCredentials(user);

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Login successful!")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(
          screen.getByRole("heading", {
            name: "Dashboard Page",
          }),
        ).toBeInTheDocument();
      },
      { timeout: 2500 },
    );
  });

  // 16. Clear email validation error when editing
  it("clears the email validation error when the email is edited", async () => {
    const user = userEvent.setup();

    renderLogin();

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByText("Email address is required.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email address"), "test@example.com");

    expect(
      screen.queryByText("Email address is required."),
    ).not.toBeInTheDocument();
  });

  // 17. Clear password validation error when editing
  it("clears the password validation error when the password is edited", async () => {
    const user = userEvent.setup();

    renderLogin();

    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(screen.getByText("Password is required.")).toBeInTheDocument();

    await user.type(
      screen.getByLabelText("Password", { exact: true }),
      "Password123!",
    );

    expect(screen.queryByText("Password is required.")).not.toBeInTheDocument();
  });
});
