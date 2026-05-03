import type { Source } from '../sources';
import { SOURCE_PAGES } from '../sourcePages';
import ColorBars from './ColorBars';

interface Props {
  source: Source;
  previewSource: Source;
  crossfadeOpacity: number;
  key1Opacity: number; // 0–1, watermark overlay intensity
}

function SourceDisplay({ source }: { source: Source }) {
  if (source.isColorBars) return <ColorBars />;
  if (source.pageKey) {
    const Page = SOURCE_PAGES[source.pageKey];
    return <div style={{ width: '100%', height: '100%' }}><Page /></div>;
  }
  return (
    <div style={{ width: '100%', height: '100%', background: source.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: source.text, fontSize: '48px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
        {source.label}
      </span>
    </div>
  );
}

function WatermarkOverlay() {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', top: '3.5%', right: '3.5%', width: '10%', height: 'auto' }}
    >
      <circle cx="16" cy="16" r="16" fill="black" fillOpacity="0.4" />
      <path d="M12 8 L12 20 Q12 24 8 24 Q4 24 4 20"
        stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 8 L18 24 M18 8 L22 8 Q26 8 26 12 Q26 16 22 16 L18 16 M22 16 L26 24"
        stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProgramMonitor({ source, previewSource, crossfadeOpacity, key1Opacity }: Props) {
  return (
    <div className="relative flex-1 overflow-hidden rounded" style={{ minHeight: 0, background: '#000' }}>
      {/* Program layer */}
      <div className="absolute inset-0">
        <SourceDisplay source={source} />
      </div>

      {/* Preview crossfade layer */}
      {crossfadeOpacity > 0 && (
        <div className="absolute inset-0" style={{ opacity: crossfadeOpacity }}>
          <SourceDisplay source={previewSource} />
        </div>
      )}

      {/* Key 1 overlay — watermark on top of everything */}
      {key1Opacity > 0 && (
        <div className="absolute inset-0" style={{ opacity: key1Opacity, pointerEvents: 'none' }}>
          <WatermarkOverlay />
        </div>
      )}

      {/* ON AIR badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded" style={{ background: 'rgba(0,0,0,0.75)', zIndex: 10 }}>
        <span className="on-air-pulse inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
        <span className="text-xs font-bold tracking-widest text-red-400">ON AIR</span>
      </div>

      {/* Source label */}
      <div data-testid="program-label" className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-xs tracking-widest" style={{ background: 'rgba(0,0,0,0.75)', zIndex: 10 }}>
        {source.label}
      </div>
    </div>
  );
}
