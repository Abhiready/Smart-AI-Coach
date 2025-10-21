// StocksPage.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Grid,
  Button,
  Avatar,
  CircularProgress,
  TextField,
  InputAdornment,
  Card,
  CardActionArea,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert as MuiAlert,
  SelectChangeEvent,
} from "@mui/material";
import { ArrowBack, ArrowUpward, ArrowDownward, Search as SearchIcon } from "@mui/icons-material";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// --- Define the structure of our stock data ---
interface Stock {
  ticker: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  history?: { time: string; price: number }[];
}

const PriceChangeDisplay = ({ change = 0, percent = 0 }: { change?: number; percent?: number }) => {
  const isPositive = change >= 0;
  const color = isPositive ? "success.main" : "error.main";
  return (
    <Typography variant="body2" sx={{ color, fontWeight: "medium" }}>
      {isPositive ? "+" : ""}
      {change.toFixed(2)} ({percent.toFixed(2)}%)
    </Typography>
  );
};

// --- Helper: read/write local portfolio summary used for simulation ---
function readLocalPortfolioSummary(pid: number) {
  try {
    const raw = localStorage.getItem(`portfolioSummary:${pid}`);
    if (!raw) return { cash: 0, holdings: [] as any[] };
    const parsed = JSON.parse(raw);
    return parsed || { cash: 0, holdings: [] as any[] };
  } catch {
    return { cash: 0, holdings: [] as any[] };
  }
}
function writeLocalPortfolioSummary(pid: number, summary: any) {
  try {
    localStorage.setItem(`portfolioSummary:${pid}`, JSON.stringify(summary));
  } catch {}
}

// helper that builds host-aware api base (use same host that served the page)
const apiBase = () => {
  const host = window.location.hostname;
  return `http://${host}:5000`;
};

