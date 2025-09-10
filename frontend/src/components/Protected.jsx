import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';


export default function Protected({ children, role }) {
const { token, user } = useAuth();
if (!token || !user) return <Navigate to="/login" replace />;
if (role && user.role !== role) return <Navigate to="/" replace />;
return children;
}