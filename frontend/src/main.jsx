// Member 1 owns this file. Member 5 needs only the two marked additions:
// (1) <LanguageProvider> around <App/>, (2) registerPWA() once at start-up.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { LanguageProvider } from './features/i18n'; // Member 5 (1)
import { registerPWA } from './features/offline/registerPWA.js'; // Member 5 (2)
import './index.css';

registerPWA(); // Member 5 (2): registers the single vite-plugin-pwa service worker

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
