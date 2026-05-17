import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';

export default function Login() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await api.login(username, password);
    if (res.ok) {
      const data = await res.json();
      setUser(data.username);
      navigate('/');
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Inloggen mislukt.');
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={handleSubmit}>
        <h1>Populi</h1>
        {error && <p className="login-error">{error}</p>}
        <input
          type="text"
          placeholder="Gebruikersnaam"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
          required
        />
        <input
          type="password"
          placeholder="Wachtwoord"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Bezig…' : 'Inloggen'}
        </button>
      </form>
    </div>
  );
}
