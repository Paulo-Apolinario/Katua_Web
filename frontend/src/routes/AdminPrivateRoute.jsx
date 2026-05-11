import { Navigate } from "react-router";
import { useAdminAuth } from "../context/AdminAuthContext";

const AdminPrivateRoute = ({ children }) => {
  const { admin, loading } = useAdminAuth();

  if (loading) {
    return <div></div>;
  }

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  if (admin?.role !== "COOPERATIVE") {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AdminPrivateRoute;