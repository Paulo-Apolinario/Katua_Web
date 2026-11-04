import SessionRecovery from "../components/SessionRecovery";
import { Navigate, useLocation } from "react-router";
import { useAdminAuth } from "../context/AdminAuthContext";

const AdminPrivateRoute = ({ children }) => {
  const { admin, loading, bootstrapError } = useAdminAuth();
  const { pathname } = useLocation();

  if (bootstrapError) return <SessionRecovery />;
  if (loading) {
    return <p role="status" className="p-4">Confirmando sessão...</p>;
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