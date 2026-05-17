import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api';
import Login from './pages/Login';
import Home from './pages/Home';
import ViewRecipe from './pages/ViewRecipe';
import EditRecipe from './pages/EditRecipe';
import CookMode from './pages/CookMode';
import Admin from './pages/Admin';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    api.me()
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data?.username ?? null))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) return null;

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Home /></Protected>} />
          <Route path="/recipes/new" element={<Protected><EditRecipe /></Protected>} />
          <Route path="/recipes/:id" element={<Protected><ViewRecipe /></Protected>} />
          <Route path="/recipes/:id/edit" element={<Protected><EditRecipe /></Protected>} />
          <Route path="/recipes/:id/cook" element={<Protected><CookMode /></Protected>} />
          <Route path="/admin" element={<Protected><Admin /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
