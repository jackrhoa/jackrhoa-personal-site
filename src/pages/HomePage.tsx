const SECTIONS: { title: string; links: { name: string; href: string }[] }[] = [
  {
    title: 'EXPERIENCE',
    links: [
      { name: 'theCourseForum', href: 'https://github.com/thecourseforum/theCourseForum2' },
      { name: 'Sports Reference', href: 'https://www.sports-reference.com' },
    ],
  },
  {
    title: 'OPEN SOURCE CONTRIBUTIONS',
    links: [
      { name: 'nixpkgs', href: 'https://github.com/NixOS/nixpkgs/pulls?q=is%3Apr+author%3Ajackrhoa+is%3Amerged' },
      { name: 'eza', href: 'https://github.com/eza-community/eza' },
    ],
  },
  {
    title: 'CONTACT',
    links: [
      { name: 'github.com/jackrhoa', href: 'https://github.com/jackrhoa' },
      { name: 'linkedin.com/in/jackrhoa', href: 'https://www.linkedin.com/in/jackrhoa' },
    ],
  },
];

const labelClass = 'text-[13px] tracking-[0.1em] opacity-75 font-normal';
const linkClass = 'hover:opacity-60 transition-opacity';

export default function HomePage() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--bg)] text-[var(--fg)] font-serif">
      <div className="min-h-full w-full max-w-7xl mx-auto px-6 py-12 md:px-16 flex flex-col justify-center gap-16 text-center md:text-left">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {SECTIONS.map(section => (
            <section key={section.title} className="flex flex-col gap-3">
              <h2 className={`${labelClass} mb-2`}>{section.title}</h2>
              {section.links.map(l => (
                <a
                  key={l.name}
                  href={l.href}
                  {...(l.href.startsWith('http') && { target: '_blank', rel: 'noopener noreferrer' })}
                  className={`${linkClass} text-xl md:text-2xl lg:text-3xl`}
                >
                  {l.name}
                </a>
              ))}
            </section>
          ))}
        </div>
        <a href="/schedule" className={`${labelClass} ${linkClass}`}>SCHEDULE</a>
      </div>
    </div>
  );
}
