import { useState, useEffect } from "react";

const API = "/api";

export default function App() {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState(null);

  async function fetchItems() {
    try {
      const res = await fetch(`${API}/items`);
      setItems(await res.json());
    } catch (e) {
      setError("Could not reach backend.");
    }
  }

  async function addItem() {
    if (!input.trim()) return;
    await fetch(`${API}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: input }),
    });
    setInput("");
    fetchItems();
  }

  async function deleteItem(id) {
    await fetch(`${API}/items/${id}`, { method: "DELETE" });
    fetchItems();
  }

  useEffect(() => { fetchItems(); }, []);

  return (
    <div style={{ maxWidth: 480, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1>Populi</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Add item..."
          style={{ flex: 1, padding: "6px 10px" }}
        />
        <button onClick={addItem}>Add</button>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((item) => (
          <li key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee" }}>
            <span>{item.name}</span>
            <button onClick={() => deleteItem(item.id)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
