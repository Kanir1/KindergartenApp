import { createContext, useContext, useMemo, useState, useEffect } from 'react';


const AuthCtx = createContext(null);


export function AuthProvider({ children }) {
const [token, setToken] = useState(() => localStorage.getItem('token'));
const [user, setUser] = useState(() => {
try { return JSON.parse(localStorage.getItem('user')||'null'); } catch { return null; }
});


useEffect(() => {
if (token) localStorage.setItem('token', token); else localStorage.removeItem('token');
}, [token]);
useEffect(() => {
if (user) localStorage.setItem('user', JSON.stringify(user)); else localStorage.removeItem('user');
}, [user]);


const value = useMemo(() => ({ token, setToken, user, setUser }), [token, user]);
return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}


export function useAuth() {
return useContext(AuthCtx);
}