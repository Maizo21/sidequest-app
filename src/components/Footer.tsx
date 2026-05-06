'use client';

export default function Footer() {
  return (
    <footer
      className="w-full py-8 flex items-center justify-center"
      style={{ borderTop: '1px solid rgba(240,236,227,0.08)' }}
    >
      <p className="text-sm" style={{ color: 'rgba(240,236,227,0.4)' }}>
        Hecho con{' '}
        <span style={{ color: '#ff6d28' }}>🧡</span>
        {' '}por{' '}
        <a
          href="https://www.linkedin.com/in/hernan-amaiz/"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors duration-200 underline underline-offset-2"
          style={{ color: 'rgba(240,236,227,0.6)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#ff6d28')}
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(240,236,227,0.6)')
          }
        >
          Nan
        </a>
      </p>
    </footer>
  );
}
