// Frontend/my-stock-app/src/AiCoachPage.tsx
import React, { useEffect, useRef, useState } from "react";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: string;
  source?: string;
};

const apiBase = ""; // if using proxy keep empty or set your backend base

export default function AiCoachPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [cash, setCash] = useState<number | "">("");
  const [holdingsText, setHoldingsText] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  // inside component
  const [savedLogs, setSavedLogs] = useState<any[]>([]);

async function loadSavedLogs(portfolioId?: number) {
  try {
    const q = portfolioId ? `?portfolio_id=${portfolioId}` : "";
    const res = await fetch(`${apiBase}/api/coach/logs${q}`, {
      credentials: "include"
    });
    const j = await res.json();
    setSavedLogs(j.logs || []);
  } catch (e) {
    console.error("Failed to load logs", e);
  }
}

// call once on mount if you want
useEffect(() => {
  loadSavedLogs(); // or loadSavedLogs( currentPortfolioId )
}, []);

  // initial assistant intro
  useEffect(() => {
    setMessages([
      {
        id: "intro",
        role: "assistant",
        text:
          "👋 Hi, I'm your **AI Smart Coach** — trained to give clear and practical investing insights.\n\nYou can say things like:\n- “How am I doing this week?”\n- “TCS 3500 3600 (10 shares)”\n- “How to avoid FOMO in trading?”",
        ts: new Date().toISOString(),
      },
    ]);
  }, []);

  // robust loading: prefer ?portfolioId=, else pointer 'portfolioSummary:last', else newest numeric key
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
          const keys = Object.keys(localStorage)
            .filter((k) => /^portfolioSummary:\d+$/.test(k))
            .sort()
            .reverse();
          if (keys.length > 0) selectedKey = keys[0];
        }
      }

      if (!selectedKey) {
        console.warn("⚠️ No portfolioSummary key found in localStorage.");
        return;
      }

      const data = localStorage.getItem(selectedKey);
      if (!data) {
        console.warn("⚠️ No data found for", selectedKey);
        return;
      }

      const parsed = JSON.parse(data);
      console.log("✅ Loaded portfolio summary:", selectedKey, parsed);

      // Ensure numeric cash
      const numericCash = Number(parsed.cash || 0);
      setCash(numericCash);

      const textLines = (parsed.holdings || [])
        .map((h: any) => `${h.ticker} ${h.quantity} ${h.avg_cost} ${h.current_price}`)
        .join("\n");
      setHoldingsText(textLines);
    } catch (err) {
      console.error("Failed to load portfolio summary:", err);
    }
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
    setMessages((prev) => [...prev, msg]);
  }

  async function sendMessage(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text) return;

    setInput("");
    addMessage("user", text);
    setLoading(true);

    // build portfolio summary from fields
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
    console.log("📤 Sending portfolio_summary:", portfolio_summary);

    try {
      const res = await fetch(`${apiBase}/api/coach/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, portfolio_summary }),
      });

      const j = await res.json();
      const reply = j.reply || j.model || j.result || "⚠️ No response from server.";
      addMessage("assistant", typeof reply === "string" ? reply : JSON.stringify(reply));
    } catch (err: any) {
      addMessage("assistant", "⚠️ Network error: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  const quickPrompts = ["How am I doing this week?", "Rate my performance this month.", "How to avoid panic selling?"];

  return (
    <div className="ai-root" style={{ background: "#0e1117", color: "#e0e6ef", height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 18, textAlign: m.role === "user" ? "right" : "left" }}>
            <div style={{ display: "inline-block", padding: "12px 16px", borderRadius: 12, background: m.role === "user" ? "#0059ff" : "#1c1f26", color: m.role === "user" ? "#fff" : "#f5f7fa", maxWidth: "75%", whiteSpace: "pre-wrap" }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div style={{ color: "#88b4ff" }}>Coach is thinking...</div>}
        <div ref={chatEndRef} />
      </div>

      {/* Saved chat -> load from server-side log files */}
      <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => loadSavedLogs()}
        style={{ padding: "6px 10px", marginRight: 8 }}
      >
        Load saved chat
      </button>

      {/* If you have a portfolio ID variable, pass it: loadSavedLogs(portfolioId) */}
      <button
        onClick={() => {
        // example: clear the savedLogs state view (not server)
        setSavedLogs([]);
        }}
        style={{ padding: "6px 10px" }}
      >
        Clear view
      </button>
    </div>

    {/* Render saved logs */}
    <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 12, background: "#0b0d11", padding: 8, borderRadius: 6 }}>
      {savedLogs.length === 0 ? (
        <div style={{ color: "#8b98c7" }}>No saved chat found on server.</div>
      ) : (
        savedLogs.map((m: any, i: number) => (
          <div key={i} style={{ padding: 6, borderBottom: "1px solid #121318" }}>
            <div style={{ fontSize: 12, color: "#9fb7ff" }}>
               <b>{m.role}</b> • {new Date(m.ts).toLocaleString()}
            </div>
            <div style={{ color: "#e6eef6", whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))
      )}
    </div>

      <div style={{ background: "#10141a", borderTop: "1px solid #1f242c", padding: 16 }}>
        <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ color: "#9fb7ff", fontSize: 13 }}>Cash:</label>
            <input
              value={cash === "" ? "" : String(cash)}
              onChange={(e) => setCash(e.target.value === "" ? "" : Number(e.target.value))}
              style={{ width: 160, padding: 6, borderRadius: 6, background: "#0d1117", color: "#e6eef6", border: "1px solid #1f232b" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: "#9fb7ff", fontSize: 13 }}>Holdings (one per line):</label>
            <textarea
              value={holdingsText}
              onChange={(e) => setHoldingsText(e.target.value)}
              placeholder="TCS 5 3500 3700"
              style={{ width: "100%", height: 56, padding: 8, borderRadius: 6, background: "#0d1117", color: "#fff", border: "1px solid #1f232b" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {quickPrompts.map((q) => (
            <button key={q} onClick={() => sendMessage(q)} style={{ background: "#1b1f27", color: "#9fb7ff", padding: "8px 12px", borderRadius: 6, border: "1px solid #2e3440" }}>
              {q}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <textarea
            style={{ flex: 1, background: "#0d1117", border: "1px solid #1f232b", color: "#fff", borderRadius: 8, padding: 10 }}
            placeholder="Ask AI Coach..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()} style={{ background: "linear-gradient(90deg, #0078ff, #00b2ff)", border: "none", borderRadius: 8, padding: "10px 18px", color: "#fff", fontWeight: 600 }}>
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
