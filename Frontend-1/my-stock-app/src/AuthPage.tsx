// Frontend/my-stock-app/src/AuthPage.tsx
import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Tabs, Tab } from '@mui/material';
import {apiUrl} from "./api";

interface AuthPageProps {
  onLoginSuccess: (token?: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // IMPORTANT: use relative paths so vite proxy handles them -> cookies work
  const urlFor = (m: 'login' | 'signup') => (m === "login" ? apiUrl("/api/login") : apiUrl("/api/register"));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const url = urlFor(mode);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // critical to include cookies
        body: JSON.stringify({ username, password }),
      });

      // Try parse JSON - backend returns JSON on success/error
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Server responded with non-JSON (status ${response.status})`);
      }

      if (!response.ok) {
        // Use returned error message if present
        throw new Error(data?.error || `Server responded ${response.status}`);
      }

      if (mode === 'signup') {
        setSuccess('Registration successful! Please log in.');
        setMode('login');
      } else {
        // Login succeeded — backend has set session cookie (if proxy + CORS configured)
        onLoginSuccess(data?.token);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'background.default' }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400, borderRadius: '12px', backgroundColor: 'background.paper' }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Smart AI Coach
        </Typography>

        <Tabs value={mode} onChange={(_e, nv) => setMode(nv as 'login' | 'signup')} centered sx={{ mb: 3 }}>
          <Tab label="Login" value="login" />
          <Tab label="Sign Up" value="signup" />
        </Tabs>

        <form onSubmit={handleSubmit}>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <Typography color="error" align="center" sx={{ mt: 2 }}>{error}</Typography>}
          {success && <Typography color="success.main" align="center" sx={{ mt: 2 }}>{success}</Typography>}
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 3, py: 1.5, fontWeight: 'bold' }}>
            {mode === 'login' ? 'Login' : 'Create Account'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default AuthPage;
