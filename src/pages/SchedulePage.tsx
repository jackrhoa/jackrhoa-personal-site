export default function SchedulePage() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#000' }}>
      <iframe
        src="https://calendar.google.com/calendar/embed?src=e398559c5a1cbfb6b616fe196ad845c4dd30721af94e6c14efb47ad0a4488993%40group.calendar.google.com&ctz=America%2FNew_York"
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Work Schedule"
      />
    </div>
  );
}
