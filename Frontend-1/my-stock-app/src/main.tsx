import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App.js';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* The Router must wrap your entire App to enable routing */}
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);

