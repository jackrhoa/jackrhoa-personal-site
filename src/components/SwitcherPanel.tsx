import BusRow from './BusRow';
import TransitionSection from './TransitionSection';

interface Props {
  programIdx: number;
  previewIdx: number;
  tBarPosition: number;
  isTransitioning: boolean;
  nextTransBkgd: boolean;
  nextTransKey1: boolean;
  key1Active: boolean;
  key1Transitioning: boolean;
  hintStep: number;
  onProgramSelect: (idx: number) => void;
  onPreviewSelect: (idx: number) => void;
  onTBarChange: (val: number) => void;
  onCut: () => void;
  onAuto: () => void;
  onCutKey1: () => void;
  onAutoKey1: () => void;
  onToggleBkgd: () => void;
  onToggleKey1: () => void;
}

const TBAR_HEIGHT = 80;

// Light-blue when selected, gray when not
function NextTransToggles({ bkgd, key1, onBkgd, onKey1 }: {
  bkgd: boolean; key1: boolean; onBkgd: () => void; onKey1: () => void;
}) {
  const btn = (active: boolean, label: string, onClick: () => void, title: string) => (
    <button
      onClick={onClick}
      title={title}
      className="rounded border border-black/40 font-bold tracking-widest uppercase"
      style={{
        width: 38, height: 28, fontSize: '9px',
        background: active ? '#1d6fa4' : '#3a3a3a',
        boxShadow: active
          ? '0 0 6px rgba(56,182,255,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
          : 'inset 0 1px 0 rgba(255,255,255,0.06)',
        color: active ? '#e0f4ff' : '#777',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="tracking-widest uppercase" style={{ fontSize: '9px', color: '#888' }}>NEXT TRANS</span>
      <div className="flex gap-1">
        {btn(bkgd, 'BKGD', onBkgd, 'Background changes on next transition')}
        {btn(key1, 'KEY 1', onKey1, 'Key 1 toggles on next transition')}
      </div>
    </div>
  );
}

// Key 1 standalone section — CUT and AUTO TRANS stacked vertically
function KeySection({ active, animating, onCut, onAuto }: {
  active: boolean; animating: boolean; onCut: () => void; onAuto: () => void;
}) {
  // CUT = red when key is on air; AUTO TRANS = red only while animating
  const cutBg   = active  ? '#b91c1c' : '#3a3a3a';
  const autoBg  = animating ? '#b91c1c' : '#3a3a3a';
  const dotColor = active ? '#ef4444' : '#3a3a3a';
  const labelBg  = active ? '#3f0f0f' : '#1a1a1a';
  const labelBorder = active ? '#7f1d1d' : '#333';

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-3" style={{ borderLeft: '1px solid #444', flexShrink: 0 }}>
      {/* CUT */}
      <button
        data-testid="cut-key1"
        onClick={onCut}
        disabled={animating}
        title="Cut Key 1 on/off"
        className="rounded font-bold tracking-widest text-white uppercase border border-black/40 disabled:opacity-40 w-full"
        style={{
          height: 28, fontSize: '10px',
          background: cutBg,
          boxShadow: active ? '0 0 6px rgba(185,28,28,0.6), inset 0 1px 0 rgba(255,255,255,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        CUT
      </button>

      {/* KEYER 1 label + source indicator — between CUT and AUTO TRANS */}
      <div className="flex flex-col items-center gap-1 w-full">
        <span className="tracking-widest uppercase font-bold" style={{ fontSize: '9px', color: '#aaa' }}>KEYER 1</span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded w-full justify-center"
          style={{ background: labelBg, border: `1px solid ${labelBorder}` }}>
          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: dotColor, boxShadow: active ? '0 0 6px rgba(239,68,68,0.8)' : 'none' }} />
          <span className="tracking-widest" style={{ fontSize: '9px', color: active ? '#fca5a5' : '#999' }}>FONT 1</span>
        </div>
      </div>

      {/* AUTO TRANS */}
      <button
        data-testid="auto-key1"
        onClick={onAuto}
        disabled={animating}
        title="Fade Key 1 on/off"
        className="rounded font-bold tracking-widest text-white uppercase border border-black/40 disabled:opacity-40 w-full"
        style={{
          height: 34, fontSize: '8px', lineHeight: 1.2,
          background: autoBg,
          boxShadow: animating ? '0 0 6px rgba(185,28,28,0.6), inset 0 1px 0 rgba(255,255,255,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ display: 'block' }}>AUTO<br />TRANS</span>
      </button>
    </div>
  );
}

export default function SwitcherPanel({
  programIdx, previewIdx, tBarPosition, isTransitioning,
  nextTransBkgd, nextTransKey1,
  key1Active, key1Transitioning, hintStep,
  onProgramSelect, onPreviewSelect, onTBarChange, onCut, onAuto,
  onCutKey1, onAutoKey1, onToggleBkgd, onToggleKey1,
}: Props) {
  const key1Animating = key1Transitioning || (isTransitioning && nextTransKey1);

  return (
    <div
      className="flex items-stretch px-2 py-2 gap-3"
      style={{
        flexShrink: 0,
        background: 'linear-gradient(180deg, #1c1c1c 0%, #141414 100%)',
        borderTop: '3px solid #3a3a3a',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Bus rows */}
      <div className="flex flex-col justify-center gap-2">
        <BusRow selectedIdx={programIdx} busType="program" onSelect={onProgramSelect} />

        {/* Preview row wrapped so hint arrow points directly at it */}
        <div style={{ position: 'relative' }}>
          <BusRow selectedIdx={previewIdx} busType="preview" onSelect={onPreviewSelect} />

          {hintStep === 0 && (
            <div className="hint-bubble" style={{
              position: 'absolute',
              bottom: 'calc(100% + 12px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.92)',
              border: '1px solid #555',
              borderRadius: 6,
              padding: '8px 12px',
              whiteSpace: 'nowrap',
              zIndex: 100,
              textAlign: 'center',
            }}>
              <span style={{ color: '#86efac', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '0.08em' }}>PREVIEW</span>
              <span style={{ color: '#e0e0e0', fontSize: '11px', fontFamily: 'monospace' }}> — select a page to go to next</span>
              <div style={{
                position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #555',
              }} />
              <div style={{
                position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
                width: 0, height: 0,
                borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(0,0,0,0.92)',
              }} />
            </div>
          )}
        </div>
      </div>

      {/* ME1: T-bar + CUT/AUTO + BKGD/KEY1 toggles */}
      <div className="flex items-center gap-2 pl-3" style={{ borderLeft: '1px solid #333', flexShrink: 0 }}>
        {/* T-bar */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-gray-500 tracking-widest uppercase" style={{ fontSize: '9px' }}>T-BAR</span>
          <div
            className="relative flex items-center justify-center rounded"
            style={{ background: '#1a1a1a', border: '1px solid #333', width: 36, height: TBAR_HEIGHT }}
            title="Drag to manually dissolve"
          >
            <div className="absolute inset-x-0 mx-auto rounded-full" style={{ width: 4, background: '#333', top: 6, bottom: 6 }} />
            <input
              type="range"
              className="tbar"
              min={0}
              max={100}
              value={tBarPosition}
              disabled={isTransitioning}
              onChange={(e) => onTBarChange(Number(e.target.value))}
              style={{ height: TBAR_HEIGHT - 12, position: 'relative', zIndex: 1 }}
            />
          </div>
          <span className="text-gray-600 tracking-widest" style={{ fontSize: '9px' }}>{Math.round(tBarPosition)}%</span>
        </div>

        <TransitionSection onCut={onCut} onAuto={onAuto} isTransitioning={isTransitioning} showHint={hintStep === 1} />

        <NextTransToggles
          bkgd={nextTransBkgd}
          key1={nextTransKey1}
          onBkgd={onToggleBkgd}
          onKey1={onToggleKey1}
        />
      </div>

      {/* Key 1 standalone section */}
      <KeySection
        active={key1Active}
        animating={key1Animating}
        onCut={onCutKey1}
        onAuto={onAutoKey1}
      />

      <div className="flex-1" />
    </div>
  );
}
