import { Link, Navigate } from "react-router";
import { useAdminAuth } from "../../context/AdminAuthContext";
import SessionRecovery from "../SessionRecovery";
export default function AdminWorkspace({ children }) {
  const { admin, loading, bootstrapError, logout } = useAdminAuth();
  if (bootstrapError) return <SessionRecovery />;
  if (loading) return <p role="status">Confirmando sessão...</p>;
  if (!admin) return <Navigate to="/login" replace />;
  if (admin.role !== "ADMIN") return <Navigate to="/analytics/participation" replace />;
  return <main className="container-fluid"><header className="d-flex flex-wrap justify-content-between align-items-center p-3 border-bottom gap-3"><strong>KATUÁ · Administração da plataforma</strong><nav aria-label="Administração" className="d-flex flex-wrap align-items-center gap-3"><Link to="/admin/cooperatives">Cooperativas</Link><Link to="/analytics/monitoring">Analytics detalhado</Link><button className="btn btn-outline-secondary" onClick={logout}>Sair da conta</button></nav></header>{children}</main>;
}
