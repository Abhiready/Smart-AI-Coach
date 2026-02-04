// Frontend/my-stock-app/src/AiCoachPage.tsx
import React, { useEffect, useRef, useState } from "react";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: string;
  source?: string;
};

const apiBase = import.meta.env.VITE_API_BASE || ""; // keep empty if using proxy or set your backend base

export default function AiCoachPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [cash, setCash] = useState<number | "">("");
  const [holdingsText, setHoldingsText] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [savedLogs, setSavedLogs] = useState<any[]>([]);
  const [savedPanelExpanded, setSavedPanelExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<any | null>(null);

  const LOCAL_HISTORY_LIMIT = 12;

  const getPortfolioIdFromQuery = (): number | null => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pidRaw = params.get("portfolioId");
      if (pidRaw && /^\d+$/.test(pidRaw)) return Number(pidRaw);
    } catch {}
    return null;
  };

  const portfolioIdForLocalKey = () => {
    const pid = getPortfolioIdFromQuery();
    return pid ? String(pid) : "global";
  };

  const localHistoryKey = () => `aiCoach:history:${portfolioIdForLocalKey()}`;

  const loadLocalHistory = (): Msg[] => {
    try {
      const raw = localStorage.getItem(localHistoryKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Msg[];
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      console.warn("Failed to load local history:", e);
      return [];
    }
  };

  const saveLocalHistory = (msgs: Msg[]) => {
    try {
      const toSave = msgs.slice(-LOCAL_HISTORY_LIMIT);
      localStorage.setItem(localHistoryKey(), JSON.stringify(toSave));
    } catch (e) {
      console.warn("Failed to save local history:", e);
    }
  };

  const clearLocalHistory = () => {
    try {
      localStorage.removeItem(localHistoryKey());
    } catch (e) {
      console.warn("Failed to clear local history:", e);
    }
  };

  async function loadSavedLogs(portfolioId?: number) {
    try {
      const q = portfolioId ? `?portfolio_id=${portfolioId}` : "";
      const res = await fetch(`${apiBase}/api/coach/logs${q}`, {
        credentials: "include",
      });
      if (!res.ok) {
        // server returned something unexpected — show nothing but don't break
        setSavedLogs([]);
        return;
      }
      const j = await res.json().catch(() => ({}));
      setSavedLogs(j.logs || []);
    } catch (e) {
      console.error("Failed to load logs", e);
      setSavedLogs([]);
    }
  }

  useEffect(() => {
    loadSavedLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const local = loadLocalHistory();
    if (local && local.length > 0) {
      setMessages(local);
      return;
    }

    const introMsg: Msg = {
      id: "intro",
      role: "assistant",
      text:
        "👋 Hi — I'm your AI Smart Coach. I give practical, concise investing advice.\n\nTry: “How am I doing this week?” or paste holdings like `TCS 5 3500 3700`.",
      ts: new Date().toISOString(),
    };
    setMessages([introMsg]);
    saveLocalHistory([introMsg]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMessage(role: Msg["role"], text: string) {
    const msg: Msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      text,
      ts: new Date().toISOString(),
    };
    setMessages((prev) => {
      const next = [...prev, msg].slice(-200);
      saveLocalHistory(next);
      return next;
    });
  }

  async function sendMessage(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text) return;

    setInput("");
    addMessage("user", text);
    setLoading(true);

    const holdings: any[] = [];
    holdingsText.split("\n").forEach((line) => {
      const p = line.trim().split(/[,\s]+/).filter(Boolean);
      if (p.length >= 2) {
        const ticker = p[0].toUpperCase();
        const quantity = Number(p[1]) || 0;
        const avg_cost = Number(p[2] || 0);
        const current_price = Number(p[3] || avg_cost);
        if (ticker && quantity > 0) holdings.push({ ticker, quantity, avg_cost, current_price });
      }
    });

    const portfolio_summary = { cash: Number(cash) || 0, holdings };
    const recentContext = messages.slice(-LOCAL_HISTORY_LIMIT).map((m) => ({ role: m.role, text: m.text, ts: m.ts }));

    try {
      const res = await fetch(`${apiBase}/api/coach/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, portfolio_summary, conversation: recentContext }),
      });

      const j = await res.json().catch(() => ({}));
      const reply = j.reply || j.model || j.result || j.data || "⚠️ No response from server.";
      addMessage("assistant", typeof reply === "string" ? reply : JSON.stringify(reply));
    } catch (err: any) {
      addMessage("assistant", "⚠️ Network error: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  const quickPrompts = ["How am I doing this week?", "Rate my performance this month.", "How to avoid panic selling?"];

  const handleLoadLocalHistoryToChat = () => {
    const local = loadLocalHistory();
    if (local.length === 0) {
      alert("No local history saved for this portfolio.");
      return;
    }
    setMessages(local);
  };

  const handleClearLocalHistory = () => {
    if (!confirm("Clear saved local conversation history for this portfolio?")) return;
    clearLocalHistory();
    const introMsg: Msg = {
      id: "intro",
      role: "assistant",
      text:
        "👋 Hi — I'm your AI Smart Coach. I give practical, concise investing advice.\n\nTry: “How am I doing this week?” or paste holdings like `TCS 5 3500 3700`.",
      ts: new Date().toISOString(),
    };
    setMessages([introMsg]);
    saveLocalHistory([introMsg]);
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pidRaw = params.get("portfolioId");

      let selectedKey: string | null = null;

      if (pidRaw && /^\d+$/.test(pidRaw)) {
        selectedKey = `portfolioSummary:${pidRaw}`;
      } else {
        const last = localStorage.getItem("portfolioSummary:last");
        if (last && typeof last === "string") {
          selectedKey = last;
        } else {
          const keys = Object.keys(localStorage).filter((k) => /^portfolioSummary:\d+$/.test(k)).sort().reverse();
          if (keys.length > 0) selectedKey = keys[0];
        }
      }

      if (!selectedKey) return;

      const data = localStorage.getItem(selectedKey);
      if (!data) return;

      const parsed = JSON.parse(data);
      const numericCash = Number(parsed.cash || 0);
      setCash(numericCash);

      const textLines = (parsed.holdings || []).map((h: any) => `${h.ticker} ${h.quantity} ${h.avg_cost} ${h.current_price}`).join("\n");
      setHoldingsText(textLines);
    } catch (err) {
      console.error("Failed to load portfolio summary:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard");
    } catch (e) {
      alert("Copy failed");
    }
  };

  // open modal with a saved log
  const openSavedLogModal = (log: any) => {
    setModalContent(log);
    setModalOpen(true);
  };

  // ---- Styles (JS objects) ----
  const containerStyle: React.CSSProperties = { height: "100vh", display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0b0f14,#091017)" };
  const headerStyle: React.CSSProperties = { padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 12 };
  const titleStyle: React.CSSProperties = { color: "#cfe8ff", fontSize: 18, fontWeight: 700, margin: 0 };
  const subtitleStyle: React.CSSProperties = { color: "#9fb7ff", fontSize: 13, marginLeft: 8, opacity: 0.9 };

  const mainStyle: React.CSSProperties = { flex: 1, display: "grid", gridTemplateColumns: "1fr 360px", gap: 18, padding: 20, overflow: "hidden" };
  const chatPanelStyle: React.CSSProperties = { background: "linear-gradient(180deg,#071018,#0b1116)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", minHeight: 0, boxShadow: "0 6px 18px rgba(1,9,20,0.6)" };
  const rightPanelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };

  const messagesAreaStyle: React.CSSProperties = { overflowY: "auto", paddingRight: 8, flex: 1 };
  const bubbleUser: React.CSSProperties = { display: "inline-block", padding: "10px 14px", borderRadius: 14, background: "linear-gradient(90deg,#0e73ff,#33c2ff)", color: "#fff", boxShadow: "0 6px 18px rgba(3,108,214,0.18)", maxWidth: "78%", whiteSpace: "pre-wrap" };
  const bubbleBot: React.CSSProperties = { display: "inline-block", padding: "12px 14px", borderRadius: 12, background: "#0e1620", color: "#dce8ff", border: "1px solid rgba(255,255,255,0.03)", maxWidth: "78%", whiteSpace: "pre-wrap" };
  const tsStyle: React.CSSProperties = { fontSize: 11, color: "#8b98c7", marginTop: 6 };

  const panelCard: React.CSSProperties = { background: "#071016", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.03)", boxShadow: "0 6px 16px rgba(0,0,0,0.5)" };

  const primaryBtn = (big = false): React.CSSProperties => ({
    background: "linear-gradient(90deg,#0078ff,#00b2ff)",
    color: "#fff",
    padding: big ? "10px 16px" : "8px 12px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 8px 22px rgba(0,178,255,0.14)",
    transition: "transform .12s ease, box-shadow .12s ease",
  });
  const ghostBtn: React.CSSProperties = {
    background: "transparent",
    color: "#9fb7ff",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(159,183,255,0.08)",
    cursor: "pointer",
    fontWeight: 600,
  };
  const pillBtn: React.CSSProperties = {
    background: "#0f1720",
    color: "#9fb7ff",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(159,183,255,0.06)",
    cursor: "pointer",
    fontWeight: 600,
  };

  // saved logs area height: default vs expanded
  const savedLogsHeight = savedPanelExpanded ? 520 : 260;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#0ea5ff,#7dd3fc)", display: "flex", alignItems: "center", justifyContent: "center", color: "#001528", fontWeight: 800, boxShadow: "0 8px 20px rgba(2,23,56,0.5)" }}>
            ⚡
          </div>
          <div>
            <h1 style={titleStyle}>AI Smart Coach</h1>
            <div style={subtitleStyle}>Context-aware advisor • quick prompts • local memory</div>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => loadSavedLogs()} style={{ ...ghostBtn, display: "flex", gap: 8, alignItems: "center" }} title="Load saved server logs">
            📜 Saved (server)
          </button>
          <button onClick={handleLoadLocalHistoryToChat} style={ghostBtn} title="Load local conversation">
            💾 Load local
          </button>
          <button onClick={handleClearLocalHistory} style={{ ...ghostBtn, color: "#ffccd5", borderColor: "rgba(255,80,100,0.08)" }}>
            🧹 Clear local
          </button>
        </div>
      </div>

      <div style={mainStyle}>
        <div style={chatPanelStyle}>
          <div style={messagesAreaStyle}>
            {messages.map((m) => (
              <div key={m.id} style={{ marginBottom: 14, display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={m.role === "user" ? bubbleUser : bubbleBot}>
                  {m.text}
                </div>
                <div style={tsStyle}>{new Date(m.ts).toLocaleString()}</div>
              </div>
            ))}
            {loading && <div style={{ color: "#88b4ff", padding: 6 }}>Coach is thinking...</div>}
            <div ref={chatEndRef} />
          </div>

          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.02)", paddingTop: 12 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <input
                aria-label="Ask AI Coach"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask AI Coach... (press Enter to send)"
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.03)",
                  background: "#051018",
                  color: "#e6eef6",
                  outline: "none",
                }}
              />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={primaryBtn(true)} title="Send message">
                {loading ? "…" : "Send"}
              </button>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {quickPrompts.map((q) => (
                <button key={q} onClick={() => sendMessage(q)} style={{ ...pillBtn, cursor: "pointer" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={rightPanelStyle}>
          <div style={{ ...panelCard }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: "#cfe8ff" }}>Portfolio Summary</div>
              <div style={{ fontSize: 12, color: "#9fb7ff" }}>{portfolioIdForLocalKey() === "global" ? "Global" : `Portfolio ${portfolioIdForLocalKey()}`}</div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ minWidth: 80, color: "#9fb7ff", fontSize: 13, display: "flex", alignItems: "center" }}>Cash</div>
              <input value={cash === "" ? "" : String(cash)} onChange={(e) => setCash(e.target.value === "" ? "" : Number(e.target.value))} style={{ flex: 1, padding: 10, borderRadius: 8, background: "#051018", color: "#fff", border: "1px solid rgba(255,255,255,0.03)" }} />
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ color: "#9fb7ff", fontSize: 13, marginBottom: 6 }}>Holdings (one per line)</div>
              <textarea value={holdingsText} onChange={(e) => setHoldingsText(e.target.value)} placeholder="TCS 5 3500 3700" style={{ width: "100%", minHeight: 100, padding: 10, borderRadius: 8, background: "#051018", color: "#fff", border: "1px solid rgba(255,255,255,0.03)", resize: "vertical" }} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => sendMessage("How am I doing this week?")} style={primaryBtn()}>
                Ask: How am I doing?
              </button>
              <button onClick={() => { setHoldingsText(""); setCash(""); }} style={ghostBtn}>
                Reset
              </button>
            </div>
          </div>

          {/* saved logs card */}
          <div style={{ ...panelCard, maxHeight: savedLogsHeight, overflow: "auto", transition: "max-height 220ms ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: "#cfe8ff" }}>Server saved chats</div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setSavedPanelExpanded((s) => !s)} style={ghostBtn} title={savedPanelExpanded ? "Collapse" : "Expand"}>
                  {savedPanelExpanded ? "Collapse ▲" : "Expand ▼"}
                </button>
                <button onClick={() => setSavedLogs([])} style={ghostBtn}>Clear view</button>
              </div>
            </div>

            {savedLogs.length === 0 ? (
              <div style={{ color: "#8b98c7", padding: 8 }}>No saved chat found on server.</div>
            ) : (
              savedLogs.map((m: any, i: number) => (
                <div key={i} style={{ padding: 8, borderRadius: 8, background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent", marginBottom: 8, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "#9fb7ff" }}>
                      <strong>{m.role}</strong> • {new Date(m.ts).toLocaleString()}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openSavedLogModal(m)} style={{ ...pillBtn }}>Open</button>
                      <button onClick={() => copyToClipboard(`${m.role}\n${m.text}\n${m.ts}`)} style={{ ...ghostBtn }}>Copy</button>
                    </div>
                  </div>
                  <div style={{ color: "#dce8ff", whiteSpace: "pre-wrap", marginTop: 8, fontSize: 13, maxHeight: 66, overflow: "hidden", textOverflow: "ellipsis" }}>{m.text}</div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => loadSavedLogs()} style={primaryBtn()}>
              Refresh logs
            </button>
            <button onClick={handleLoadLocalHistoryToChat} style={ghostBtn}>
              Load local
            </button>
          </div>
        </div>
      </div>

      {/* bottom bar */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ color: "#9fb7ff", fontSize: 13 }}>Local memory key:</div>
        <div style={{ background: "#071016", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.03)", color: "#cfe8ff", fontSize: 13 }}>
          {localHistoryKey()}
        </div>
        <div style={{ marginLeft: "auto", color: "#8b98c7", fontSize: 13 }}>Tip: saved locally — share only with teammates you trust.</div>
      </div>

      {/* Modal for full saved log view */}
      {modalOpen && modalContent && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(3,6,10,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        }}>
          <div style={{ width: "96%", maxWidth: 1100, maxHeight: "92%", background: "#071018", borderRadius: 12, overflow: "auto", padding: 20, boxShadow: "0 18px 60px rgba(2,6,12,0.8)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#cfe8ff" }}>{modalContent.role || "log"}</div>
                <div style={{ color: "#9fb7ff", fontSize: 12 }}>{new Date(modalContent.ts).toLocaleString()}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={ghostBtn} onClick={() => copyToClipboard(JSON.stringify(modalContent, null, 2))}>Copy JSON</button>
                <button style={primaryBtn()} onClick={() => { setModalOpen(false); setModalContent(null); }}>Close</button>
              </div>
            </div>

            <div style={{ background: "#0b1117", padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.02)" }}>
              <pre style={{ whiteSpace: "pre-wrap", color: "#e6eef6", margin: 0 }}>{typeof modalContent.text === "string" ? modalContent.text : JSON.stringify(modalContent, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
