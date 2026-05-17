import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { api } from '../api';

export default function Header() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await api.logout();
    setUser(null);
    navigate('/login');
  }

  return (
    <header>
      <div className="header-nav">
        <Link to="/" className="site-title">Populi</Link>
        <div className="header-actions">
          <Link to="/admin">Admin</Link>
          <button onClick={handleLogout}>Uitloggen</button>
        </div>
      </div>
    </header>
  );
}
