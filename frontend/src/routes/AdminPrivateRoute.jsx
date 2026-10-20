import { Navigate, useLocation } from "react-router";
import { useAdminAuth } from "../context/AdminAuthContext";

const AdminPrivateRoute = ({ children }) => {
  const { admin, loading } = useAdminAuth();
  const { pathname } = useLocation();

  if (loading) {
    return <div></div>;
  }

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  if (admin?.role === "MUNICIPAL_MANAGER") {
    return pathname === "/mtr-online" ? children : <Navigate to="/mtr-online" replace />;
  }

  if (admin?.role !== "COOPERATIVE") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AdminPrivateRoute;