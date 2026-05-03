import { useState } from 'react';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ProjectsPage from './pages/ProjectsPage';
import SchedulePage from './pages/SchedulePage';

type Tab = 'home' | 'about' | 'projects' | 'schedule';

const TABS: { key: Tab; label: string }[] = [
  { key: 'home',     label: 'HOME' },
  { key: 'about',    label: 'ABOUT' },
  { key: 'projects', label: 'PROJECTS' },
  { key: 'schedule', label: 'SCHEDULE' },
];

export default function MobileApp() {
  const [active, setActive] = useState<Tab>('home');

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#000', boxSizing: 'border-box' }}>
      {/* Top nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        borderBottom: '1px solid #1a2a1a',
        background: '#000',
        flexShrink: 0,
        padding: '0 4px',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              borderBottom: active === tab.key ? '2px solid #16a34a' : '2px solid transparent',
              color: active === tab.key ? '#16a34a' : '#3a5a3a',
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 'bold',
              letterSpacing: '0.1em',
              padding: '14px 4px',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Page content */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {active === 'home'     && <HomePage />}
        {active === 'about'    && <AboutPage />}
        {active === 'projects' && <ProjectsPage />}
        {active === 'schedule' && <SchedulePage perPage={5} fullPage />}
      </div>
    </div>
  );
}
