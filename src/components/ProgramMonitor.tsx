import type { Source } from '../sources';
import { SOURCE_PAGES } from '../sourcePages';
import ColorBars from './ColorBars';

interface Props {
  source: Source;
  previewSource: Source;
  crossfadeOpacity: number; // 0–1, how much of previewSource is visible
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

export default function ProgramMonitor({ source, previewSource, crossfadeOpacity }: Props) {
  const previewOpacity = crossfadeOpacity;

  return (
    <div className="relative flex-1 overflow-hidden rounded" style={{ minHeight: 0, background: source.bg }}>
      {/* Program layer */}
      <div className="absolute inset-0">
        <SourceDisplay source={source} />
      </div>

      {/* Preview crossfade layer */}
      {previewOpacity > 0 && (
        <div className="absolute inset-0" style={{ opacity: previewOpacity }}>
          <SourceDisplay source={previewSource} />
        </div>
      )}

      {/* ON AIR badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded" style={{ background: 'rgba(0,0,0,0.75)', zIndex: 10 }}>
        <span className="on-air-pulse inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
        <span className="text-xs font-bold tracking-widest text-red-400">ON AIR</span>
      </div>

      {/* Source label */}
      <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded text-xs tracking-widest" style={{ background: 'rgba(0,0,0,0.75)', zIndex: 10 }}>
        {source.label}
      </div>
    </div>
  );
}
