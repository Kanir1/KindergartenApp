// src/components/NavBar.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export default function NavBar() {
  const { user, setUser, setToken } = useAuth();
  const nav = useNavigate();

  const logout = () => {
    setUser(null);
    setToken(null);
    nav('/');
  };

  return (
    <div className="px-4 py-2 border-b flex items-center gap-4">
      <Link to="/">Home</Link>
      {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
      {user?.role === 'parent' && <Link to="/parent">Parent</Link>}
      {user && <Link to="/reports">Reports</Link>}

      <div className="ml-auto flex items-center gap-3">
        {!user ? (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        ) : (
          <>
            <span className="opacity-70 text-sm">
              {user.email} ({user.role})
            </span>
            <button onClick={logout} className="border rounded px-2 py-1">
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
