// Frontend/my-stock-app/src/PortfolioDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const apiBase = () => {
  const host = window.location.hostname;
  return `http://${host}:5000`;
};

// small badge helper
const badgeStyle = (cls: string) => {
  const base = {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 8,
    color: "white",
    fontWeight: 600,
    marginLeft: 8,
    fontSize: 12,
  } as React.CSSProperties;
  if (cls === "FOMO") return { ...base, background: "#f59e0b" };
  if (cls === "PANIC") return { ...base, background: "#ef4444" };
  return { ...base, background: "#10b981" };
};

const readLocalPortfolioSummary = (pid: number) => {
  try {
    const raw = localStorage.getItem(`portfolioSummary:${pid}`);
    if (!raw) return { cash: 0, holdings: [] as any[], name: undefined };
    const parsed = JSON.parse(raw);
    return parsed || { cash: 0, holdings: [] as any[] };
  } catch {
    return { cash: 0, holdings: [] as any[] };
  }
};
const writeLocalPortfolioSummary = (pid: number, summary: any) => {
  try {
    localStorage.setItem(`portfolioSummary:${pid}`, JSON.stringify(summary));
  } catch {}
};

const PortfolioDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const portfolioId = Number(id);
  const navigate = useNavigate();

  const [portfolioName, setPortfolioName] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tradeTicker, setTradeTicker] = useState("");
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [tradeQty, setTradeQty] = useState<number>(1);
  const [tradePrice, setTradePrice] = useState<number>(0);
  const [processingTrade, setProcessingTrade] = useState(false);

  // Per-portfolio simulated cash key in localStorage
  const simCashKey = `simCash:portfolio:${portfolioId}`;

  // simulated cash (per-portfolio)
  const [simulatedCash, setSimulatedCash] = useState<number>(() => {
    if (!portfolioId || isNaN(portfolioId)) return 100000;
    const raw = localStorage.getItem(simCashKey);
    if (!raw) return 100000.0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 100000.0;
  });

  const [editingCash, setEditingCash] = useState<string>(String(simulatedCash));

  // coach reply state
  const [coachReply, setCoachReply] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  // helpers to resolve tickers (uses backend /api/stock & /api/search)
  const resolveTicker = async (raw: string, signal?: AbortSignal) => {
    const t = (raw || "").trim().toUpperCase();
    if (!t) return null;
    try {
      const r1 = await fetch(`${apiBase()}/api/stock/${encodeURIComponent(t)}`, {
        credentials: "include",
        signal,
      });
      if (r1.ok) return t;
      const s = await fetch(`${apiBase()}/api/search/${encodeURIComponent(raw.trim())}`, {
        credentials: "include",
        signal,
      });
      if (!s.ok) return null;
      const hits = await s.json().catch(() => []);
      if (Array.isArray(hits) && hits.length > 0) {
        const exact = hits.find((h: any) => (h.ticker || "").toUpperCase() === t);
        return exact ? exact.ticker : hits[0].ticker;
      }
      return null;
    } catch (e: any) {
      if (e?.name === "AbortError") return null;
      return null;
    }
  };

  // fetch holdings from backend and enrich with live prices
  const loadHoldings = async () => {
    try {
      // Try server holdings first
      const res = await fetch(`${apiBase()}/api/portfolio/${portfolioId}/holdings`, {
        credentials: "include",
      });

      let data: any[] = [];
      if (res.ok) {
        data = await res.json().catch(() => []);
      } else {
        // fallback: try localStorage portfolioSummary
        const local = readLocalPortfolioSummary(portfolioId);
        data = (local.holdings || []).map((h: any) => ({
          ticker: h.ticker,
          quantity: h.quantity,
          avg_cost: h.avg_cost ?? h.avgCost ?? 0,
        }));
        // if local summary has name, set it
        if (local && local.name) setPortfolioName(local.name);
      }

      // Enrich with live prices (if possible)
      const enriched = await Promise.all(
        data.map(async (h: any) => {
          try {
            let tickerToUse = (h.ticker || "").toUpperCase();
            try {
              const controller = new AbortController();
              const resolved = await resolveTicker(tickerToUse, controller.signal);
              if (resolved) tickerToUse = resolved;
            } catch {
              // ignore
            }

            const stock = await fetch(`${apiBase()}/api/stock/${encodeURIComponent(tickerToUse)}`, {
              credentials: "include",
            })
              .then((r) => r.json())
              .catch(() => ({}));
            const currentPrice = Number(stock.price ?? stock.currentPrice ?? stock.regularMarketPrice ?? 0);
            const qty = Number(h.quantity ?? h.qty ?? 0);
            const avg_cost = Number(h.avg_cost ?? h.avgCost ?? h.avg ?? 0);
            const pl = (currentPrice - avg_cost) * qty;
            return {
              ...h,
              ticker: tickerToUse,
              quantity: qty,
              avg_cost,
              currentPrice,
              pl,
            };
          } catch {
            return {
              ...h,
              quantity: Number(h.quantity || 0),
              avg_cost: Number(h.avg_cost || 0),
              currentPrice: 0,
              pl: 0,
            };
          }
        })
      );

      setHoldings(enriched);
      setError("");
    } catch {
      setError("Network error while loading holdings");
      setHoldings([]);

      // as last resort, try to read local summary
      const local = readLocalPortfolioSummary(portfolioId);
      setHoldings(
        (local.holdings || []).map((h: any) => ({
          ticker: (h.ticker || "").toUpperCase(),
          quantity: Number(h.quantity || 0),
          avg_cost: Number(h.avg_cost || 0),
          currentPrice: Number(h.current_price || 0),
          pl: Number((h.current_price || 0) - (h.avg_cost || 0)) * Number(h.quantity || 0),
        }))
      );
      if (local && local.name) setPortfolioName(local.name);
    }
  };

  // load portfolio and transactions
  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      await loadHoldings();

      const pRes = await fetch(`${apiBase()}/api/portfolio/${portfolioId}`, { credentials: "include" });
      if (pRes.ok) {
        const pd = await pRes.json();
        setTransactions(pd.transactions || []);
        if (pd.portfolio && pd.portfolio.name) setPortfolioName(pd.portfolio.name);
      } else {
        setTransactions([]);
        try {
          const d = await pRes.json().catch(() => ({}));
          if (d && d.error) setError(d.error);
        } catch {}
        // fallback: try local summary for name
        const local = readLocalPortfolioSummary(portfolioId);
        if (local && local.name) setPortfolioName(local.name);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!portfolioId || isNaN(portfolioId)) {
      setError("Invalid portfolio id");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId]);

  // Listen for cross-tab / cross-component updates
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail || {};
        const pid = Number(detail.portfolioId ?? detail.portfolio_id ?? detail.pid);
        if (!pid || Number(pid) !== portfolioId) return;
        // reload holdings & transactions
        loadAll();
      } catch (err) {
        // keep tolerant: reload anyway
        loadAll();
      }
    };
    window.addEventListener("portfolio-updated", handler as EventListener);
    return () => window.removeEventListener("portfolio-updated", handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId]);

  // save cash to per-portfolio localStorage
  const saveCash = () => {
    const n = Number(editingCash);
    if (!Number.isFinite(n) || n < 0) {
      setError("Enter a valid positive number for cash.");
      return;
    }
    setSimulatedCash(n);
    localStorage.setItem(simCashKey, String(n));
    setEditingCash(String(n));
    setError("");
    // update stored portfolio summary too (so UI that reads summary sees it)
    const summary = readLocalPortfolioSummary(portfolioId);
    summary.cash = n;
    writeLocalPortfolioSummary(portfolioId, summary);
    // also notify other components
    window.dispatchEvent(new CustomEvent("portfolio-updated", { detail: { portfolioId } }));
  };

  const deletePortfolio = async () => {
    if (!portfolioId || isNaN(portfolioId)) {
      setError("Invalid portfolio id");
      return;
    }
    const ok = window.confirm("Delete this portfolio and its transactions? This cannot be undone.");
    if (!ok) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase()}/api/portfolio/${portfolioId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        // remove local simulated data for this portfolio if present
        try {
          localStorage.removeItem(`portfolioSummary:${portfolioId}`);
          localStorage.removeItem(`simCash:portfolio:${portfolioId}`);
          const lastKey = localStorage.getItem("portfolioSummary:last");
          if (lastKey === `portfolioSummary:${portfolioId}`) {
            localStorage.removeItem("portfolioSummary:last");
          }
        } catch (e) {
          console.warn("Failed to clear portfolio localStorage keys", e);
        }
        window.dispatchEvent(new CustomEvent("portfolio-updated", { detail: { portfolioId } }));
        navigate("/portfolios");
      } else {
        setError(d.error || "Failed to delete portfolio");
      }
    } catch (err: any) {
      setError("Network error deleting portfolio: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  // perform trade (Quick Trade form on this page)
  const doTrade = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    if (processingTrade) return;
    try {
      setProcessingTrade(true);
      const resolvedTicker = (await resolveTicker(tradeTicker)) ?? tradeTicker.toUpperCase();
      const qty = Number(tradeQty || 0);
      const price = Number(tradePrice || 0);
      if (!resolvedTicker || !qty || qty <= 0 || !price || price <= 0) {
        setError("Invalid trade inputs.");
        setProcessingTrade(false);
        return;
      }
      const cost = qty * price;

      if (tradeType === "BUY" && cost > simulatedCash + 1e-6) {
        setError(`Insufficient simulated cash. You need ₹${cost.toFixed(2)} but have ₹${simulatedCash.toFixed(2)}.`);
        setProcessingTrade(false);
        return;
      }

      // Try server trade first
      try {
        const res = await fetch(`${apiBase()}/api/portfolio/${portfolioId}/trade`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: resolvedTicker,
            type: tradeType,
            quantity: qty,
            price: price,
          }),
        });
        const d = await res.json().catch(() => ({}));

        if (res.ok) {
          if (d.transaction) {
            setTransactions((prev) => [d.transaction, ...prev]);
          }
          if (tradeType === "BUY") {
            const newCash = Math.max(0, simulatedCash - cost);
            setSimulatedCash(newCash);
            localStorage.setItem(simCashKey, String(newCash));
          } else {
            const newCash = simulatedCash + cost;
            setSimulatedCash(newCash);
            localStorage.setItem(simCashKey, String(newCash));
          }

          // reload holdings from server
          await loadHoldings();
          setTradeTicker("");
          setTradeQty(1);
          setTradePrice(0);
          setError("");
          // notify other components (in case trade came from elsewhere)
          window.dispatchEvent(new CustomEvent("portfolio-updated", { detail: { portfolioId } }));
          setProcessingTrade(false);
          return;
        }

        // server returned non-OK -> fall back to local simulation
        console.warn("Server trade failed; falling back to local simulation", d);
      } catch (err) {
        console.warn("Network error on server trade; falling back to local simulation", err);
      }

      // FALLBACK LOCAL SIMULATION
      const rawCash = localStorage.getItem(simCashKey);
      let curr = rawCash ? Number(rawCash) : simulatedCash || 100000;
      if (tradeType === "BUY") {
        if (cost > curr + 1e-6) {
          setError(`Insufficient simulated cash. You need ₹${cost.toFixed(2)} but have ₹${curr.toFixed(2)}.`);
          setProcessingTrade(false);
          return;
        }
        curr = Math.max(0, curr - cost);
      } else {
        curr = curr + cost;
      }
      localStorage.setItem(simCashKey, String(curr));
      setSimulatedCash(curr);

      const summary = readLocalPortfolioSummary(portfolioId);
      summary.cash = curr;
      summary.holdings = summary.holdings || [];

      const idx = summary.holdings.findIndex((h: any) => (h.ticker || "").toUpperCase() === resolvedTicker.toUpperCase());
      if (tradeType === "BUY") {
        if (idx >= 0) {
          const found = summary.holdings[idx];
          const prevQty = Number(found.quantity || 0);
          const prevAvg = Number(found.avg_cost || found.avgCost || 0);
          const newQty = prevQty + qty;
          const newAvg = newQty > 0 ? ((prevAvg * prevQty) + (price * qty)) / newQty : price;
          found.quantity = newQty;
          found.avg_cost = Number(newAvg.toFixed(2));
        } else {
          summary.holdings.push({ ticker: resolvedTicker.toUpperCase(), quantity: qty, avg_cost: price, current_price: price });
        }
      } else {
        if (idx >= 0) {
          const found = summary.holdings[idx];
          const prevQty = Number(found.quantity || 0);
          const newQty = Math.max(0, prevQty - qty);
          if (newQty <= 0) summary.holdings.splice(idx, 1);
          else found.quantity = newQty;
        } else {
          setError(`Invalid simulated sell: you don't have ${resolvedTicker} in local summary.`);
          setProcessingTrade(false);
          return;
        }
      }

      writeLocalPortfolioSummary(portfolioId, summary);
      const localTx = {
        id: `local-${Date.now()}`,
        portfolio_id: portfolioId,
        ticker: resolvedTicker.toUpperCase(),
        type: tradeType,
        quantity: qty,
        price: price,
        timestamp: new Date().toISOString(),
        coach_class: "NORMAL",
      };
      setTransactions((prev) => [localTx, ...prev]);

      // notify other components and reload holdings from local summary
      window.dispatchEvent(new CustomEvent("portfolio-updated", { detail: { portfolioId } }));
      await loadHoldings();

      setTradeTicker("");
      setTradeQty(1);
      setTradePrice(0);
      setError("");
    } catch {
      setError("Network error on trade");
    } finally {
      setProcessingTrade(false);
    }
  };

  // auto-fill price + resolve ticker while typing (debounced)
  useEffect(() => {
    const raw = (tradeTicker || "").trim();
    if (!raw) {
      setTradePrice(0);
      return;
    }
    const controller = new AbortController();
    const signal = controller.signal;
    const timer = setTimeout(async () => {
      try {
        const resolved = await resolveTicker(raw, signal);
        if (!resolved) return;
        const r = await fetch(`${apiBase()}/api/stock/${encodeURIComponent(resolved)}`, {
          credentials: "include",
          signal,
        });
        if (!r.ok) return;
        const json = await r.json().catch(() => ({}));
        const live = Number(json.price ?? json.currentPrice ?? json.regularMarketPrice ?? NaN);
        if (!Number.isNaN(live) && live > 0) setTradePrice(Number(live));
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // ignore
        }
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [tradeTicker]);

  // whenever holdings or cash changes, save summary locally and update pointer
  useEffect(() => {
    if (!portfolioId || isNaN(portfolioId) || portfolioId <= 0) return;

    const summary = {
      cash: Number(simulatedCash || 0),
      holdings: holdings.map((h) => ({
        ticker: (h.ticker || "").toUpperCase(),
        quantity: Number(h.quantity || 0),
        avg_cost: Number(h.avg_cost || 0),
        current_price: Number(h.currentPrice || 0),
      })),
      saved_at: new Date().toISOString(),
      name: portfolioName ?? undefined,
    };

    const key = `portfolioSummary:${portfolioId}`;
    try {
      localStorage.setItem(key, JSON.stringify(summary));
      localStorage.setItem("portfolioSummary:last", key);
    } catch (err) {
      console.warn("Failed to save portfolio summary to localStorage", err);
    }
  }, [holdings, simulatedCash, portfolioId, portfolioName]);

  // coach summary counts
  const coachSummary = useMemo(() => {
    const counts: Record<string, number> = { NORMAL: 0, FOMO: 0, PANIC: 0 };
    for (const t of transactions) {
      const c = (t.coach_class || "NORMAL").toUpperCase();
      if (!(c in counts)) counts[c] = 0;
      counts[c] += 1;
    }
    return counts;
  }, [transactions]);

  // totals
  const portfolioTotals = useMemo(() => {
    let totalValue = 0;
    let totalPL = 0;
    for (const h of holdings) {
      const qty = Number(h.quantity || 0);
      const cp = Number(h.currentPrice || 0);
      const pl = Number(h.pl || 0);
      totalValue += qty * cp;
      totalPL += pl;
    }
    return { totalValue, totalPL };
  }, [holdings]);

  // Build a portfolio_summary object to send to the AI coach
  const getPortfolioSummary = () => {
    const holdingsSummary = holdings.map((h) => ({
      ticker: (h.ticker || "").toString().toUpperCase(),
      quantity: Number(h.quantity || 0),
      avg_cost: Number(h.avg_cost || 0),
      current_price: Number(h.currentPrice || 0),
    }));
    return {
      cash: Number(simulatedCash || 0),
      holdings: holdingsSummary,
    };
  };

  // Ask the AI coach about current portfolio (sends portfolio_summary to backend)
  const askCoach = async (question?: string) => {
    setCoachLoading(true);
    setCoachReply(null);
    try {
      const payload = {
        message: question || "How am I doing this week?",
        portfolio_summary: getPortfolioSummary(),
        portfolio_id: portfolioId,
      };
      const res = await fetch(`${apiBase()}/api/coach/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      const reply = j.reply || (j.model ? JSON.stringify(j) : (j.result || j.data || JSON.stringify(j)));
      setCoachReply(typeof reply === "string" ? reply : JSON.stringify(reply, null, 2));
    } catch (err: any) {
      setCoachReply("Network error talking to coach: " + (err?.message || err));
    } finally {
      setCoachLoading(false);
    }
  };

  if (loading) return <div>Loading portfolio...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => navigate(-1)}>Back</button>
        <h1 style={{ margin: 0 }}>{portfolioName ? portfolioName : `Portfolio #${portfolioId}`}</h1>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={deletePortfolio}
            style={{ padding: "6px 10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6 }}
            disabled={loading}
            title="Delete portfolio"
          >
            {loading ? "Deleting…" : "Delete Portfolio"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 12 }}>
        <div style={{ background: "#111", padding: 14, borderRadius: 8 }}>
          <div style={{ color: "#aaa", marginBottom: 6 }}>Simulated Cash</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>₹ {simulatedCash.toFixed(2)}</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={editingCash}
            onChange={(e) => setEditingCash(e.target.value)}
            style={{ padding: 6, width: 180 }}
            placeholder="Enter bank amount"
            aria-label="Simulated cash"
          />
          <button onClick={saveCash} style={{ padding: "6px 12px" }}>
            Save Cash
          </button>
        </div>

        <div style={{ marginLeft: "auto", background: "#111", padding: 12, borderRadius: 8 }}>
          <div style={{ color: "#aaa", fontSize: 13 }}>Portfolio Value</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>₹ {portfolioTotals.totalValue.toFixed(2)}</div>
          <div style={{ color: portfolioTotals.totalPL >= 0 ? "lime" : "red", marginTop: 6 }}>
            {portfolioTotals.totalPL >= 0 ? "↑ " : "↓ "}₹ {Math.abs(portfolioTotals.totalPL).toFixed(2)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
        <div style={{ background: "#111", padding: 18, borderRadius: 8 }}>
          <h3 style={{ margin: "0 0 8px 0", color: "#fff" }}>Coach Summary</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={badgeStyle("NORMAL")}>Normal: {coachSummary.NORMAL}</div>
            <div style={badgeStyle("FOMO")}>FOMO: {coachSummary.FOMO}</div>
            <div style={badgeStyle("PANIC")}>Panic: {coachSummary.PANIC}</div>
          </div>
        </div>

        <div style={{ background: "#111", padding: 18, borderRadius: 8, flex: 1 }}>
          <h3 style={{ margin: "0 0 12px 0", color: "#fff" }}>Quick coach help</h3>
          <ul style={{ margin: 0, paddingLeft: 16, color: "#ddd" }}>
            <li>
              <b>FOMO</b>: price moved up rapidly vs recent average. Consider reducing size.
            </li>
            <li>
              <b>PANIC</b>: price dropped vs recent average. Re-evaluate before selling.
            </li>
            <li>Badge is shown per transaction and counts are aggregated above.</li>
          </ul>
        </div>
      </div>

      <section style={{ marginTop: 18 }}>
        <h2>Holdings</h2>
        {holdings.length === 0 ? (
          <div>No holdings</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
                <th style={{ padding: 8 }}>Ticker</th>
                <th style={{ padding: 8 }}>Qty</th>
                <th style={{ padding: 8 }}>Avg Cost</th>
                <th style={{ padding: 8 }}>Current Price</th>
                <th style={{ padding: 8 }}>P/L</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.ticker} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: 8 }}>{h.ticker}</td>
                  <td style={{ padding: 8 }}>{h.quantity}</td>
                  <td style={{ padding: 8 }}>{Number(h.avg_cost).toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{h.currentPrice !== undefined ? Number(h.currentPrice).toFixed(2) : "—"}</td>
                  <td style={{ padding: 8, color: (h.pl ?? 0) >= 0 ? "lime" : "red" }}>{(Number(h.pl || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>Quick Trade</h2>
        <form onSubmit={doTrade} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={tradeTicker}
            onChange={(e) => setTradeTicker(e.target.value)}
            placeholder="Ticker (e.g. TCS)"
            required
            style={{ textTransform: "uppercase", padding: 6 }}
          />
          <select value={tradeType} onChange={(e) => setTradeType(e.target.value as "BUY" | "SELL")} style={{ padding: 6 }}>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          <input type="number" value={tradeQty} onChange={(e) => setTradeQty(Number(e.target.value))} min={1} required style={{ width: 100, padding: 6 }} />
          <input type="number" value={tradePrice} onChange={(e) => setTradePrice(Number(e.target.value))} min={0} step="0.01" required style={{ width: 140, padding: 6 }} />
          <button type="submit" disabled={processingTrade} style={{ padding: "8px 14px" }}>
            {processingTrade ? "Processing…" : "Submit"}
          </button>
        </form>
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Ask AI Coach</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => askCoach()} style={{ padding: "8px 12px" }} disabled={coachLoading}>
            {coachLoading ? "Asking…" : "Ask Coach: How am I doing?"}
          </button>
          <button onClick={() => askCoach("Rate my portfolio performance and give 3 improvement tips")} style={{ padding: "8px 12px" }}>
            Ask: Rate & Tips
          </button>
        </div>
        <div style={{ marginTop: 12, background: "#0b0d11", padding: 12, borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: "#9fb7ff", marginBottom: 8 }}>Coach reply</div>
          <pre style={{ whiteSpace: "pre-wrap", color: "#e6eef6", margin: 0 }}>{coachReply ?? "No reply yet — click 'Ask Coach'."}</pre>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Transactions</h2>
        {transactions.length === 0 ? (
          <div>No transactions</div>
        ) : (
          <ul>
            {transactions.map((t: any) => (
              <li key={t.id} style={{ marginBottom: 8 }}>
                {(t.timestamp || t.created_at || t.date || "").toString()} — <b>{t.type}</b> {t.quantity} {t.ticker} @ {t.price}{" "}
                <span style={badgeStyle((t.coach_class || "NORMAL").toUpperCase())}>{(t.coach_class || "NORMAL").toUpperCase()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default PortfolioDetail;
