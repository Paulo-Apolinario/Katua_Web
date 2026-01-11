import { Navigate } from 'react-router';
import { useAdminAuth } from '../context/AdminAuthContext';

const AdminPrivateRoute = ({ children }) => {
  const { admin, loading } = useAdminAuth();
  if (loading) return <div></div>;
  return admin ? children : <Navigate to="/login" />;
};

export default AdminPrivateRoute;
