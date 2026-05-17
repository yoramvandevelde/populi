import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Header from '../components/Header';

export default function Admin() {
  const [info, setInfo] = useState(null);
  const [flash, setFlash] = useState(null); // { type: 'success'|'error', msg }

  useEffect(() => {
    api.admin.info().then(r => r.json()).then(setInfo);
  }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await api.admin.upload(file);
    if (res.ok) {
      const data = await res.json();
      setFlash({ type: 'success', msg: data.message });
      api.admin.info().then(r => r.json()).then(setInfo);
    } else {
      const data = await res.json().catch(() => ({}));
      setFlash({ type: 'error', msg: data.error ?? 'Upload mislukt.' });
    }
    e.target.value = '';
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <>
      <Header />
      <main>
        <Link to="/" className="back">← terug</Link>
        <h1>Admin</h1>

        {flash && (
          <div className={`flash flash-${flash.type}`}>{flash.msg}</div>
        )}

        <div className="admin-section">
          <h2>Database</h2>
          {info && (
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              {info.db_path} · {formatBytes(info.db_size)}
            </p>
          )}
          <div className="actions" style={{ marginBottom: 0 }}>
            <a href={api.admin.downloadUrl()} className="btn" download="recepten.db">
              <i className="fa-solid fa-download" /> Download
            </a>
          </div>
        </div>

        <div className="admin-section">
          <h2>Database vervangen</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Upload een .db bestand om de huidige database te vervangen.
          </p>
          <label className="btn" style={{ cursor: 'pointer' }}>
            <i className="fa-solid fa-upload" /> Upload .db
            <input
              type="file"
              accept=".db"
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
          </label>
        </div>
      </main>
    </>
  );
}
