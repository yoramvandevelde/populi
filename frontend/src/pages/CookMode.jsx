import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatAmount } from '../api';

export default function CookMode() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    api.recipes.get(id).then(r => r.json()).then(setData);
  }, [id]);

  if (!data) return null;
  const { recipe: r, ingredients } = data;

  return (
    <main>
      <div className="cook-header">
        <Link to={`/recipes/${id}`} className="back">← terug</Link>
      </div>

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

      <pre className="steps steps-cook">{r.steps}</pre>

      <button id="ing-toggle" className="btn" onClick={() => setPanelOpen(true)}>
        Ingrediënten
      </button>

      <div className={`overlay${panelOpen ? ' open' : ''}`} onClick={() => setPanelOpen(false)} />

      <aside className={`ing-panel${panelOpen ? ' open' : ''}`}>
        <div className="ing-panel-header">
          <h2>Ingrediënten</h2>
          <button className="btn-close" onClick={() => setPanelOpen(false)}>✕</button>
        </div>
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
      </aside>
    </main>
  );
}
