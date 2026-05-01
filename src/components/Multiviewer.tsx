import { SOURCES } from '../sources';
import MultiviewerTile from './MultiviewerTile';

const TILE_H = 90;
const UMD_H = 18;
const TOTAL_H = TILE_H + UMD_H;

interface Props {
  programIdx: number;
  previewIdx: number;
  pgmShowKey: boolean;
  pvwShowKey: boolean;
  key1Active: boolean;
  onSetPreview: (idx: number) => void;
}

export default function Multiviewer({ programIdx, previewIdx, pgmShowKey, pvwShowKey, key1Active, onSetPreview }: Props) {
  return (
    <div className="flex gap-1 px-2 pt-2" style={{ height: TOTAL_H + 8, flexShrink: 0 }}>
      {SOURCES.map((source, idx) => (
        <MultiviewerTile
          key={source.id}
          source={source}
          isProgram={idx === programIdx}
          isPreview={idx === previewIdx}
          showKeyOverlay={idx === programIdx ? pgmShowKey : idx === previewIdx ? pvwShowKey : false}
          keyOnAir={key1Active && source.pageKey === 'font1'}
          onClick={() => onSetPreview(idx)}
        />
      ))}
    </div>
  );
}
