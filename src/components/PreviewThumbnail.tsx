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
}

export default function PreviewThumbnail({ source }: Props) {
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
