import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Dev-only error trap: headless preview tooling can't always see uncaught
// exceptions, so collect them where an eval can read them back.
if (import.meta.env.DEV) {
  const errs: string[] = []
  ;(window as unknown as { __errs: string[] }).__errs = errs
  window.addEventListener('error', (e) => {
    errs.push(String(e.error instanceof Error ? e.error.stack : e.message))
  })
  window.addEventListener('unhandledrejection', (e) => {
    errs.push(`unhandledrejection: ${String(e.reason)}`)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
