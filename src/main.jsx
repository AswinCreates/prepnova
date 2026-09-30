import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--pn-panel)',
            color: 'var(--pn-ink)',
            border: '1px solid var(--pn-border)',
          },
        }}
      />
      <App />
    </ThemeProvider>
  </StrictMode>,
)