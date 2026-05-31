export default function NotFoundPage() {
  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
      color: '#16a34a',
      fontFamily: 'Georgia, serif',
      textAlign: 'center',
      padding: '40px',
      boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: '8rem', fontWeight: 'normal', lineHeight: 1 }}>404</div>
      <div style={{ fontSize: '1.25rem', marginTop: '1rem', opacity: 0.75 }}>Not Found</div>
    </div>
  )
}
