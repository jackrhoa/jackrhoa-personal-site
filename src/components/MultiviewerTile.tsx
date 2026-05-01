import type { Source } from '../sources';
import { SOURCE_PAGES } from '../sourcePages';
import ColorBars from './ColorBars';

const VW = 1280;
const VH = 720;
const TILE_H = 130; // matches the multiviewer height minus UMD strip
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
  onClick: () => void;
}

export default function MultiviewerTile({ source, isProgram, isPreview, onClick }: Props) {
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
  }

  return (
    <div
      className="flex flex-col flex-1 rounded cursor-pointer overflow-hidden"
      style={{ border: `2px solid ${borderColor}`, minWidth: 0 }}
      onClick={onClick}
      title={`Click to set ${source.label} as PREVIEW`}
    >
      {/* Scaled source content — centered horizontally */}
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

        {/* Status badge overlay */}
        {statusLabel && (
          <div
            className="absolute top-1 right-1 text-white font-bold px-1 rounded"
            style={{
              background: isProgram ? '#dc2626' : '#16a34a',
              fontSize: '10px',
              zIndex: 5,
            }}
          >
            {statusLabel}
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
