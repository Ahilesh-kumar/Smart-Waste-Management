import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import ErrorBoundary from './ErrorBoundary.jsx'

// Debug: Show any initialization errors directly on the page
try {
  console.log('[DEBUG] Starting React initialization...');
  const rootElement = document.getElementById('root');
  console.log('[DEBUG] Root element:', rootElement);

  const root = createRoot(rootElement);
  console.log('[DEBUG] Root created, rendering App...');

  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );

  console.log('[DEBUG] Render called successfully');
} catch (error) {
  console.error('[CRITICAL] React initialization failed:', error);
  document.getElementById('root').innerHTML = `
    <div style="padding: 40px; background: #ff6b6b; color: white; font-family: monospace;">
      <h1>⚠️ React Initialization Failed</h1>
      <pre style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 8px; overflow: auto;">
${error.stack || error.message || error}
      </pre>
    </div>
  `;
}
