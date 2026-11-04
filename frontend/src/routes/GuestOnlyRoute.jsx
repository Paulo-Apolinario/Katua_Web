import SessionRecovery from "../components/SessionRecovery";
import { Navigate } from 'react-router';
import { useAdminAuth } from '../context/AdminAuthContext';

const GuestOnlyRoute = ({ children }) => {
  const { admin, loading, bootstrapError } = useAdminAuth();
  if (bootstrapError) return <SessionRecovery />;
  if (loading) return <p role="status" className="p-4">Confirmando sessão...</p>;
  return !admin ? children : <Navigate to="/" />;
};

export default GuestOnlyRoute;
