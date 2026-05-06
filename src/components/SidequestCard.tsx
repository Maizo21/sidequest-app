'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { Sidequest } from '@/lib/sidequests';
import { categoryColors, difficultyLabels } from '@/lib/sidequests';

interface Props {
  sidequest: Sidequest;
  dayNumber: number;
  completed: boolean;
}

// Map category → tool icon + label for the footer
const CATEGORY_TOOL: Record<string, { label: string; icon: React.ReactNode }> = {
  creativo: {
    label: 'Cámara',
    icon: (
      <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
        <rect x="1" y="3" width="14" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 3l1-2h4l1 2" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  conexión: {
    label: 'Voz',
    icon: (
      <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
        <rect x="5" y="1" width="4" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M2 8a5 5 0 0010 0M7 13v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  aventura: {
    label: 'Pies',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 14V8a5 5 0 0110 0v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M3 14h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  mindfulness: {
    label: 'Tú',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  conocimiento: {
    label: 'Libro',
    icon: (
      <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
        <path d="M2 2v10c0-1 1-2 3-2h3M14 2v10c0-1-1-2-3-2H8M8 4v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  arte: {
    label: 'Pincel',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 12c0-2 1-3 3-3l4-4 2 2-4 4c0 2-1 3-3 3-1 0-2-1-2-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M9 5l3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  hogar: {
    label: 'Casa',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 7l6-5 6 5v7H2V7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
};

const DIFF_VERBOSE: Record<string, string> = {
  fácil: 'Fácil',
  media: 'Media',
  difícil: 'Difícil',
};

export default function SidequestCard({ sidequest, dayNumber, completed }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.3 }
    );
  }, [sidequest.id]);

  const catColor = categoryColors[sidequest.category] ?? '#ff6d28';
  const diffLabel = difficultyLabels[sidequest.difficulty] ?? '●○○';
  const tool = CATEGORY_TOOL[sidequest.category] ?? CATEGORY_TOOL.creativo;
  const diffVerbose = DIFF_VERBOSE[sidequest.difficulty] ?? 'Fácil';
  const entryNo = String(dayNumber).padStart(2, '0');

  return (
    <div
      ref={cardRef}
      className="relative w-full opacity-0"
      style={{ zIndex: 10 }}
    >
      {/* Card — notebook/paper */}
      <div
        className="relative"
        style={{
          background: '#f5ecd9',
          boxShadow: '4px 6px 30px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.2)',
        }}
      >
        {/* Paper clip on top center */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -22,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 28,
            height: 50,
            border: '3px solid rgba(120, 110, 100, 0.55)',
            borderRadius: '14px 14px 0 0',
            zIndex: 25,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 16,
              height: 32,
              border: '3px solid rgba(120, 110, 100, 0.55)',
              borderRadius: '8px 8px 0 0',
            }}
          />
        </div>

        {/* Paper texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`,
            zIndex: 1,
          }}
          aria-hidden="true"
        />

        {/* Notebook lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              transparent 0px,
              transparent 31px,
              rgba(160, 140, 120, 0.18) 31px,
              rgba(160, 140, 120, 0.18) 32px
            )`,
            backgroundSize: '100% 32px',
            backgroundPositionY: '20px',
            zIndex: 1,
          }}
          aria-hidden="true"
        />

        {/* Red margin line */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none"
          style={{
            left: 38,
            width: 2,
            background: 'rgba(220, 80, 80, 0.22)',
            zIndex: 1,
          }}
          aria-hidden="true"
        />

        {/* Content area with left margin */}
        <div className="relative" style={{ padding: '32px 36px 28px 56px', zIndex: 2 }}>
          {/* Top row: category pill + entry number */}
          <div className="flex items-start justify-between mb-6">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-3 py-1.5"
              style={{
                background: catColor,
                color: '#fff',
                borderRadius: 2,
                letterSpacing: '0.1em',
                fontSize: '0.7rem',
                boxShadow: '1px 1px 0 rgba(0,0,0,0.15)',
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: '#fff', opacity: 0.7 }}
              />
              {sidequest.category}
            </span>

            <span
              style={{
                fontFamily: 'Biscotti, serif',
                fontSize: '1.5rem',
                color: 'rgba(80, 70, 60, 0.45)',
                lineHeight: 1,
                marginTop: 2,
              }}
            >
              n° {entryNo}
            </span>
          </div>

          {/* Title — handwritten, BIG */}
          <h1
            className="leading-[0.95] mb-5"
            style={{
              fontFamily: 'Biscotti, serif',
              fontSize: 'clamp(2.6rem, 5.5vw, 4.5rem)',
              color: '#2a1f1a',
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}
          >
            {sidequest.title}
          </h1>

          {/* Description — serif italic, intimate voice */}
          <p
            className="leading-relaxed mb-8"
            style={{
              color: 'rgba(60, 50, 40, 0.78)',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
              fontSize: '1.05rem',
              lineHeight: 1.55,
            }}
          >
            {sidequest.description}
          </p>

          {/* Footer dashed divider */}
          <div
            className="mb-4"
            style={{
              borderTop: '1px dashed rgba(80, 70, 60, 0.25)',
            }}
          />

          {/* Footer: 3 metadata items horizontal */}
          <div className="flex items-start gap-8 flex-wrap">
            <MetaItem
              label="Tiempo"
              value={sidequest.duration}
              icon={
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M7 4v3l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              }
            />
            <MetaItem
              label="Nivel"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span style={{ color: catColor, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                    {diffLabel}
                  </span>
                  <span>{diffVerbose}</span>
                </span>
              }
            />
            <MetaItem label="Herramienta" value={tool.label} icon={tool.icon} />
          </div>
        </div>

        {/* Completed badge — looks like a stamp */}
        {completed && (
          <div
            className="absolute flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
            style={{
              top: 16,
              right: -10,
              background: '#ff6d28',
              color: '#1a1313',
              transform: 'rotate(8deg)',
              boxShadow: '2px 2px 8px rgba(0,0,0,0.3)',
              zIndex: 25,
              borderRadius: 2,
              border: '2px solid rgba(26,19,19,0.2)',
              letterSpacing: '0.1em',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Cumplida
          </div>
        )}
      </div>
    </div>
  );
}

function MetaItem({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="uppercase tracking-widest"
        style={{
          fontSize: '0.6rem',
          color: 'rgba(80, 70, 60, 0.55)',
          letterSpacing: '0.18em',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span
        className="flex items-center gap-1.5 text-sm"
        style={{ color: '#2a1f1a', fontWeight: 500 }}
      >
        {icon && <span style={{ color: 'rgba(80, 70, 60, 0.55)' }}>{icon}</span>}
        {value}
      </span>
    </div>
  );
}
