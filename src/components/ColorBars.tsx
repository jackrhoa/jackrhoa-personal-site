import { COLOR_BAR_STRIPES } from '../sources';

export default function ColorBars({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-full w-full ${className}`}>
      {COLOR_BAR_STRIPES.map((color, i) => (
        <div key={i} className="flex-1 h-full" style={{ background: color }} />
      ))}
    </div>
  );
}
