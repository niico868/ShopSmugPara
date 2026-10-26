import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { SettingsProvider } from './lib/settings'
import { AccountProvider } from './lib/auth'
import { Toaster } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

createRoot(document.getElementById('root')!).render(
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
