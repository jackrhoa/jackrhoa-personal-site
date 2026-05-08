import headshot from '../assets/headshot.png';

const isMobile = () => window.innerWidth < 768;

export default function AboutPage() {
  return (
    <div style={{
      width: '100%', height: '100%', overflowY: 'auto',
      background: '#000', color: '#16a34a',
      fontFamily: 'Georgia, serif', textAlign: 'center',
      padding: '40px', boxSizing: 'border-box',
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'normal', marginBottom: '40px' }}>About me</h1>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: '60px', flexWrap: 'wrap' }}>
        <div style={{ width: '180px', height: '180px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #16a34a', flexShrink: 0 }}>
          <img src={headshot} alt="Jack's Headshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ maxWidth: '600px', textAlign: 'left', fontSize: '18px', lineHeight: 1.7 }}>
          <p style={{ marginBottom: '20px' }}>
            I'm a third year at the University of Virginia who builds random stuff, mostly based on things in my everyday life. Tools and products I've used include Google Apps Script, Monkey C, ogScript, and more.
          </p>
          <p>
            In my free time, I enjoy serving as tech director for sports broadcasts as well as directing various lacrosse, baseball, and softball games, all on the ESPN app.
            {isMobile() && <>{' '}<a href="/schedule" style={{ color: '#3b82f6' }}>Check out all the games I work.</a></>}
          </p>
        </div>
      </div>
    </div>
  );
}
