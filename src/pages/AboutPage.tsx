import headshot from '../assets/headshot.png';

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
            My name is Jack Rhoa, and I'm in my third year the University of Virginia student. Currently, my interests lie in backend development as well as data analysis and modeling.
          </p>
          <p style={{ marginBottom: '20px' }}>
            Many of the problems I address are ones encountered in my everyday life, which has given me experience in various things like Google Apps Script, Monkey C, Visual Basic, ogScript, and more.
          </p>
          <p style={{ marginBottom: '20px' }}>
            My backend experience is mostly with Django, a Python-based framework, while I've used React (with TypeScript!) to build the frontends.
          </p>
          <p>
            In my free time, I enjoy serving as tech director for sports broadcasts as well as directing various lacrosse, baseball, and softball games, all on the ESPN app.
          </p>
        </div>
      </div>
    </div>
  );
}
