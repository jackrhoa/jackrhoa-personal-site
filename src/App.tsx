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
  const [tBarAtTop, setTBarAtTop] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // What the next transition will affect
  const [nextTransBkgd, setNextTransBkgd] = useState(true);
  const [nextTransKey1, setNextTransKey1] = useState(false);

  // Key 1 (FONT 1 watermark overlay)
  const [key1Opacity, setKey1Opacity] = useState(1);
  const [key1Transitioning, setKey1Transitioning] = useState(false);
  const key1TimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks key1Opacity at the start of a T-bar drag so we can interpolate
  const tBarDragStartKey1 = useRef<number | null>(null);

  // Background crossfade driven by T-bar (only when BKGD is in next transition)
  const rawTBarFraction = tBarAtTop ? (100 - tBarPosition) / 100 : tBarPosition / 100;
  const crossfadeOpacity = nextTransBkgd ? rawTBarFraction : 0;

  // What KEY 1 state will be after the next transition fires
  const key1Active = key1Opacity > 0;
  const key1AfterTransition = nextTransKey1 ? (key1Active ? 0 : 1) : key1Opacity;
  const pvwShowKey = key1AfterTransition > 0;
  const pgmShowKey = key1Active;

  // ── ME1 + Key transitions ────────────────────────────────────────

  const cut = useCallback(() => {
    if (isTransitioning || key1Transitioning) return;
    const willBkgd = nextTransBkgd && previewIdx !== programIdx;
    const willKey1 = nextTransKey1;
    if (!willBkgd && !willKey1) return;

    if (willBkgd) {
      setProgramIdx(previewIdx);
      setPreviewIdx(programIdx);
      setTBarPosition(0);
      setTBarAtTop(false);
    }
    if (willKey1) {
      setKey1Opacity(key1Opacity > 0 ? 0 : 1);
    }
  }, [isTransitioning, key1Transitioning, nextTransBkgd, nextTransKey1, previewIdx, programIdx, key1Opacity]);

  const auto = useCallback(() => {
    if (isTransitioning || key1Transitioning) return;
    const willBkgd = nextTransBkgd && previewIdx !== programIdx;
    const willKey1 = nextTransKey1;
    if (!willBkgd && !willKey1) return;

    setIsTransitioning(true);

    const targetIdx = previewIdx;
    const prevProgramIdx = programIdx;
    const goingUp = !tBarAtTop;
    const startPos = tBarAtTop ? 100 : 0;
    const endPos = tBarAtTop ? 0 : 100;
    const key1Start = key1Opacity;
    const key1End = key1Opacity > 0 ? 0 : 1;
    const steps = AUTO_DURATION_MS / AUTO_INTERVAL_MS;
    let step = 0;

    autoTimerRef.current = setInterval(() => {
      step++;
      const t = Math.min(step / steps, 1);

      if (willBkgd) setTBarPosition(startPos + (endPos - startPos) * t);
      if (willKey1) setKey1Opacity(key1Start + (key1End - key1Start) * t);

      if (step >= steps) {
        clearInterval(autoTimerRef.current!);
        autoTimerRef.current = null;
        if (willBkgd) {
          setProgramIdx(targetIdx);
          setPreviewIdx(prevProgramIdx);
          setTBarPosition(endPos);
          setTBarAtTop(goingUp);
        }
        if (willKey1) setKey1Opacity(key1End);
        setIsTransitioning(false);
      }
    }, AUTO_INTERVAL_MS);
  }, [isTransitioning, key1Transitioning, nextTransBkgd, nextTransKey1,
      previewIdx, programIdx, tBarAtTop, key1Opacity]);

  const handleTBarChange = useCallback((val: number) => {
    // Capture key1 opacity at the very start of each drag gesture
    const restPos = tBarAtTop ? 100 : 0;
    if (tBarDragStartKey1.current === null && val !== restPos) {
      tBarDragStartKey1.current = key1Opacity;
    }

    setTBarPosition(val);

    // Proportionally fade KEY 1 with T-bar when it's in next transition
    if (nextTransKey1 && tBarDragStartKey1.current !== null) {
      const fraction = tBarAtTop ? (100 - val) / 100 : val / 100;
      const start = tBarDragStartKey1.current;
      const target = start > 0.5 ? 0 : 1;
      setKey1Opacity(start + (target - start) * fraction);
    }

    // Complete upward transition
    if (!tBarAtTop && val >= 100) {
      if (nextTransBkgd) {
        setProgramIdx(prev => { setPreviewIdx(prev); return previewIdx; });
      }
      if (nextTransKey1) {
        const s = tBarDragStartKey1.current ?? key1Opacity;
        setKey1Opacity(s > 0.5 ? 0 : 1);
      }
      setTBarAtTop(true);
      tBarDragStartKey1.current = null;
    }

    // Complete downward transition
    if (tBarAtTop && val <= 0) {
      if (nextTransBkgd) {
        setProgramIdx(prev => { setPreviewIdx(prev); return previewIdx; });
      }
      if (nextTransKey1) {
        const s = tBarDragStartKey1.current ?? key1Opacity;
        setKey1Opacity(s > 0.5 ? 0 : 1);
      }
      setTBarAtTop(false);
      tBarDragStartKey1.current = null;
    }
  }, [previewIdx, tBarAtTop, nextTransBkgd, nextTransKey1, key1Opacity]);

  const handleProgramSelect = useCallback((idx: number) => {
    setProgramIdx(idx);
    setTBarPosition(0);
    setTBarAtTop(false);
    tBarDragStartKey1.current = null;
  }, []);

  const handlePreviewSelect = useCallback((idx: number) => {
    setPreviewIdx(idx);
  }, []);

  // ── Standalone Key 1 controls (independent of next-trans toggles) ─

  const cutKey1 = useCallback(() => {
    if (key1Transitioning || isTransitioning) return;
    setKey1Opacity(prev => prev > 0 ? 0 : 1);
  }, [key1Transitioning, isTransitioning]);

  const autoKey1 = useCallback(() => {
    if (key1Transitioning || isTransitioning) return;
    setKey1Transitioning(true);
    const start = key1Opacity;
    const end = key1Opacity > 0 ? 0 : 1;
    const steps = AUTO_DURATION_MS / AUTO_INTERVAL_MS;
    let step = 0;
    key1TimerRef.current = setInterval(() => {
      step++;
      const t = Math.min(step / steps, 1);
      setKey1Opacity(start + (end - start) * t);
      if (step >= steps) {
        clearInterval(key1TimerRef.current!);
        key1TimerRef.current = null;
        setKey1Opacity(end);
        setKey1Transitioning(false);
      }
    }, AUTO_INTERVAL_MS);
  }, [key1Opacity, key1Transitioning, isTransitioning]);

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: '#0a0a0a' }}>
<Multiviewer
        programIdx={programIdx}
        previewIdx={previewIdx}
        pgmShowKey={pgmShowKey}
        pvwShowKey={pvwShowKey}
        key1Active={key1Active}
        onSetPreview={handlePreviewSelect}
      />

      <div className="flex gap-2 flex-1 px-2 py-2" style={{ minHeight: 0 }}>
        <ProgramMonitor
          source={SOURCES[programIdx]}
          previewSource={SOURCES[previewIdx]}
          crossfadeOpacity={crossfadeOpacity}
          key1Opacity={key1Opacity}
        />
        <PreviewThumbnail
          source={nextTransBkgd ? SOURCES[previewIdx] : SOURCES[programIdx]}
          showKey={pvwShowKey}
        />
      </div>

      <HelpBar />

      <SwitcherPanel
        programIdx={programIdx}
        previewIdx={previewIdx}
        tBarPosition={tBarPosition}
        isTransitioning={isTransitioning}
        nextTransBkgd={nextTransBkgd}
        nextTransKey1={nextTransKey1}
        key1Active={key1Active}
        key1Transitioning={key1Transitioning}
        onProgramSelect={handleProgramSelect}
        onPreviewSelect={handlePreviewSelect}
        onTBarChange={handleTBarChange}
        onCut={cut}
        onAuto={auto}
        onCutKey1={cutKey1}
        onAutoKey1={autoKey1}
        onToggleBkgd={() => setNextTransBkgd(v => !v)}
        onToggleKey1={() => setNextTransKey1(v => !v)}
      />
    </div>
  );
}
