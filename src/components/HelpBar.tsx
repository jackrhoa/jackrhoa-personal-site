export default function HelpBar() {
  return (
    <div className="flex items-center gap-4 px-3 py-1.5 text-xs text-gray-400 border-t border-b border-gray-800" style={{ background: '#0f0f0f' }}>
      <span className="font-bold text-gray-300 tracking-widest uppercase text-xs">How it works:</span>
      <span>
        <span className="text-green-400 font-bold">PREVIEW row</span> — select what&apos;s up next
      </span>
      <span>·</span>
      <span>
        <span className="text-red-400 font-bold">PROGRAM row</span> — direct cut to air
      </span>
      <span>·</span>
      <span>
        <span className="text-white font-bold">CUT</span> — instantly take preview to air
      </span>
      <span>·</span>
      <span>
        <span className="text-white font-bold">AUTO</span> — smooth dissolve to preview
      </span>
      <span>·</span>
      <span>
        <span className="text-white font-bold">T-Bar</span> — drag for manual dissolve
      </span>
    </div>
  );
}
