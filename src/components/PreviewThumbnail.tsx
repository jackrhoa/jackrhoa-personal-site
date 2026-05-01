import type { Source } from '../sources';
import { SOURCE_PAGES } from '../sourcePages';
import ColorBars from './ColorBars';

// Virtual render size — content is designed for this viewport
const VW = 1280;
const VH = 720;
// Thumbnail display size
const THUMB_W = 192;
const THUMB_H = 108;
const SCALE = THUMB_H / VH;

function SourceDisplay({ source }: { source: Source }) {
  if (source.isColorBars) return <ColorBars />;
  if (source.pageKey) {
    const Page = SOURCE_PAGES[source.pageKey];
    return <Page />;
  }
  return (
    <div style={{ width: '100%', height: '100%', background: source.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: source.text, fontSize: '80px', fontWeight: 'bold', fontFamily: 'monospace' }}>
        {source.label}
      </span>
    </div>
  );
}

interface Props {
  source: Source;
  showKey: boolean;
}

export default function PreviewThumbnail({ source, showKey }: Props) {
  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded border-2 border-green-500"
      style={{ width: THUMB_W, height: THUMB_H }}
    >
      {/* Scaled content — centered horizontally */}
      <div style={{
        position: 'absolute',
        width: VW,
        height: VH,
        left: '50%',
        top: 0,
        transform: `translateX(-50%) scale(${SCALE})`,
        transformOrigin: 'top center',
        pointerEvents: 'none',
      }}>
        <SourceDisplay source={source} />
      </div>

      {/* Key 1 watermark overlay */}
      {showKey && (
        <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 5, opacity: 0.85 }}>
          <svg width="22" height="22" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="16" fill="black" fillOpacity="0.5" />
            <path d="M12 8 L12 20 Q12 24 8 24 Q4 24 4 20" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 8 L18 24 M18 8 L22 8 Q26 8 26 12 Q26 16 22 16 L18 16 M22 16 L26 24" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* UP NEXT badge */}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.8)', zIndex: 10 }}>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
        <span className="text-green-400 font-bold tracking-widest" style={{ fontSize: '9px' }}>UP NEXT</span>
      </div>

      {/* Source label */}
      <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded tracking-widest" style={{ background: 'rgba(0,0,0,0.8)', fontSize: '9px', zIndex: 10 }}>
        {source.label}
      </div>
    </div>
  );
}
