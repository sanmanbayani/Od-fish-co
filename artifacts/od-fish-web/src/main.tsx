import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Must be imported before anything that can issue a request, so the API base
// URL and credentials mode are configured before the first fetch goes out.
import './lib/api-config';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
