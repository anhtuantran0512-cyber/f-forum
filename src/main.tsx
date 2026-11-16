/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/forumDesignSystem.css';
import './styles/responsiveExperience.css';
import './styles/fabulousTheme.css';
import './styles/warmEditorialBrutalism.css';
import App from './App.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AdaptiveQualityProvider } from './context/AdaptiveQualityContext';
import { registerAdaptiveServiceWorker } from './utils/backgroundSyncQueue';
import { resetChunkFlagsAfterAutoReload } from './utils/lazyWithRetry';

if (typeof window !== 'undefined') {
  registerAdaptiveServiceWorker();
  resetChunkFlagsAfterAutoReload();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AdaptiveQualityProvider>
        <App />
      </AdaptiveQualityProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
