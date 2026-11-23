import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Login from "../pages/Login";

const account = {
  id: 12,
  fname: "Avery",
  lname: "Morgan",
  email: "avery@example.com",
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem("account", JSON.stringify(account));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Dashboard", () => {
  it("shows a welcoming workspace and keeps profile actions in the header menu", async () => {
    const user = userEvent.setup();
    renderDashboard();

    expect(
      screen.getByRole("heading", { name: "Welcome back, Avery" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open profile menu/i }));

    expect(screen.getByText("avery@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("updates the password through the configured endpoint without persisting it", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Password updated successfully." }),
    });
    renderDashboard();

    await user.click(screen.getByRole("button", { name: /open profile menu/i }));
    await user.click(screen.getByRole("button", { name: "Account settings" }));

    expect(screen.getByRole("dialog", { name: "Account settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("Avery");
    expect(screen.getByLabelText("Email address")).toHaveValue("avery@example.com");

    await user.click(screen.getByRole("tab", { name: "Security" }));
    await user.type(screen.getByLabelText("Current password"), "OldPass123!");
    await user.type(screen.getByLabelText("New password"), "NewPass456!");
    await user.type(screen.getByLabelText("Confirm new password"), "NewPass456!");
    await user.click(screen.getByRole("button", { name: "Show current password" }));

    expect(screen.getByLabelText("Current password")).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Hide current password" }));
    expect(screen.getByLabelText("Current password")).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Please sign in again using your new password.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/updatePassword?id=12",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          currentPassword: "OldPass123!",
          newPassword: "NewPass456!",
        }),
      }),
    );
    expect(sessionStorage.getItem("account")).toBeNull();
  });

  it("does not submit when the password confirmation does not match", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderDashboard();

    await user.click(screen.getByRole("button", { name: /open profile menu/i }));
    await user.click(screen.getByRole("button", { name: "Account settings" }));
    await user.click(screen.getByRole("tab", { name: "Security" }));
    await user.type(screen.getByLabelText("Current password"), "OldPass123!");
    await user.type(screen.getByLabelText("New password"), "NewPass456!");
    await user.type(screen.getByLabelText("Confirm new password"), "Different789!");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(
      screen.getByText("The new password and confirmation do not match."),
    ).toHaveAttribute("role", "alert");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects to sign in and clears the stored account on sign out", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true });
    renderDashboard();

    await user.click(screen.getByRole("button", { name: /open profile menu/i }));
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(sessionStorage.getItem("account")).toBeNull();
  });
});
