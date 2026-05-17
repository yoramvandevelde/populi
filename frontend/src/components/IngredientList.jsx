import { useRef } from 'react';

export default function IngredientList({ ingredients, onChange }) {
  const dragSrc = useRef(null);
  const dragOver = useRef(null);

  function update(i, field, value) {
    const next = ingredients.map((ing, idx) =>
      idx === i ? { ...ing, [field]: value } : ing
    );
    // auto-add row when typing in last row
    if (i === ingredients.length - 1 && value.trim?.()) {
      next.push({ item: '', amount: '', unit: '' });
    }
    onChange(next);
  }

  function handleDragStart(i) {
    dragSrc.current = i;
  }

  function handleDragOver(e, i) {
    e.preventDefault();
    dragOver.current = i;
  }

  function handleDrop() {
    const src = dragSrc.current;
    const dst = dragOver.current;
    if (src === null || dst === null || src === dst) return;
    const next = [...ingredients];
    const [moved] = next.splice(src, 1);
    next.splice(dst, 0, moved);
    onChange(next);
    dragSrc.current = null;
    dragOver.current = null;
  }

  return (
    <fieldset>
      <legend>Ingrediënten</legend>
      <div>
        {ingredients.map((ing, i) => (
          <div
            key={i}
            className="ingredient-row"
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={e => handleDragOver(e, i)}
            onDrop={handleDrop}
          >
            <span className="drag-handle">⠿</span>
            <input
              placeholder="Ingredient"
              value={ing.item}
              onChange={e => update(i, 'item', e.target.value)}
            />
            <input
              placeholder="Hoeveelheid"
              type="number"
              step="any"
              value={ing.amount ?? ''}
              onChange={e => update(i, 'amount', e.target.value)}
            />
            <input
              placeholder="Eenheid"
              value={ing.unit ?? ''}
              onChange={e => update(i, 'unit', e.target.value)}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
