export default function HomePage() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#000', color: '#16a34a',
      fontFamily: 'Georgia, serif',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '40px',
      boxSizing: 'border-box',
    }}>
      <h1 style={{ fontSize: '80px', margin: '0 0 40px', fontWeight: 'normal' }}>
        Hi! I'm Jack
      </h1>
      <h2 style={{ fontSize: '36px', fontWeight: 'normal', margin: '0 0 60px', lineHeight: 1.3, maxWidth: '800px' }}>
        A Computer Science student at the University of Virginia
      </h2>
      <div style={{ display: 'flex', gap: '40px', fontSize: '28px' }}>
        <button style={{
          background: 'transparent', border: 'none', color: '#16a34a',
          fontFamily: 'Georgia, serif', fontSize: '28px', cursor: 'pointer',
          padding: '12px 24px', borderRadius: '12px',
        }}>
          Projects
        </button>
        <button style={{
          background: 'transparent', border: 'none', color: '#16a34a',
          fontFamily: 'Georgia, serif', fontSize: '28px', cursor: 'pointer',
          padding: '12px 24px',
        }}>
          About
        </button>
      </div>
    </div>
  );
}
