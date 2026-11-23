
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is not configured.");
}

export async function apiRequest(endpoint, options = {}) {
  let response;

  // 1. Get JWT token
  const token = sessionStorage.getItem("token");

  // 2. Identify public endpoints
  const path = endpoint.split("?")[0];

  const isPublicEndpoint = [
    "/register",
    "/userLogin",
  ].includes(path);

  // 3. Prepare headers
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // 4. Attach JWT to protected requests
  if (token && !isPublicEndpoint) {
    headers.Authorization = `Bearer ${token}`;
  }

  // 5. Send API request
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    const error = new Error(
      "Temporarily out of service. Please try again later."
    );

    error.isNetworkError = true;
    throw error;
  }

  // 6. Read backend response
  let result;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  // 7. Handle expired or invalid JWT
  if (response.status === 401 && token && !isPublicEndpoint) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("account");

    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }

  // 8. Handle backend errors
  if (!response.ok) {
    const error = new Error(
      result?.message || "Something went wrong. Please try again."
    );

    error.status = response.status;
    error.isNetworkError = false;

    throw error;
  }

  return result;
}