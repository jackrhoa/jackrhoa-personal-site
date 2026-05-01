import type { Source } from '../sources';

interface Props {
  source: Source;
  number: number;
  isSelected: boolean;
  busType: 'program' | 'preview';
  onClick: () => void;
}

export default function CrosspointButton({ source, number, isSelected, busType, onClick }: Props) {
  const selectedClass = busType === 'program' ? 'btn-program' : 'btn-preview';
  const label = busType === 'program' ? String(number) : String(number);

  const displayLabel = source.busLabel ?? source.label;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        className={`w-14 h-10 rounded text-xs font-bold tracking-wide uppercase transition-all duration-75 border border-black/40 ${isSelected ? selectedClass : 'btn-idle'} text-white`}
        style={{ fontSize: '11px' }}
      >
        {label}
      </button>
      <span
        className="text-center leading-tight"
        style={{ fontSize: '9px', color: '#888', width: '56px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={displayLabel}
      >
        {displayLabel}
      </span>
    </div>
  );
}
