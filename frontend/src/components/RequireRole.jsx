// src/components/RequireRole.jsx
import { Navigate, useLocation } from "react-router-dom";

// If you already have an auth context (e.g., useAuth()), use that here.
// This fallback decodes a JWT saved as localStorage.token and expects { id, role }.
function getUserFromToken() {
  const t = localStorage.getItem("token");
  if (!t) return null;
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    return payload; // { id, role }
  } catch {
    return null;
  }
}

export default function RequireRole({ roles = [], children }) {
  const loc = useLocation();
  const user = getUserFromToken();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
