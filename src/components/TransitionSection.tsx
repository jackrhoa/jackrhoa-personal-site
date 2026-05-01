interface Props {
  onCut: () => void;
  onAuto: () => void;
  isTransitioning: boolean;
  showHint: boolean;
}

export default function TransitionSection({ onCut, onAuto, isTransitioning, showHint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4" style={{ position: 'relative' }}>
      <span className="text-xs tracking-widest text-gray-500 uppercase" style={{ fontSize: '9px' }}>TRANSITION</span>

      {/* Onboarding hint — points to CUT */}
      {showHint && (
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
          <span style={{ color: '#e0e0e0', fontSize: '11px', fontFamily: 'monospace' }}>
            Now press{' '}
          </span>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
            CUT
          </span>
          <span style={{ color: '#e0e0e0', fontSize: '11px', fontFamily: 'monospace' }}>
            {' '}to go to that page
          </span>
          {/* Arrow pointing down */}
          <div style={{
            position: 'absolute',
            bottom: -7,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '7px solid #555',
          }} />
          <div style={{
            position: 'absolute',
            bottom: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid rgba(0,0,0,0.92)',
          }} />
        </div>
      )}

      <button
        onClick={onCut}
        disabled={isTransitioning}
        title="Instantly cut preview to program"
        className="w-16 h-10 rounded font-bold tracking-widest text-white uppercase border border-black/40 transition-all duration-75 disabled:opacity-40"
        style={{
          background: '#555',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 4px rgba(0,0,0,0.5)',
          fontSize: '12px',
        }}
        onMouseOver={e => !isTransitioning && ((e.target as HTMLButtonElement).style.background = '#777')}
        onMouseOut={e => ((e.target as HTMLButtonElement).style.background = '#555')}
      >
        CUT
      </button>

      <button
        onClick={onAuto}
        disabled={isTransitioning}
        title="Smooth dissolve from program to preview"
        className="w-16 h-10 rounded font-bold tracking-widest text-white uppercase border border-black/40 transition-all duration-75 disabled:opacity-40"
        style={{
          background: '#444',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 4px rgba(0,0,0,0.5)',
          fontSize: '12px',
        }}
        onMouseOver={e => !isTransitioning && ((e.target as HTMLButtonElement).style.background = '#666')}
        onMouseOut={e => ((e.target as HTMLButtonElement).style.background = '#444')}
      >
        <span style={{ display: 'block', lineHeight: 1.2 }}>AUTO<br />TRANS</span>
      </button>

    </div>
  );
}
