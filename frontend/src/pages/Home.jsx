import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, parseTags } from '../api';
import Header from '../components/Header';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [recipes, setRecipes] = useState([]);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    api.recipes.list(query).then(r => r.json()).then(setRecipes);
  }, [query]);

  function handleSearch(e) {
    e.preventDefault();
    const q = searchInput.trim();
    setSearchParams(q ? { q } : {});
  }

  return (
    <>
      <Header />
      <main>
        <div className="page-header">
          <Link to="/recipes/new" className="btn btn-primary">Nieuw recept</Link>
          <form className="search-form" onSubmit={handleSearch}>
            <input
              className="search-input"
              type="search"
              placeholder="Zoeken…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </form>
        </div>

        {query && (
          <p className="search-meta">
            Resultaten voor <strong>{query}</strong> —{' '}
            <Link to="/" onClick={() => setSearchInput('')}>alles tonen</Link>
          </p>
        )}

        <section className="recipe-grid">
          {recipes.length === 0 ? (
            <p className="empty">
              {query ? 'Geen recepten gevonden.' : 'Nog geen recepten.'}
            </p>
          ) : recipes.map(r => (
            <div key={r.id} className="recipe-card">
              <Link to={`/recipes/${r.id}`} className="recipe-card-link">
                <h2>{r.title}</h2>
                <span className="meta">
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
                </span>
              </Link>
              {r.tags && (
                <div className="tag-list tag-list-card">
                  {parseTags(r.tags).map(tag => (
                    <Link
                      key={tag}
                      to={`/?q=${encodeURIComponent(tag)}`}
                      className="tag-pill-link"
                      onClick={() => setSearchInput(tag)}
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
