import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { SettingsProvider } from './lib/settings'
import { AccountProvider } from './lib/auth'
import { Toaster } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SUPABASE_ERROR } from './lib/supabase'
import './index.css'

const root = createRoot(document.getElementById('root')!)

if (SUPABASE_ERROR) {
  root.render(
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '15vh auto', padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>The shop can't connect to its database</h1>
      <p style={{ marginTop: 12, color: '#555' }}>{SUPABASE_ERROR}</p>
      <p style={{ marginTop: 12, color: '#555' }}>Fix the value in Cloudflare (Settings, then Build, then Build variables) and redeploy.</p>
    </div>,
  )
} else root.render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <AccountProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </AccountProvider>
        <Toaster />
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
