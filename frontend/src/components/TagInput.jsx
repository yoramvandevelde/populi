import { useState, useRef } from 'react';

export default function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  function addTag(raw) {
    const tag = raw.trim().toLowerCase().replace(/,/g, '');
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
  }

  function removeTag(tag) {
    onChange(tags.filter(t => t !== tag));
  }

  function handleKeyDown(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      addTag(input);
      setInput('');
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="form-group">
      <span className="form-label">
        Tags <span className="label-optional">(optioneel, spatie of enter om toe te voegen)</span>
      </span>
      <div className="tag-input-box" onClick={() => inputRef.current?.focus()}>
        {tags.map(tag => (
          <span key={tag} className="tag-pill">
            {tag}
            <button type="button" className="tag-remove" onClick={() => removeTag(tag)}>×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          placeholder={tags.length === 0 ? 'bijv. pasta, soep…' : ''}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
