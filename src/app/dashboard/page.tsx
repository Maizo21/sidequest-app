'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser, RedirectToSignIn } from '@clerk/nextjs';
import { gsap } from 'gsap';
import Link from 'next/link';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getAllEntries, type DailyEntry } from '@/lib/storage';
import { sidequests } from '@/lib/sidequests';

function getSidequestById(id: number) {
  return sidequests.find((s) => s.id === id);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function DashboardPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const allEntries = getAllEntries();
    setEntries(allEntries);
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!pageRef.current) return;
    gsap.fromTo(
      pageRef.current.querySelectorAll('.dash-item'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: 'power2.out', delay: 0.2 }
    );
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#101923' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#ff6d28', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const completedEntries = entries.filter((e) => e.completed);
  const totalDays = entries.length;
  const streak = calcStreak(entries);

  // Build calendar
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const entryByDate: Record<string, DailyEntry> = {};
  entries.forEach((e) => { entryByDate[e.date] = e; });

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  // Animate calendar on month change
  const animateCalendar = () => {
    if (!calendarRef.current) return;
    gsap.fromTo(
      calendarRef.current,
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
    );
  };

  return (
    <>
      <Navbar />
      <main
        ref={pageRef}
        className="flex-1 pt-20 pb-8 px-4 max-w-2xl mx-auto w-full"
        style={{ background: '#101923' }}
      >
        {/* Header */}
        <div className="dash-item mb-8 opacity-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs mb-6 transition-colors duration-200"
            style={{ color: 'rgba(240,236,227,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ff6d28')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,236,227,0.4)')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Volver a la misión de hoy
          </Link>

          <h1
            className="mb-2"
            style={{ fontFamily: 'Biscotti, serif', fontSize: 'clamp(2rem, 5vw, 2.8rem)', color: '#f0ece3' }}
          >
            Tu progreso
          </h1>
          <p className="text-sm" style={{ color: 'rgba(240,236,227,0.5)', fontWeight: 300 }}>
            Bienvenido/a de vuelta, {user?.firstName ?? 'explorador/a'}
          </p>
        </div>

        {/* Stats */}
        <div className="dash-item grid grid-cols-3 gap-3 mb-8 opacity-0">
          {[
            { label: 'Misiones', value: completedEntries.length, sub: 'completadas' },
            { label: 'Racha', value: streak, sub: streak === 1 ? 'día' : 'días' },
            { label: 'Total', value: totalDays, sub: totalDays === 1 ? 'día activo' : 'días activos' },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 text-center"
              style={{
                background: '#1a2535',
                border: '1px solid rgba(240,236,227,0.07)',
              }}
            >
              <div
                className="text-3xl font-bold mb-1"
                style={{ color: '#ff6d28', fontFamily: 'Biscotti, serif' }}
              >
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: 'rgba(240,236,227,0.5)' }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div
          className="dash-item rounded-2xl p-5 mb-6 opacity-0"
          style={{ background: '#1a2535', border: '1px solid rgba(240,236,227,0.07)' }}
        >
          {/* Calendar nav */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => { prevMonth(); animateCalendar(); }}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-150"
              style={{ color: 'rgba(240,236,227,0.5)', background: 'rgba(240,236,227,0.05)' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ff6d28'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,236,227,0.5)'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <span className="font-semibold text-sm" style={{ color: '#f0ece3' }}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>

            <button
              onClick={() => { nextMonth(); animateCalendar(); }}
              disabled={currentYear === today.getFullYear() && currentMonth === today.getMonth()}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-150"
              style={{ color: 'rgba(240,236,227,0.5)', background: 'rgba(240,236,227,0.05)' }}
              onMouseEnter={e => {
                if (!(currentYear === today.getFullYear() && currentMonth === today.getMonth()))
                  (e.currentTarget as HTMLButtonElement).style.color = '#ff6d28';
              }}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,236,227,0.5)'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs py-1" style={{ color: 'rgba(240,236,227,0.3)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div ref={calendarRef} className="grid grid-cols-7 gap-1">
            {/* Empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const entry = entryByDate[dateStr];
              const isToday = dateStr === todayStr;
              const isFuture = dateStr > todayStr;
              const isCompleted = entry?.completed;
              const hasEntry = !!entry;

              return (
                <button
                  key={day}
                  onClick={() => {
                    if (entry) setSelectedEntry(entry === selectedEntry ? null : entry);
                  }}
                  disabled={isFuture || !hasEntry}
                  className="relative aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all duration-150"
                  style={{
                    background: isCompleted
                      ? 'rgba(255,109,40,0.18)'
                      : isToday
                      ? 'rgba(240,236,227,0.08)'
                      : hasEntry
                      ? 'rgba(240,236,227,0.04)'
                      : 'transparent',
                    color: isCompleted
                      ? '#ff6d28'
                      : isToday
                      ? '#f0ece3'
                      : isFuture
                      ? 'rgba(240,236,227,0.15)'
                      : 'rgba(240,236,227,0.5)',
                    border: isToday ? '1px solid rgba(240,236,227,0.2)' : '1px solid transparent',
                    cursor: hasEntry && !isFuture ? 'pointer' : 'default',
                  }}
                  onMouseEnter={e => {
                    if (hasEntry && !isFuture)
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,109,40,0.25)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = isCompleted
                      ? 'rgba(255,109,40,0.18)'
                      : isToday ? 'rgba(240,236,227,0.08)'
                      : hasEntry ? 'rgba(240,236,227,0.04)' : 'transparent';
                  }}
                >
                  {day}
                  {isCompleted && (
                    <div
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ background: '#ff6d28' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected entry detail */}
        {selectedEntry && (
          <SelectedEntryCard entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
        )}

        {/* Recent completions */}
        {completedEntries.length > 0 && (
          <div className="dash-item opacity-0">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgba(240,236,227,0.6)' }}>
              Últimas misiones completadas
            </h2>
            <div className="flex flex-col gap-3">
              {completedEntries
                .slice()
                .reverse()
                .slice(0, 5)
                .map((entry) => {
                  const sq = getSidequestById(entry.sidequestId);
                  return (
                    <div
                      key={entry.date}
                      className="flex items-start gap-4 rounded-xl p-4 cursor-pointer transition-colors duration-150"
                      style={{
                        background: '#1a2535',
                        border: selectedEntry?.date === entry.date ? '1px solid rgba(255,109,40,0.3)' : '1px solid rgba(240,236,227,0.06)',
                      }}
                      onClick={() => setSelectedEntry(entry === selectedEntry ? null : entry)}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                        style={{ background: 'rgba(255,109,40,0.15)' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7l3.5 3.5 5.5-5.5" stroke="#ff6d28" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-0.5 truncate" style={{ color: '#f0ece3' }}>
                          {sq?.title ?? 'Misión desconocida'}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(240,236,227,0.4)' }}>
                          {formatDate(entry.date)}
                          {entry.comment && ' · Con nota'}
                          {entry.imageBase64 && ' · Con foto'}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {completedEntries.length === 0 && (
          <div
            className="dash-item text-center py-12 rounded-2xl opacity-0"
            style={{ background: '#1a2535', border: '1px solid rgba(240,236,227,0.06)' }}
          >
            <p className="text-4xl mb-4">🗺️</p>
            <p style={{ fontFamily: 'Biscotti, serif', fontSize: '1.4rem', color: '#f0ece3' }}>
              Tu aventura empieza hoy
            </p>
            <p className="text-sm mt-2" style={{ color: 'rgba(240,236,227,0.4)' }}>
              Completa tu primera sidequest para verla aquí
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-5 text-sm font-medium px-5 py-2.5 rounded-full transition-all duration-200"
              style={{ background: '#ff6d28', color: '#101923' }}
            >
              Ver misión de hoy
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function SelectedEntryCard({ entry, onClose }: { entry: DailyEntry; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const sq = getSidequestById(entry.sidequestId);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
  }, [entry.date]);

  return (
    <div
      ref={cardRef}
      className="rounded-2xl p-5 mb-6 opacity-0"
      style={{
        background: '#1a2535',
        border: '1px solid rgba(255,109,40,0.2)',
        boxShadow: '0 4px 30px rgba(255,109,40,0.08)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs mb-1" style={{ color: '#ff6d28' }}>{formatDate(entry.date)}</p>
          <h3 style={{ fontFamily: 'Biscotti, serif', fontSize: '1.3rem', color: '#f0ece3' }}>
            {sq?.title ?? 'Misión'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ color: 'rgba(240,236,227,0.4)', background: 'rgba(240,236,227,0.05)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {entry.comment && (
        <p className="text-sm leading-relaxed mt-3 pt-3" style={{
          color: 'rgba(240,236,227,0.7)',
          borderTop: '1px solid rgba(240,236,227,0.08)',
          fontWeight: 300,
        }}>
          "{entry.comment}"
        </p>
      )}

      {entry.imageBase64 && (
        <div className="mt-3 rounded-xl overflow-hidden">
          <img src={entry.imageBase64} alt="memory" className="w-full h-48 object-cover" />
        </div>
      )}

      {!entry.comment && !entry.imageBase64 && (
        <p className="text-xs mt-3" style={{ color: 'rgba(240,236,227,0.3)' }}>
          Sin nota ni foto guardada
        </p>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function calcStreak(entries: DailyEntry[]): number {
  const completed = entries
    .filter((e) => e.completed)
    .map((e) => e.date)
    .sort()
    .reverse();

  if (!completed.length) return 0;

  const today = new Date();
  let streak = 0;
  let checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (completed.includes(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}
