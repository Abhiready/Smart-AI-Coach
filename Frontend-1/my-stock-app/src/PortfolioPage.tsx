// src/PortfolioPage.tsx
import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';

const LOCAL_KEY = "localPortfolios_v1";
const apiBase = () => "";

type Portfolio = { id: number; name: string; created_at?: string };

function loadLocal(): Portfolio[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Portfolio[];
  } catch {
    return [];
  }
}
function saveLocal(list: Portfolio[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

const PortfolioPage: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [newPortfolio, setNewPortfolio] = useState("");

  // if backend returns 401 or network error, fallback to local mode automatically
  const fetchPortfolios = async () => {
    setLoading(true);
    setError("");
    try {
      // try backend first (relative /api path will go through vite proxy if configured)
      const res = await fetch("/api/portfolios", { credentials: "include" });
      if (!res.ok) {
        // 401 -> use local fallback
        if (res.status === 401) {
          const local = loadLocal();
          setPortfolios(local);
          setError("Not authenticated — using local-only mode");
        } else {
          const j = await res.json().catch(() => ({}));
          setError(j?.error || `Server error ${res.status}`);
          // try to fall back to local
          setPortfolios(loadLocal());
        }
      } else {
        const data = await res.json();
        // normalize date key
        const mapped = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          created_at: p.created_at || p.createdAt || new Date().toISOString(),
        }));
        setPortfolios(mapped);
      }
    } catch (e) {
      // network error -> local fallback
      setError("Backend unavailable — using local-only mode");
      setPortfolios(loadLocal());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
    // eslint-disable-next-line
  }, []);
   
  const handleAddPortfolio = async () => {
    const name = newPortfolio.trim();
    if (!name) return;
    setError("");
    try {
      // try backend create
      const res = await fetch("/api/portfolios", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        // refresh list
        await fetchPortfolios();
        setNewPortfolio("");
        return;
      }
      // if not ok (likely 401), create locally
      if (res.status === 401) {
        const local = loadLocal();
        const id = local.length ? Math.max(...local.map(p => p.id)) + 1 : 1;
        const created = { id, name, created_at: new Date().toISOString() };
        const updated = [...local, created];
        saveLocal(updated);
        setPortfolios(updated);
        setNewPortfolio("");
        setError("Created locally (not saved on server because you are not logged in).");
        return;
      }
      const j = await res.json().catch(() => ({}));
      setError(j?.error || `Server error ${res.status}`);
    } catch (e) {
      // network error -> local create
      const local = loadLocal();
      const id = local.length ? Math.max(...local.map(p => p.id)) + 1 : 1;
      const created = { id, name, created_at: new Date().toISOString() };
      const updated = [...local, created];
      saveLocal(updated);
      setPortfolios(updated);
      setNewPortfolio("");
      setError("Created locally (backend unavailable).");
    }
  };

  if (loading) return <div style={{ padding: 12 }}>Loading portfolios...</div>;
  return (
    <div style={{ padding: "1rem" }}>
      <h2>Portfolio</h2>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          value={newPortfolio}
          onChange={(e) => setNewPortfolio(e.target.value)}
          placeholder="Enter portfolio name"
        />
        <button onClick={handleAddPortfolio} style={{ marginLeft: 8 }}>Add</button>
      </div>

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      {portfolios.length === 0 ? (
        <p>No portfolios yet.</p>
      ) : (
        <ul>
          {portfolios.map((p) => (
            <li key={p.id}>
              <Link to={`/portfolio/${p.id}`}>{p.name}</Link>{" "}
              (Created: {new Date(p.created_at || new Date().toISOString()).toLocaleDateString()})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PortfolioPage;
