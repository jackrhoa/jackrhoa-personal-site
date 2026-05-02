import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import MobileApp from './MobileApp.tsx'
import SchedulePage from './pages/SchedulePage.tsx'

const isMobile = window.innerWidth < 768;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isMobile ? <MobileApp /> : <App />} />
        <Route path="/schedule" element={<SchedulePage perPage={7} fullPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
