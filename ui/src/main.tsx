import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './lib/amplify'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/chatbot" element={<App />} />
        <Route path="/" element={<Navigate to="/chatbot" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
