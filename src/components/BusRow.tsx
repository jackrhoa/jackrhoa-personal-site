import { SOURCES } from '../sources';
import CrosspointButton from './CrosspointButton';

interface Props {
  selectedIdx: number;
  busType: 'program' | 'preview';
  onSelect: (idx: number) => void;
}

export default function BusRow({ selectedIdx, busType, onSelect }: Props) {
  const label = busType === 'program' ? 'PROGRAM (On Air)' : 'PREVIEW (Up Next)';
  const labelColor = busType === 'program' ? 'text-red-400' : 'text-green-400';

  return (
    <div className="flex flex-col gap-1">
      <span className={`text-xs font-bold tracking-widest uppercase ${labelColor}`} style={{ fontSize: '9px' }}>
        {label}
      </span>
      <div className="flex gap-2">
        {SOURCES.map((source, idx) => (
          <CrosspointButton
            key={source.id}
            source={source}
            number={idx + 1}
            isSelected={idx === selectedIdx}
            busType={busType}
            onClick={() => onSelect(idx)}
          />
        ))}
      </div>
    </div>
  );
}
