import { useEffect, useState } from 'react';

// Calls are relative ("/api/...") so they work both in local dev (Vite proxy)
// and in production (nginx proxies /api to the backend container).
export default function App() {
  const [notes, setNotes] = useState([]);
  const [views, setViews] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState(null);

  async function load() {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data.notes);
      setViews(data.views);
      setError(null);
    } catch (e) {
      setError('Could not reach the API.');
    }
  }

  useEffect(() => { load(); }, []);

  async function addNote(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
    });
    setTitle('');
    setBody('');
    load();
  }

  async function remove(id) {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <main>
      <header>
        <h1>📝 Notes</h1>
        <p className="muted">
          React → nginx → Express → Postgres + Redis, all wired by Docker Compose.
          <br />API hits (counted in Redis): <strong>{views}</strong>
        </p>
      </header>

      {error && <p className="error">{error}</p>}

      <form onSubmit={addNote} className="card">
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Body (optional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit">Add note</button>
      </form>

      <section className="notes">
        {notes.length === 0 && <p className="muted">No notes yet — add one above.</p>}
        {notes.map((n) => (
          <article key={n.id} className="card note">
            <div>
              <h3>{n.title}</h3>
              {n.body && <p>{n.body}</p>}
              <small className="muted">{new Date(n.created_at).toLocaleString()}</small>
            </div>
            <button className="ghost" onClick={() => remove(n.id)}>✕</button>
          </article>
        ))}
      </section>
    </main>
  );
}
