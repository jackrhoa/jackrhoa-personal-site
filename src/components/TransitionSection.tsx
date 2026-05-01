interface Props {
  onCut: () => void;
  onAuto: () => void;
  isTransitioning: boolean;
}

export default function TransitionSection({ onCut, onAuto, isTransitioning }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4">
      <span className="text-xs tracking-widest text-gray-500 uppercase" style={{ fontSize: '9px' }}>TRANSITION</span>

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

      {isTransitioning && (
        <span className="text-xs text-yellow-400 tracking-widest" style={{ fontSize: '9px' }}>TRANS...</span>
      )}
    </div>
  );
}
