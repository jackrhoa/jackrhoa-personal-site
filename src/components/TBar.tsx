interface Props {
  position: number; // 0–100
  onChange: (val: number) => void;
  disabled: boolean;
}

export default function TBar({ position, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col items-center gap-1 px-3" style={{ height: '100%' }}>
      <span className="text-xs tracking-widest text-gray-500 uppercase" style={{ fontSize: '9px' }}>T-BAR</span>
      <div
        className="flex-1 flex items-center justify-center relative rounded"
        style={{ background: '#1a1a1a', border: '1px solid #333', width: '36px', padding: '4px 0' }}
        title="Drag to manually dissolve between preview and program"
      >
        {/* Track groove */}
        <div className="absolute inset-x-0 mx-auto rounded-full" style={{ width: '4px', background: '#333', top: '8px', bottom: '8px' }} />
        <input
          type="range"
          className="tbar"
          min={0}
          max={100}
          value={position}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ height: 'calc(100% - 16px)', position: 'relative', zIndex: 1 }}
        />
      </div>
      <span className="text-xs tracking-widest text-gray-600" style={{ fontSize: '9px' }}>{Math.round(position)}%</span>
    </div>
  );
}
