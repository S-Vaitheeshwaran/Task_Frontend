
import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute() {

  const token = sessionStorage.getItem("token");
  const account = sessionStorage.getItem("account");

  if (!token || !account) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
