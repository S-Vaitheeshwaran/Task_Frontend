import { apiRequest } from "./api";

export function registerAccount(accountData) {
  return apiRequest("/register", {
    method: "POST",
    body: JSON.stringify(accountData),
  });
}
export function loginAccount(data) {
  return apiRequest("/userLogin", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAccountPassword(userId, passwordData) {
  return apiRequest(`/updatePassword?id=${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify(passwordData),
  });
}