// --- Main Page Component ---
export default function StocksPage() {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [stockListData, setStockListData] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Stock[]>([]);

  useEffect(() => {
    const fetchAllStockData = async () => {
      try {
        const listResponse = await fetch(`${apiBase()}/api/stocks`);
        if (!listResponse.ok) throw new Error("Failed to fetch stock list");
        const stockList: { ticker: string; name: string }[] = await listResponse.json();

        const detailedStockData = await Promise.all(
          stockList.map(async (stock) => {
            try {
              const detailResponse = await fetch(`${apiBase()}/api/stock/${stock.ticker}`);
              if (!detailResponse.ok) return { ...stock };
              const details = await detailResponse.json();
              if (details.error) return { ...stock };
              return { ...stock, ...details };
            } catch (e) {
              return { ...stock };
            }
          })
        );

        setStockListData(detailedStockData.filter(Boolean) as Stock[]);
      } catch (err) {
        setError("Failed to load market data. Is the backend running?");
      } finally {
        setLoading(false);
      }
    };
    fetchAllStockData();
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const search = async () => {
      try {
        const response = await fetch(`${apiBase()}/api/search/${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setSearchResults(data || []);
      } catch {
        setSearchResults([]);
      }
    };
    const debounce = setTimeout(() => search(), 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  if (selectedStock) {
    return <StockDetailPage stock={selectedStock} onBack={() => setSelectedStock(null)} />;
  }

  const listToDisplay = searchQuery.length >= 2 ? searchResults : stockListData;

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: "bold" }}>
        Market Watch
      </Typography>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search for stocks (e.g., Reliance, INFY)"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Typography color="error" sx={{ p: 4, textAlign: "center" }}>
          {error}
        </Typography>
      )}

      {!loading && !error && (
        <Grid container spacing={2}>
          {listToDisplay.map((stock) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={stock.ticker}>
              <Card
                sx={{
                  height: "100%",
                  backgroundColor: "background.paper",
                  borderRadius: "12px",
                  transition: "transform 0.2s",
                  "&:hover": { transform: "scale(1.03)" },
                }}
              >
                <CardActionArea
                  onClick={() => setSelectedStock(stock)}
                  sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start" }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Avatar sx={{ mr: 1.5, bgcolor: "primary.main" }}>{stock.ticker.charAt(0)}</Avatar>
                    <Typography sx={{ fontWeight: "bold", flexGrow: 1 }}>{stock.name}</Typography>
                  </Box>
                  <Box>
                    {stock.price !== undefined ? (
                      <>
                        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                          ₹{stock.price.toFixed(2)}
                        </Typography>
                        <PriceChangeDisplay change={stock.change} percent={stock.changePercent} />
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Click to view details
                      </Typography>
                    )}
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

/* --- Enhanced StockDetailPage with Buy / Sell modal + portfolio selection --- */
const StockDetailPage = ({ stock, onBack }: { stock: Stock; onBack: () => void }) => {
  const [fullStockData, setFullStockData] = useState<Stock | null>(null);

  // Dialog state
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [portfolioId, setPortfolioId] = useState<string>(""); // keep as string for MUI Select
  const [portfolioHoldings, setPortfolioHoldings] = useState<any[]>([]);
  const [simulatedCash, setSimulatedCash] = useState<number | null>(null); // per selected portfolio
  const [qty, setQty] = useState<number>(0);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // UI alerts
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");
  const [snackSeverity, setSnackSeverity] = useState<"success" | "error" | "info">("success");

  useEffect(() => {
    if (stock.price === undefined) {
      setFullStockData(null); // loading
      fetch(`${apiBase()}/api/stock/${stock.ticker}`)
        .then((res) => res.json())
        .then((data) => setFullStockData({ ...stock, ...data }))
        .catch(() => setFullStockData({ ...stock }));
    } else {
      setFullStockData(stock);
    }
  }, [stock]);

  // ensure logged in? helper
  const ensureLoggedIn = useCallback(async (): Promise<{ id: number; username: string } | null> => {
    try {
      const r = await fetch(`${apiBase()}/api/me`, { credentials: "include" });
      if (!r.ok) return null;
      const j = await r.json();
      return j && j.id ? j : null;
    } catch {
      return null;
    }
  }, []);

  // load user's portfolios (for selection in trade dialog)
  const loadPortfolios = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase()}/api/portfolios`, {
        credentials: "include",
      });
      if (res.ok) {
        const arr = await res.json();
        const normalized = (arr || []).map((p: any) => ({
          id: Number(p.id),
          name: p.name || `Portfolio #${p.id}`,
        }));
        if (normalized.length > 0) {
          for (const p of normalized) {
            try {
              const raw = localStorage.getItem(`simCash:portfolio:${p.id}`);
              p.cash = raw !== null ? Number(raw) : undefined;
            } catch {}
          }
          setPortfolios(normalized);
          return;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch /api/portfolios:", err);
    }

    // fallback local
    try {
      const keys = Object.keys(localStorage).filter((k) => /^portfolioSummary:\d+$/.test(k));
      const localList = keys.map((k) => {
        const idStr = k.split(":")[1];
        const id = Number(idStr || 0);
        let name = `Portfolio #${id}`;
        let cash: number | undefined = undefined;
        try {
          const parsed = JSON.parse(localStorage.getItem(k) || "{}");
          if (parsed && parsed.saved_at && parsed.name) name = parsed.name;
          cash = Number(parsed?.cash ?? undefined);
        } catch {}
        try {
          const sc = localStorage.getItem(`simCash:portfolio:${id}`);
          if (sc !== null) cash = Number(sc);
        } catch {}
        return { id, name, cash };
      });
      localList.sort((a, b) => a.id - b.id);
      setPortfolios(localList);
    } catch (err) {
      console.warn("Failed to build local portfolios list:", err);
      setPortfolios([]);
    }
  }, []);

  // load holdings for a portfolio id (number). This will attempt server first, then fallback to local summary.
  const loadPortfolioHoldings = useCallback(
    async (pid: number) => {
      if (!pid) {
        setPortfolioHoldings([]);
        setSimulatedCash(null);
        return;
      }
      let usedLocal = false;
      try {
        const res = await fetch(`${apiBase()}/api/portfolio/${pid}/holdings`, { credentials: "include" });
        if (!res.ok) {
          // If unauthorized or server error, fallback to local storage
          usedLocal = true;
        } else {
          const h = await res.json();
          // If server returned array use it
          if (Array.isArray(h)) {
            setPortfolioHoldings(h || []);
          } else {
            setPortfolioHoldings([]);
            usedLocal = true;
          }
        }
      } catch {
        usedLocal = true;
      }

      // simulated cash / local holdings fallback
      try {
        const rawCash = localStorage.getItem(`simCash:portfolio:${pid}`);
        if (rawCash !== null) setSimulatedCash(Number(rawCash));
        else {
          // if server provided no cash, try to infer from portfolioSummary
          const local = readLocalPortfolioSummary(pid);
          setSimulatedCash(Number(local.cash || 0));
        }

        if (usedLocal) {
          const local = readLocalPortfolioSummary(pid);
          setPortfolioHoldings(local.holdings || []);
        }
      } catch {
        setSimulatedCash(0);
      }
    },
    []
  );

  // user clicked buy or sell
  const openTradeDialog = async (type: "BUY" | "SELL") => {
    setTradeType(type);
    setQty(0);
    setTradeError(null);
    setPortfolioId("");
    await loadPortfolios();
    setTradeDialogOpen(true);
  };

  // when user picks a portfolio in the dialog
  useEffect(() => {
    if (portfolioId !== "") {
      const pid = Number(portfolioId);
      if (!Number.isNaN(pid)) loadPortfolioHoldings(pid);
    } else {
      setPortfolioHoldings([]);
      setSimulatedCash(null);
    }
  }, [portfolioId, loadPortfolioHoldings]);

  // helper: find how many of this ticker the portfolio currently holds
  const getHoldingQty = (pid: number) => {
    const h = portfolioHoldings.find((x) => (x.ticker || "").toUpperCase() === (stock.ticker || "").toUpperCase());
    return h ? Number(h.quantity || 0) : 0;
  };

  // compute max buyable quantity based on simulatedCash and current price
  const maxBuyQty = () => {
    const price = Number(fullStockData?.price || stock.price || 0);
    const cash = Number(simulatedCash || 0);
    if (!price || price <= 0) return 0;
    return Math.floor(cash / price);
  };

  // NEW: server-first trade with graceful local fallback
  const handleConfirmTrade = async () => {
    setTradeError(null);
    if (portfolioId === "") {
      setTradeError("Please select a portfolio.");
      return;
    }
    const pid = Number(portfolioId);
    if (!Number.isFinite(pid) || pid <= 0) {
      setTradeError("Invalid portfolio selection.");
      return;
    }
    if (!qty || qty <= 0) {
      setTradeError("Enter a valid quantity (>0).");
      return;
    }
    const price = Number(fullStockData?.price || stock.price || 0) || 0;

    // quick client-side checks
    if (tradeType === "BUY") {
      const cost = qty * price;
      const cash = Number(simulatedCash || 0);
      if (cost > cash + 1e-6) {
        setTradeError(`Insufficient cash. Max buyable: ${maxBuyQty()} shares (~₹${(maxBuyQty() * price).toFixed(2)}).`);
        return;
      }
    } else {
      const holdingQty = getHoldingQty(pid);
      if (qty > holdingQty) {
        setTradeError(`Invalid quantity. You only have ${holdingQty} shares in this portfolio.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      // 1) Check if logged in by calling /api/me
      const me = await ensureLoggedIn();

      if (me) {
        // Try server trade
        const res = await fetch(`${apiBase()}/api/portfolio/${pid}/trade`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: stock.ticker,
            type: tradeType,
            quantity: qty,
            price: price,
          }),
        });

        const d = await res.json().catch(() => ({}));
        if (res.status === 401) {
          // server refuses -> fallback to local simulation
          setTradeError(null);
          // do local simulation below
        } else if (!res.ok) {
          const msg = d.error || "Trade failed";
          setTradeError(msg);
          setSnackMsg(msg);
          setSnackSeverity("error");
          setSnackOpen(true);
          setSubmitting(false);
          return;
        } else {
          // server success path
          const cost = qty * price;
          try {
            const key = `simCash:portfolio:${pid}`;
            const raw = localStorage.getItem(key);
            let curr = raw ? Number(raw) : 0;
            if (tradeType === "BUY") curr = Math.max(0, curr - cost);
            else curr = curr + cost;
            localStorage.setItem(key, String(curr));
            setSimulatedCash(curr);
          } catch {}
          // refresh holdings from server (server source of truth)
          await loadPortfolioHoldings(pid);
          setSnackMsg(`Trade executed (server): ${tradeType} ${qty} ${stock.ticker} @ ₹${price.toFixed(2)}`);
          setSnackSeverity("success");
          setSnackOpen(true);
          // refresh price
          try {
            const latest = await fetch(`${apiBase()}/api/stock/${stock.ticker}`).then((r) => r.json());
            setFullStockData({ ...fullStockData!, ...latest });
          } catch {}
          setTradeDialogOpen(false);
          setSubmitting(false);
          return;
        }
      }

      // FALLBACK: local simulation (either because not logged in, or server gave 401)
      // We'll update simCash and portfolioSummary in localStorage
      const cost = qty * price;
      try {
        const key = `simCash:portfolio:${pid}`;
        const rawCash = localStorage.getItem(key);
        let curr = rawCash ? Number(rawCash) : simulatedCash || 100000.0; // default simulated cash if none set
        if (tradeType === "BUY") {
          if (cost > curr + 1e-6) {
            setTradeError(`Insufficient simulated cash. Max buyable ${maxBuyQty()}`);
            setSubmitting(false);
            return;
          }
          curr = Math.max(0, curr - cost);
        } else {
          // SELL -> check local holdings
          const summary = readLocalPortfolioSummary(pid);
          const found = (summary.holdings || []).find((h: any) => (h.ticker || "").toUpperCase() === stock.ticker.toUpperCase());
          const have = found ? Number(found.quantity || 0) : 0;
          if (qty > have) {
            setTradeError(`Invalid quantity. You only have ${have} shares in this local portfolio.`);
            setSubmitting(false);
            return;
          }
          curr = curr + cost;
          // remove or decrease holding
          if (found) {
            found.quantity = Math.max(0, have - qty);
          }
          summary.cash = curr;
          writeLocalPortfolioSummary(pid, summary);
        }

        // write updated cash
        localStorage.setItem(key, String(curr));
        setSimulatedCash(curr);

        if (tradeType === "BUY") {
          const summary = readLocalPortfolioSummary(pid);
          let found = (summary.holdings || []).find((h: any) => (h.ticker || "").toUpperCase() === stock.ticker.toUpperCase());
          if (found) {
            const prevQty = Number(found.quantity || 0);
            const prevAvg = Number(found.avg_cost || found.avgCost || 0);
            const newQty = prevQty + qty;
            const newAvg = newQty > 0 ? ((prevAvg * prevQty) + price * qty) / newQty : price;
            found.quantity = newQty;
            found.avg_cost = Number(newAvg.toFixed(2));
          } else {
            summary.holdings = summary.holdings || [];
            summary.holdings.push({ ticker: stock.ticker, quantity: qty, avg_cost: price, current_price: price });
          }
          summary.cash = curr;
          writeLocalPortfolioSummary(pid, summary);
        }

        // refresh holdings shown in dialog
        await loadPortfolioHoldings(pid);

        setSnackMsg(`Simulated trade executed: ${tradeType} ${qty} ${stock.ticker} @ ₹${price.toFixed(2)}`);
        setSnackSeverity("success");
        setSnackOpen(true);
        setTradeDialogOpen(false);
      } catch (err: any) {
        setTradeError("Local simulation failed: " + (err?.message || err));
        setSnackMsg("Local simulation failed");
        setSnackSeverity("error");
        setSnackOpen(true);
      }
    } catch (err: any) {
      setTradeError("Network/processing error: " + (err?.message || err));
      setSnackMsg("Network/processing error");
      setSnackSeverity("error");
      setSnackOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!fullStockData) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isPositive = (fullStockData.change || 0) >= 0;
  const color = isPositive ? "#4caf50" : "#f44336";

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <IconButton onClick={onBack}>
          <ArrowBack />
        </IconButton>
        <Avatar sx={{ mr: 1.5, bgcolor: "primary.main" }}>{fullStockData.ticker.charAt(0)}</Avatar>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            {fullStockData.ticker}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {fullStockData.name}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" sx={{ fontWeight: "bold" }}>
          ₹{fullStockData.price?.toFixed(2)}
        </Typography>
        <Typography sx={{ color, fontWeight: "medium", display: "flex", alignItems: "center" }}>
          {isPositive ? <ArrowUpward sx={{ fontSize: 18, mr: 0.5 }} /> : <ArrowDownward sx={{ fontSize: 18, mr: 0.5 }} />}
          {fullStockData.change?.toFixed(2)} ({fullStockData.changePercent?.toFixed(2)}%) Today
        </Typography>
      </Box>

      <Box sx={{ height: { xs: 250, sm: 400 }, mb: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={fullStockData.history}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="time" stroke="rgba(255, 255, 255, 0.5)" angle={-30} textAnchor="end" height={50} />
            <YAxis domain={["dataMin - 20", "dataMax + 20"]} stroke="rgba(255, 255, 255, 0.5)" hide />
            <Tooltip contentStyle={{ backgroundColor: "#2a2a2a", border: "1px solid #444", borderRadius: "8px" }} />
            <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fillOpacity={1} fill="url(#chartGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Button fullWidth variant="contained" color="error" sx={{ py: 1.5, fontWeight: "bold" }} onClick={() => openTradeDialog("SELL")}>
            Sell
          </Button>
        </Grid>
        <Grid item xs={6}>
          <Button fullWidth variant="contained" color="success" sx={{ py: 1.5, fontWeight: "bold" }} onClick={() => openTradeDialog("BUY")}>
            Buy
          </Button>
        </Grid>
      </Grid>

      {/* Trade Dialog */}
      <Dialog open={tradeDialogOpen} onClose={() => setTradeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {tradeType} {fullStockData.ticker}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 2, flexDirection: "column", mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="portfolio-select-label">Portfolio</InputLabel>
              <Select
                labelId="portfolio-select-label"
                value={portfolioId}
                label="Portfolio"
                onChange={(e: SelectChangeEvent<string>) => setPortfolioId(e.target.value)}
                renderValue={(val) => {
                  if (!val) return "Select portfolio";
                  const p = portfolios.find((x) => x.id === Number(val));
                  if (!p) return String(val);
                  return p.cash !== undefined ? `${p.name} — ₹${Number(p.cash).toFixed(2)}` : p.name;
                }}
              >
                <MenuItem value="">
                  <em>Select portfolio</em>
                </MenuItem>

                {portfolios.map((p) => (
                  <MenuItem key={p.id} value={String(p.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <span>{p.name || `Portfolio #${p.id}`}</span>
                      {p.cash !== undefined && <span style={{ opacity: 0.8 }}>₹{Number(p.cash).toFixed(2)}</span>}
                    </div>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Quantity"
              type="number"
              value={qty || ""}
              onChange={(e) => setQty(Math.max(0, Math.floor(Number(e.target.value || 0))))}
              inputProps={{ min: 0 }}
              helperText={tradeType === "BUY" ? `Max buyable: ${maxBuyQty()} shares` : `You hold: ${getHoldingQty(Number(portfolioId || "0"))} shares`}
            />

            <Box>
              <Typography variant="body2">Price per share: ₹{(fullStockData.price || 0).toFixed(2)}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Total cost/credit: ₹{(qty * (fullStockData.price || 0)).toFixed(2)}
              </Typography>
              {simulatedCash !== null && tradeType === "BUY" && (
                <Typography variant="caption" color="text.secondary">
                  Portfolio simulated cash: ₹{Number(simulatedCash).toFixed(2)}
                </Typography>
              )}
            </Box>

            {tradeError && <Typography color="error">{tradeError}</Typography>}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setTradeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmTrade} variant="contained" disabled={submitting}>
            {submitting ? "Processing…" : `Confirm ${tradeType}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar alerts */}
      <Snackbar open={snackOpen} autoHideDuration={4000} onClose={() => setSnackOpen(false)}>
        <MuiAlert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: "100%" }}>
          {snackMsg}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};
