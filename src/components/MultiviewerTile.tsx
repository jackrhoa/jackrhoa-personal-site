import type { Source } from '../sources';
import { SOURCE_PAGES } from '../sourcePages';
import ColorBars from './ColorBars';

const VW = 1280;
const VH = 720;
const TILE_H = 90;
const TILE_W = Math.round(TILE_H * (16 / 9)); // 160 — exact 16:9, no letterbox
const SCALE = TILE_H / VH;

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
  isProgram: boolean;
  isPreview: boolean;
  showKeyOverlay: boolean;
  keyOnAir: boolean;
  onClick: () => void;
}

export default function MultiviewerTile({ source, isProgram, isPreview, showKeyOverlay, keyOnAir, onClick }: Props) {
  let borderColor = '#374151'; // gray-700
  let umdBg = '#111';
  let umdText = '#888';
  let statusLabel = '';

  if (isProgram) {
    borderColor = '#ef4444';
    umdBg = '#450a0a';
    umdText = '#fca5a5';
    statusLabel = 'PGM';
  } else if (isPreview) {
    borderColor = '#22c55e';
    umdBg = '#052e16';
    umdText = '#86efac';
    statusLabel = 'PVW';
  } else if (keyOnAir) {
    borderColor = '#ef4444';
    umdBg = '#450a0a';
    umdText = '#fca5a5';
  }

  return (
    <div
      className="flex flex-col rounded cursor-pointer overflow-hidden flex-shrink-0"
      style={{ border: `2px solid ${borderColor}`, width: TILE_W }}
      onClick={onClick}
      title={`Click to set ${source.label} as PREVIEW`}
    >
      {/* Scaled source content — exact 16:9, no letterbox */}
      <div style={{ height: TILE_H, overflow: 'hidden', position: 'relative', flex: '0 0 auto', contain: 'strict' }}>
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
        {showKeyOverlay && (
          <div style={{ position: 'absolute', top: 2, right: 2, zIndex: 4, opacity: 0.85 }}>
            <svg width="18" height="18" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="black" fillOpacity="0.5" />
              <path d="M12 8 L12 20 Q12 24 8 24 Q4 24 4 20" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 8 L18 24 M18 8 L22 8 Q26 8 26 12 Q26 16 22 16 L18 16 M22 16 L26 24" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        {/* Status badge overlay */}
        {statusLabel && (
          <div
            className="absolute top-1 left-1 text-white font-bold px-1 rounded"
            style={{
              background: isProgram ? '#dc2626' : '#16a34a',
              fontSize: '10px',
              zIndex: 5,
            }}
          >
            {statusLabel}
          </div>
        )}
        {keyOnAir && !isProgram && !isPreview && (
          <div
            className="absolute top-1 left-1 text-white font-bold px-1 rounded"
            style={{ background: '#dc2626', fontSize: '10px', zIndex: 5 }}
          >
            KEY
          </div>
        )}
      </div>

      {/* UMD strip */}
      <div
        className="text-center font-bold tracking-widest truncate px-1"
        style={{ background: umdBg, color: umdText, fontSize: '10px', padding: '2px 4px', flexShrink: 0 }}
      >
        {source.label}
      </div>
    </div>
  );
}
