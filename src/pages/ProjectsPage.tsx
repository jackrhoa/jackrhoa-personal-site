import uvastats from '../assets/eb-page.png';

export default function ProjectsPage() {
  return (
    <div style={{
      width: '100%', height: '100%', overflowY: 'auto',
      background: '#000', color: '#16a34a',
      fontFamily: 'Georgia, serif', padding: '48px',
      boxSizing: 'border-box',
    }}>
      <h1 style={{ fontSize: '56px', fontWeight: 'normal', textAlign: 'center', marginBottom: '40px' }}>
        Projects
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
        <div style={{
          maxWidth: '700px', width: '100%',
          background: '#171717', padding: '24px', borderRadius: '16px',
          border: '1px solid #16a34a',
          display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{ width: '160px', height: '160px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #16a34a', flexShrink: 0 }}>
            <img src={uvastats} alt="UVA Baseball Stats" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left' }} />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'normal', marginBottom: '12px' }}>UVA Baseball Stats</h2>
            <p style={{ fontSize: '16px', lineHeight: 1.65, margin: 0 }}>
              A website with advanced batting, pitching, and fielding stats for Virginia's baseball team. Users can view and filter a player's game-by-game stats and situational batting splits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
