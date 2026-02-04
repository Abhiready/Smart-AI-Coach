// src/PortfolioPage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "./api";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CloudOffIcon from "@mui/icons-material/CloudOff";

const LOCAL_KEY = "localPortfolios_v1";
const apiBase = () => ""; // keep as original (relative api endpoints)

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
      const res = await fetch(apiUrl("/api/portfolios"), { credentials: "include" });
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
      const res = await fetch(apiUrl("/api/portfolios"), {
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
        const id = local.length ? Math.max(...local.map((p) => p.id)) + 1 : 1;
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
      const id = local.length ? Math.max(...local.map((p) => p.id)) + 1 : 1;
      const created = { id, name, created_at: new Date().toISOString() };
      const updated = [...local, created];
      saveLocal(updated);
      setPortfolios(updated);
      setNewPortfolio("");
      setError("Created locally (backend unavailable).");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <FolderOpenIcon color="primary" />
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Portfolio
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Box>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            color="primary"
            onClick={handleAddPortfolio}
            disabled={!newPortfolio.trim()}
            sx={{ mr: 1 }}
          >
            Add
          </Button>
        </Box>
      </Stack>

      <Card sx={{ background: "#0b0d11", color: "white", mb: 3 }}>
        <CardContent sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            placeholder="Enter portfolio name"
            value={newPortfolio}
            onChange={(e) => setNewPortfolio(e.target.value)}
            size="small"
            sx={{
              input: { color: "white" },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.06)" },
              "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.6)" },
            }}
            InputLabelProps={{ shrink: false }}
          />
          <Button
            variant="outlined"
            onClick={handleAddPortfolio}
            startIcon={<AddIcon />}
            disabled={!newPortfolio.trim()}
            sx={{ borderColor: "rgba(255,255,255,0.06)", color: "white" }}
          >
            Create
          </Button>

          <Box sx={{ flex: 1 }} />

          {loading ? (
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
              Loading…
            </Typography>
          ) : error ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title="Offline / local mode">
                <CloudOffIcon sx={{ color: "orange" }} />
              </Tooltip>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                {error}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
              {portfolios.length} portfolio{portfolios.length !== 1 ? "s" : ""}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card sx={{ background: "#0b0d11", color: "white", mb: 4 }}>
        <CardContent>
          {portfolios.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                alignItems: "center",
                justifyContent: "center",
                py: 6,
                textAlign: "center",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                No portfolios yet
              </Typography>
              <Typography variant="body2">Create a portfolio to start trading and tracking holdings.</Typography>
              <Button variant="contained" onClick={() => (document.querySelector("input") as HTMLInputElement)?.focus()}>
                Create your first portfolio
              </Button>
            </Box>
          ) : (
            <List>
              {portfolios.map((p) => (
                <React.Fragment key={p.id}>
                  <ListItem
                    secondaryAction={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
                          {new Date(p.created_at || new Date().toISOString()).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      px: { xs: 1, md: 2 },
                      py: 1.5,
                      "&:hover": { background: "rgba(255,255,255,0.02)" },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: "#1f2937", color: "white" }}>{(p.name || "P").charAt(0).toUpperCase()}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Link
                          to={`/portfolio/${p.id}`}
                          style={{ textDecoration: "none", color: "inherit", fontWeight: 700 }}
                        >
                          {p.name}
                        </Link>
                      }
                      secondary={<Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>View & manage</Typography>}
                    />
                  </ListItem>
                  <Divider sx={{ borderColor: "rgba(255,255,255,0.03)" }} />
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)" }}>
          Tip: If you're not logged in the app falls back to local-only mode — portfolios created locally are stored in
          your browser's Local Storage.
        </Typography>
      </Box>
    </Box>
  );
};

export default PortfolioPage;
