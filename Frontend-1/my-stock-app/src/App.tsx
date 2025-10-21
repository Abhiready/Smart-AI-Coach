// Frontend/my-stock-app/src/App.tsx
import React from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import PrivateRoute  from './PrivateRoute';
import AuthPage from './AuthPage';
import StocksPage from './StocksPage';
import AiCoachPage from './AiCoachPage';
import LearnPage from './LearnPage';
import PortfolioPage from './PortfolioPage';
import PortfolioDetail from './PortfolioDetail';

import {
  Box, AppBar, Toolbar, Typography, CssBaseline, ThemeProvider, createTheme,
  Paper, BottomNavigation, BottomNavigationAction, Container
} from '@mui/material';
import {
  Home as HomeIcon,
  School as SchoolIcon,
  AutoAwesome as AiCoachIcon,
  ShowChart as ShowChartIcon,
  Login as LoginIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

const darkTheme = createTheme({
  palette: { mode: 'dark', primary: { main: '#90caf9' }, background: { default: '#121212', paper: '#1e1e1e' } },
  typography: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' },
});

const menuItems: { label: string; value: string; icon: React.ReactNode }[] = [
  { label: 'Stocks', value: '/', icon: <HomeIcon /> },
  { label: 'AI Coach', value: '/coach', icon: <AiCoachIcon /> },
  { label: 'Learn', value: '/learn', icon: <SchoolIcon /> },
  { label: 'Portfolio', value: '/portfolio', icon: <ShowChartIcon /> },
];

const getPageTitle = (path: string) => menuItems.find(m => m.value === path)?.label || 'Stocks';

const InnerApp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  // bottom navigation state
  const [value, setValue] = React.useState<string>(location.pathname);
  React.useEffect(() => setValue(location.pathname), [location.pathname]);

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ backgroundColor: 'background.paper', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <Toolbar>
            <ShowChartIcon color="primary" sx={{ mr: 1.5 }} />
            <Typography variant="h6" noWrap component="div" color="primary">
              {getPageTitle(location.pathname)}
            </Typography>
          </Toolbar>
        </AppBar>

        <Container component="main" maxWidth="xl" sx={{ mt: '64px', mb: '56px', flexGrow: 1, overflowY: 'auto', py: 3 }}>
          <Routes>
            <Route path="/auth" element={<AuthPageWrapper />} />

            <Route path="/" element={<PrivateRoute><StocksPage /></PrivateRoute>} />
            <Route path="/coach" element={<PrivateRoute><AiCoachPage /></PrivateRoute>} />
            <Route path="/learn" element={<PrivateRoute><LearnPage /></PrivateRoute>} />
            <Route path="/portfolio" element={<PrivateRoute><PortfolioPage /></PrivateRoute>} />
            <Route path="/portfolio/:id" element={<PrivateRoute><PortfolioDetail /></PrivateRoute>} />
            <Route path="*" element={<PrivateRoute><StocksPage /></PrivateRoute>} />
          </Routes>
        </Container>

        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
          <BottomNavigation
            showLabels
            value={value}
            onChange={(_e, newValue) => {
              const nv = String(newValue);
              setValue(nv);
              if (nv === '/logout') {
                logout();
                navigate('/auth');
              } else {
                navigate(nv);
              }
            }}
            sx={{ backgroundColor: 'background.paper' }}
          >
            {isAuthenticated && menuItems.map(item => (
              <BottomNavigationAction
                key={item.label}
                label={item.label}
                value={item.value}
                icon={item.icon}
                component={Link}
                to={item.value}
              />
            ))}

            {!isAuthenticated ? (
              <BottomNavigationAction
                label="Auth"
                value="/auth"
                icon={<LoginIcon />}
                component={Link}
                to="/auth"
              />
            ) : (
              <BottomNavigationAction
                label="Logout"
                value="/logout"
                icon={<LogoutIcon />}
              />
            )}
          </BottomNavigation>
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

// wrapper so AuthPage can call loginWithToken from context
const AuthPageWrapper: React.FC = () => {
  const { loginWithToken } = useAuth();
  return <AuthPage onLoginSuccess={(token?: string) => loginWithToken(token)} />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
};

export default App;
