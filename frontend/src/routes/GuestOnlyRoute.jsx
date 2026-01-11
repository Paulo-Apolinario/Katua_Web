import { Navigate } from 'react-router';
import { useAdminAuth } from '../context/AdminAuthContext';

const GuestOnlyRoute = ({ children }) => {
  const { admin, loading } = useAdminAuth();
  if (loading) return <div></div>;
  return !admin ? children : <Navigate to="/" />;
};

export default GuestOnlyRoute;
