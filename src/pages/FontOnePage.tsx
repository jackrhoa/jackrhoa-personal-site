export default function FontOnePage() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'transparent', position: 'relative' }}>
      <svg
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: '3.5%', right: '3.5%', width: '10%', height: 'auto', opacity: 0.75 }}
      >
        <circle cx="16" cy="16" r="16" fill="black" fillOpacity="0.4" />
        <path d="M12 8 L12 20 Q12 24 8 24 Q4 24 4 20"
          stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 8 L18 24 M18 8 L22 8 Q26 8 26 12 Q26 16 22 16 L18 16 M22 16 L26 24"
          stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
