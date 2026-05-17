import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api, parseTags } from '../api';
import Header from '../components/Header';
import TagInput from '../components/TagInput';
import IngredientList from '../components/IngredientList';

const EMPTY_ING = { item: '', amount: '', unit: '' };

export default function EditRecipe() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!isNew);
  const [form, setForm] = useState({
    title: '', steps: '', servings: 2, cookTime: '', prepTime: '', tags: [],
  });
  const [ingredients, setIngredients] = useState([EMPTY_ING]);

  useEffect(() => {
    if (isNew) return;
    api.recipes.get(id).then(r => r.json()).then(({ recipe: r, ingredients: ings }) => {
      setForm({
        title: r.title ?? '',
        steps: r.steps ?? '',
        servings: r.servings ?? 2,
        cookTime: r.cook_time ?? '',
        prepTime: r.prep_time ?? '',
        tags: parseTags(r.tags),
      });
      setIngredients([
        ...ings.map(i => ({ item: i.item, amount: i.amount != null ? String(i.amount) : '', unit: i.unit ?? '' })),
        EMPTY_ING,
      ]);
      setLoading(false);
    });
  }, [id]);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      title: form.title,
      steps: form.steps,
      servings: Number(form.servings),
      cookTime: form.cookTime || null,
      prepTime: form.prepTime || null,
      tags: form.tags.join(',') || null,
      ingredients: ingredients
        .filter(i => i.item.trim())
        .map(i => ({ item: i.item, amount: i.amount ? Number(i.amount) : null, unit: i.unit || null })),
    };

    if (isNew) {
      const res = await api.recipes.create(payload);
      const { id: newId } = await res.json();
      navigate(`/recipes/${newId}`);
    } else {
      await api.recipes.update(id, payload);
      navigate(`/recipes/${id}`);
    }
  }

  if (loading) return null;

  return (
    <>
      <Header />
      <main>
        <Link to={isNew ? '/' : `/recipes/${id}`} className="back">← terug</Link>
        <h1>{isNew ? 'Nieuw recept' : `${form.title} bewerken`}</h1>

        <form onSubmit={handleSubmit} className="recipe-form">
          <label>
            Titel
            <input value={form.title} onChange={set('title')} required />
          </label>

          <label>
            Personen
            <input type="number" min="1" value={form.servings} onChange={set('servings')} />
          </label>

          <div className="time-fields">
            <label>
              <span className="time-label"><i className="fa-solid fa-utensils" /> Voorbereiding</span>
              <input placeholder="bijv. 15 min" value={form.prepTime} onChange={set('prepTime')} />
            </label>
            <label>
              <span className="time-label"><i className="fa-solid fa-fire" /> Kook / baktijd</span>
              <input placeholder="bijv. 30 min" value={form.cookTime} onChange={set('cookTime')} />
            </label>
          </div>

          <TagInput tags={form.tags} onChange={tags => setForm(f => ({ ...f, tags }))} />

          <IngredientList ingredients={ingredients} onChange={setIngredients} />

          <label>
            Bereiding
            <textarea rows="10" value={form.steps} onChange={set('steps')} />
          </label>

          <button type="submit" className="btn btn-primary">Opslaan</button>
        </form>
      </main>
    </>
  );
}
