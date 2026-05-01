import { useState, useCallback, useRef } from 'react';
import { SOURCES } from './sources';
import Multiviewer from './components/Multiviewer';
import ProgramMonitor from './components/ProgramMonitor';
import PreviewThumbnail from './components/PreviewThumbnail';
import HelpBar from './components/HelpBar';
import SwitcherPanel from './components/SwitcherPanel';

const AUTO_DURATION_MS = 1000;
const AUTO_INTERVAL_MS = 16;

export default function App() {
  const [programIdx, setProgramIdx] = useState(0);
  const [previewIdx, setPreviewIdx] = useState(1);
  const [tBarPosition, setTBarPosition] = useState(0);
  // true = T-bar is resting at top; next drag goes down (100→0)
  const [tBarAtTop, setTBarAtTop] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Crossfade opacity: how much of preview is visible over program
  const crossfadeOpacity = tBarAtTop
    ? (100 - tBarPosition) / 100
    : tBarPosition / 100;

  const cut = useCallback(() => {
    if (previewIdx === programIdx) return;
    setProgramIdx(previewIdx);
    setPreviewIdx(programIdx);
    setTBarPosition(0);
    setTBarAtTop(false);
  }, [previewIdx, programIdx]);

  const auto = useCallback(() => {
    if (isTransitioning || previewIdx === programIdx) return;
    setIsTransitioning(true);

    const targetIdx = previewIdx;
    const prevProgramIdx = programIdx;
    const goingUp = !tBarAtTop;
    const startPos = tBarAtTop ? 100 : 0;
    const endPos = tBarAtTop ? 0 : 100;
    const steps = AUTO_DURATION_MS / AUTO_INTERVAL_MS;
    let step = 0;

    autoTimerRef.current = setInterval(() => {
      step++;
      const pos = startPos + (endPos - startPos) * Math.min(step / steps, 1);
      setTBarPosition(pos);

      if (step >= steps) {
        clearInterval(autoTimerRef.current!);
        autoTimerRef.current = null;
        setProgramIdx(targetIdx);
        setPreviewIdx(prevProgramIdx);
        setTBarPosition(endPos);
        setTBarAtTop(goingUp); // went up → now at top; went down → now at bottom
        setIsTransitioning(false);
      }
    }, AUTO_INTERVAL_MS);
  }, [isTransitioning, previewIdx, programIdx, tBarAtTop]);

  const handleTBarChange = useCallback((val: number) => {
    setTBarPosition(val);
    // Complete upward transition
    if (!tBarAtTop && val >= 100) {
      setProgramIdx(prev => {
        setPreviewIdx(prev); // old program → preview
        return previewIdx;   // preview → program
      });
      setTBarAtTop(true);
    }
    // Complete downward transition
    if (tBarAtTop && val <= 0) {
      setProgramIdx(prev => {
        setPreviewIdx(prev);
        return previewIdx;
      });
      setTBarAtTop(false);
    }
  }, [previewIdx, tBarAtTop]);

  const handleProgramSelect = useCallback((idx: number) => {
    setProgramIdx(idx);
    setTBarPosition(0);
    setTBarAtTop(false);
  }, []);

  const handlePreviewSelect = useCallback((idx: number) => {
    setPreviewIdx(idx);
  }, []);

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: '#0a0a0a' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-1.5"
        style={{ background: '#111', borderBottom: '1px solid #2a2a2a' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-widest text-gray-200 uppercase" style={{ fontSize: '13px' }}>
            ROSS CARBONITE
          </span>
          <span className="text-gray-600 text-xs tracking-widest">ME 1</span>
        </div>
        <span className="text-gray-600 text-xs tracking-widest">SWITCHER EMULATOR</span>
      </div>

      {/* Multiviewer */}
      <Multiviewer
        programIdx={programIdx}
        previewIdx={previewIdx}
        onSetPreview={handlePreviewSelect}
      />

      {/* Program + Preview monitors */}
      <div className="flex gap-2 flex-1 px-2 py-2" style={{ minHeight: 0 }}>
        <ProgramMonitor
          source={SOURCES[programIdx]}
          previewSource={SOURCES[previewIdx]}
          crossfadeOpacity={crossfadeOpacity}
        />
        <PreviewThumbnail source={SOURCES[previewIdx]} />
      </div>

      {/* Help bar */}
      <HelpBar />

      {/* Switcher panel */}
      <SwitcherPanel
        programIdx={programIdx}
        previewIdx={previewIdx}
        tBarPosition={tBarPosition}
        isTransitioning={isTransitioning}
        onProgramSelect={handleProgramSelect}
        onPreviewSelect={handlePreviewSelect}
        onTBarChange={handleTBarChange}
        onCut={cut}
        onAuto={auto}
      />
    </div>
  );
}
