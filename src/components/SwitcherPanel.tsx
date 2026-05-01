import BusRow from './BusRow';
import TransitionSection from './TransitionSection';

interface Props {
  programIdx: number;
  previewIdx: number;
  tBarPosition: number;
  isTransitioning: boolean;
  onProgramSelect: (idx: number) => void;
  onPreviewSelect: (idx: number) => void;
  onTBarChange: (val: number) => void;
  onCut: () => void;
  onAuto: () => void;
}

const TBAR_HEIGHT = 80;

export default function SwitcherPanel({
  programIdx, previewIdx, tBarPosition, isTransitioning,
  onProgramSelect, onPreviewSelect, onTBarChange, onCut, onAuto,
}: Props) {
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
      {/* Bus rows — natural width */}
      <div className="flex flex-col justify-center gap-2">
        <BusRow selectedIdx={programIdx} busType="program" onSelect={onProgramSelect} />
        <BusRow selectedIdx={previewIdx} busType="preview" onSelect={onPreviewSelect} />
      </div>

      {/* T-bar + CUT/AUTO + decorative — right next to buses */}
      <div className="flex items-center gap-2 pl-3 flex-1" style={{ borderLeft: '1px solid #333' }}>

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

        {/* CUT / AUTO */}
        <TransitionSection onCut={onCut} onAuto={onAuto} isTransitioning={isTransitioning} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Decorative keys */}
        <div className="flex flex-col gap-1.5 pl-2" style={{ borderLeft: '1px solid #333' }}>
          {['BKGD', 'KEY 1', 'DSK'].map((lbl) => (
            <div
              key={lbl}
              className="btn-idle rounded border border-black/40 text-white text-center"
              style={{ width: 36, height: 22, fontSize: '8px', lineHeight: '22px', userSelect: 'none' }}
            >
              {lbl}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
