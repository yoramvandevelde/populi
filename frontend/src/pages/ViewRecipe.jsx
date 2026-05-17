import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, formatAmount, parseTags } from '../api';
import Header from '../components/Header';

export default function ViewRecipe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [shopState, setShopState] = useState('idle'); // idle | loading | ok | error

  useEffect(() => {
    api.recipes.get(id).then(r => r.ok ? r.json() : null).then(setData);
  }, [id]);

  async function handleDelete() {
    if (!confirm('Recept verwijderen?')) return;
    await api.recipes.delete(id);
    navigate('/');
  }

  async function handleShop() {
    setShopState('loading');
    const res = await api.recipes.shop(id);
    setShopState(res.ok ? 'ok' : 'error');
  }

  if (!data) return null;
  const { recipe: r, ingredients } = data;
  const tags = parseTags(r.tags);

  return (
    <>
      <Header />
      <main>
        <Link to="/" className="back">← terug</Link>
        <h1>{r.title}</h1>
        <p className="meta">
          {r.servings} personen
          {r.prep_time && (
            <span className="time-badge">
              <i className="fa-solid fa-utensils" /> {r.prep_time}
            </span>
          )}
          {r.cook_time && (
            <span className="time-badge">
              <i className="fa-solid fa-fire" /> {r.cook_time}
            </span>
          )}
        </p>

        {tags.length > 0 && (
          <div className="tag-list">
            {tags.map(tag => (
              <Link key={tag} to={`/?q=${encodeURIComponent(tag)}`} className="tag-pill-link">
                {tag}
              </Link>
            ))}
          </div>
        )}

        <div className="actions">
          <Link to={`/recipes/${id}/edit`} className="btn">Bewerken</Link>
          <Link to={`/recipes/${id}/cook`} className="btn btn-primary">Kookmodus</Link>
          <button className="btn" onClick={handleShop} disabled={shopState === 'loading' || shopState === 'ok'}>
            {shopState === 'loading' && <><i className="fa-solid fa-spinner fa-spin" /> Bezig…</>}
            {shopState === 'ok' && <i className="fa-solid fa-check" />}
            {shopState === 'error' && <i className="fa-solid fa-xmark" />}
            {shopState === 'idle' && <i className="fa-solid fa-cart-plus" />}
          </button>
        </div>

        <h2>Ingrediënten</h2>
        <table className="ingredients">
          <tbody>
            {ingredients.map((ing, i) => (
              <tr key={i}>
                <td>{ing.item}</td>
                <td className="amount">{formatAmount(ing.amount)}</td>
                <td className="unit">{ing.unit ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Bereiding</h2>
        <pre className="steps">{r.steps}</pre>

        <div className="danger-zone">
          <button className="btn-delete" onClick={handleDelete}>Verwijderen</button>
        </div>
      </main>
    </>
  );
}
