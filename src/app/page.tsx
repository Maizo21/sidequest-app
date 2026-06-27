'use client';

import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { gsap } from 'gsap';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrapbookImages from '@/components/ScrapbookImages';
import SidequestCard from '@/components/SidequestCard';
import CompletionButton from '@/components/CompletionButton';
import CompletionModal from '@/components/CompletionModal';

import {
  getDailySidequest,
  getTodayString,
  mergeSidequestPool,
  sidequests as ALL_SIDEQUESTS,
  type Sidequest,
} from '@/lib/sidequests';
import {
  getAnonymousId,
  getTodayEntry,
  saveTodayEntry,
  getAllEntries,
  type DailyEntry,
} from '@/lib/storage';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function calcStreak(entries: { completed: boolean; date: string }[]): number {
  const completed = entries.filter((e) => e.completed).map((e) => e.date).sort().reverse();
  if (!completed.length) return 0;
  const today = new Date();
  let streak = 0;
  const checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (completed.includes(dateStr)) streak++;
    else if (i > 0) break;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

function upsertEntry(entries: DailyEntry[], entry: DailyEntry): DailyEntry[] {
  const index = entries.findIndex((currentEntry) => currentEntry.date === entry.date);
  if (index < 0) return [...entries, entry];
  return entries.map((currentEntry, currentIndex) => (currentIndex === index ? entry : currentEntry));
}

async function fetchDynamicSidequests(): Promise<Sidequest[]> {
  try {
    const response = await fetch('/api/sidequests');
    if (!response.ok) return [];
    const data = (await response.json()) as { sidequests?: Sidequest[] };
    return Array.isArray(data.sidequests) ? data.sidequests : [];
  } catch {
    return [];
  }
}

async function fetchRemoteEntries(): Promise<DailyEntry[]> {
  try {
    const response = await fetch('/api/entries');
    if (!response.ok) return [];
    const data = (await response.json()) as { entries?: DailyEntry[] };
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
}

async function saveRemoteTodayEntry(entry: DailyEntry): Promise<DailyEntry | null> {
  try {
    const response = await fetch('/api/entries/today', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { entry?: DailyEntry };
    return data.entry ?? null;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [sidequest, setSidequest] = useState<Sidequest | null>(null);
  const [sidequestPool, setSidequestPool] = useState<Sidequest[]>(ALL_SIDEQUESTS);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [completed, setCompleted] = useState(false);
  const [dayNumber, setDayNumber] = useState(1);
  const [streak, setStreak] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const stubRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    async function loadDailyState() {
      const seed = isSignedIn && user?.id ? user.id : getAnonymousId();
      const today = getTodayString();
      const dynamicSidequests = await fetchDynamicSidequests();
      const pool = mergeSidequestPool(dynamicSidequests);
      const sq = getDailySidequest(seed, today, pool);

      let nextEntries: DailyEntry[] = [];
      let todayEntry: DailyEntry | null = null;

      if (isSignedIn) {
        nextEntries = await fetchRemoteEntries();
        todayEntry = nextEntries.find((entry) => entry.date === today) ?? null;

        if (!todayEntry) {
          todayEntry =
            (await saveRemoteTodayEntry({ sidequestId: sq.id, date: today, completed: false })) ??
            { sidequestId: sq.id, date: today, completed: false };
          nextEntries = upsertEntry(nextEntries, todayEntry);
        }
      } else {
        todayEntry = getTodayEntry();

        if (!todayEntry) {
          todayEntry = { sidequestId: sq.id, date: today, completed: false };
          saveTodayEntry(todayEntry);
        }

        nextEntries = getAllEntries();
      }

      if (cancelled) return;

      setSidequestPool(pool);
      setEntries(nextEntries);
      setSidequest(sq);
      setCompleted(todayEntry?.completed ?? false);
      setDayNumber(Math.max(nextEntries.length, 1));
      setStreak(calcStreak(nextEntries));
    }

    loadDailyState();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user?.id]);

  useEffect(() => {
    if (!labelRef.current) return;
    gsap.fromTo(
      labelRef.current,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: 0.2 }
    );
  }, []);

  useEffect(() => {
    if (!stubRef.current) return;
    gsap.fromTo(
      stubRef.current,
      { opacity: 0, x: -20, rotate: -8 },
      { opacity: 1, x: 0, rotate: -4, duration: 0.7, ease: 'back.out(1.5)', delay: 1 }
    );
  }, [sidequest]);

  const handleComplete = () => {
    if (!sidequest) return;
    const today = getTodayString();
    const existing = entries.find((entry) => entry.date === today) ?? (!isSignedIn ? getTodayEntry() : null);
    const entry: DailyEntry = {
      sidequestId: sidequest.id,
      date: today,
      completed: true,
      completedAt: new Date().toISOString(),
      comment: existing?.comment,
      imageBase64: isSignedIn ? undefined : existing?.imageBase64,
    };
    const nextEntries = upsertEntry(entries, entry);

    if (isSignedIn) {
      void saveRemoteTodayEntry(entry);
    } else {
      saveTodayEntry(entry);
    }

    setEntries(nextEntries);
    setCompleted(true);
    setDayNumber(Math.max(nextEntries.length, 1));
    setStreak(calcStreak(nextEntries));
  };

  const handleSaveModal = (comment: string, imageBase64?: string) => {
    if (!sidequest) return;
    const today = getTodayString();
    const entry: DailyEntry = {
      sidequestId: sidequest.id,
      date: today,
      completed: true,
      completedAt: new Date().toISOString(),
      comment,
      imageBase64: isSignedIn ? undefined : imageBase64,
    };
    const nextEntries = upsertEntry(entries, entry);

    if (isSignedIn) {
      void saveRemoteTodayEntry(entry);
    } else {
      saveTodayEntry(entry);
    }

    setEntries(nextEntries);
    setCompleted(true);
    setDayNumber(Math.max(nextEntries.length, 1));
    setStreak(calcStreak(nextEntries));
  };

  const handleSwap = () => {
    if (!sidequest) return;
    // Pick a random different sidequest
    const others = sidequestPool.filter((s) => s.id !== sidequest.id);
    if (!others.length) return;
    const next = others[Math.floor(Math.random() * others.length)];
    const today = getTodayString();
    const entry: DailyEntry = { sidequestId: next.id, date: today, completed: false };
    const nextEntries = upsertEntry(entries, entry);

    if (isSignedIn) {
      void saveRemoteTodayEntry(entry);
    } else {
      saveTodayEntry(entry);
    }

    setEntries(nextEntries);
    setSidequest(next);
    setCompleted(false);
    setDayNumber(Math.max(nextEntries.length, 1));
    setStreak(calcStreak(nextEntries));
  };

  if (!sidequest) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1313' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#ff6d28', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: 'rgba(245,236,217,0.4)' }}>
            Cargando tu misión...
          </p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const weekday = WEEKDAYS[today.getDay()];
  const entryNo = String(dayNumber).padStart(3, '0');
  const dateSerial = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(2)}`;

  return (
    <>
      <Navbar streak={streak} />

      <main
        className="relative flex-1 flex flex-col dark-paper-texture"
        style={{ background: '#1a1313' }}
      >
        {/* HERO — editorial asymmetric layout */}
        <section
          ref={heroRef}
          className="relative min-h-screen overflow-visible md:h-screen md:overflow-hidden"
        >
          {/* Top header label — "SIDEQUEST · JUEVES" */}
          <div
            ref={labelRef}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-20 opacity-0 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.25em]"
            style={{ color: 'rgba(245,236,217,0.4)', fontWeight: 500 }}
          >
            <span style={{ width: 24, height: 1, background: '#ff6d28' }} />
            <span>Sidequest · {weekday}</span>
            <span style={{ width: 24, height: 1, background: 'rgba(245,236,217,0.2)' }} />
          </div>

          {/* Two-column grid */}
          <div
            className="relative min-h-screen md:h-full max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-2 gap-6 pt-24 pb-14 md:pb-16"
            style={{ gridTemplateRows: '1fr' }}
          >
            {/* LEFT — scrapbook collage zone (full row height) */}
            <div className="relative h-full hidden md:block self-stretch">
              <ScrapbookImages query={sidequest.query} />
            </div>

            {/* MOBILE: smaller scrapbook on top */}
            <div className="relative md:hidden h-48 -mb-4">
              <ScrapbookImages query={sidequest.query} />
            </div>

            {/* RIGHT — card + CTA */}
            <div className="relative z-10 flex flex-col justify-center max-w-xl pt-6 md:pt-0 self-center">
              <SidequestCard
                sidequest={sidequest}
                dayNumber={dayNumber}
                completed={completed}
              />

              <CompletionButton
                completed={completed}
                isSignedIn={!!isSignedIn}
                onComplete={handleComplete}
                onOpenModal={() => setModalOpen(true)}
                onSwap={handleSwap}
              />

              {!isSignedIn && !completed && (
                <p
                  className="text-xs mt-4 flex items-center gap-3"
                  style={{ color: 'rgba(245,236,217,0.4)' }}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block w-1 h-1 rounded-full"
                      style={{ background: '#ff6d28' }}
                    />
                    Inicia sesión para guardar tus recuerdos
                  </span>
                  <span style={{ color: 'rgba(245,236,217,0.2)' }}>·</span>
                  <a
                    href="#how"
                    className="underline underline-offset-2 transition-colors"
                    style={{ color: '#ff6d28', textDecorationColor: 'rgba(255,109,40,0.4)' }}
                  >
                    ver cómo funciona
                  </a>
                </p>
              )}

              {completed && (
                <p
                  className="text-xs mt-4"
                  style={{ color: 'rgba(245,236,217,0.5)', fontFamily: 'Biscotti, serif' }}
                >
                  Vuelve mañana para tu siguiente misión
                </p>
              )}
            </div>
          </div>

          {/* Day-stub ticket — bottom-left */}
          <div
            ref={stubRef}
            className="absolute bottom-8 left-8 z-20 opacity-0 hidden md:block"
            style={{ transform: 'rotate(-4deg)' }}
          >
            <DayStub entryNo={entryNo} dayNumber={dayNumber} weekday={weekday} serial={dateSerial} />
          </div>
        </section>

        {/* About section */}
        <AboutSection />
      </main>

      <Footer />

      <CompletionModal
        isOpen={modalOpen}
        sidequestTitle={sidequest.title}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModal}
      />
    </>
  );
}

function DayStub({
  entryNo, dayNumber, weekday, serial,
}: {
  entryNo: string; dayNumber: number; weekday: string; serial: string;
}) {
  return (
    <div
      className="kraft-paper relative inline-flex flex-col px-5 py-3"
      style={{
        boxShadow: '3px 4px 12px rgba(0,0,0,0.4)',
        minWidth: 220,
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 92% 80%, 88% 100%, 82% 80%, 76% 100%, 70% 80%, 64% 100%, 58% 80%, 52% 100%, 46% 80%, 40% 100%, 34% 80%, 28% 100%, 22% 80%, 16% 100%, 10% 80%, 4% 100%, 0 80%)',
      }}
    >
      {/* Top header */}
      <div className="flex items-center justify-between text-[0.55rem] uppercase tracking-widest mb-1.5">
        <span style={{ color: 'rgba(58,42,26,0.65)', fontWeight: 700, letterSpacing: '0.18em' }}>
          N° {entryNo}
        </span>
        <span style={{ color: 'rgba(58,42,26,0.5)', fontFamily: 'monospace' }}>
          {serial}
        </span>
      </div>
      {/* Body */}
      <div
        className="flex items-baseline gap-2"
        style={{ fontFamily: 'Biscotti, serif', color: '#3a2a1a' }}
      >
        <span style={{ fontSize: '1.2rem' }}>Día {dayNumber}</span>
        <span style={{ fontSize: '0.95rem', opacity: 0.7 }}>· {weekday}</span>
      </div>
    </div>
  );
}

function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.fromTo(
            sectionRef.current!.querySelectorAll('.about-item'),
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, stagger: 0.15, duration: 0.7, ease: 'power2.out' }
          );
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const cards = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#5a4f45" strokeWidth="1.5"/>
          <path d="M12 8v4l3 3" stroke="#5a4f45" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: 'Una a la vez',
      desc: 'Sin abrumarte. Una misión por día.',
      color: '#f9f0c0',
      rotate: -2,
      tape: 'tape-orange',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.661 4.25 1 7.5 1 9.37 1 11.003 2.013 12 3.5 12.997 2.013 14.63 1 16.5 1 19.75 1 23 3.661 23 7.191c0 4.105-5.37 8.863-11 14.402z" stroke="#5a4f45" strokeWidth="1.5"/>
        </svg>
      ),
      title: 'Para darle sentido a los días',
      desc: 'Pequeñas cosas que te hacen estar presente.',
      color: '#f5d5d5',
      rotate: 1.5,
      tape: 'tape-pink',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="3" stroke="#5a4f45" strokeWidth="1.5"/>
          <path d="M8 12l3 3 5-5" stroke="#5a4f45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Lleva un diario',
      desc: 'Si te registras, guardas cada misión. Con notas, fotos, y tu calendario de vida.',
      color: '#d5e4f0',
      rotate: -1,
      tape: 'tape-blue',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative px-6 py-20 max-w-3xl mx-auto w-full"
      style={{ borderTop: '1px dashed rgba(245,236,217,0.1)' }}
    >
      <div className="about-item text-center mb-14 opacity-0">
        <div
          className="inline-block px-8 py-4 relative"
          style={{
            background: '#f5ecd9',
            transform: 'rotate(-1deg)',
            boxShadow: '3px 4px 15px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              transform: 'translateX(-50%) rotate(2deg)',
              width: 70,
              height: 22,
              background: 'repeating-linear-gradient(90deg, rgba(255,109,40,0.5) 0px, rgba(255,109,40,0.5) 4px, rgba(255,109,40,0.3) 4px, rgba(255,109,40,0.3) 8px)',
              borderRadius: 1,
              zIndex: 10,
            }}
          />
          <h2
            style={{
              fontFamily: 'Biscotti, serif',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              color: '#2a1f1a',
              margin: 0,
            }}
          >
            ¿Por qué SideQuest?
          </h2>
        </div>
        <p
          className="text-base leading-relaxed mt-6"
          style={{
            color: 'rgba(245,236,217,0.6)',
            fontWeight: 300,
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: '1.1rem',
          }}
        >
          Porque todos tenemos una lista interminable de cosas que hay que hacer.<br />
          Pero son las sidequests lo que hace la vida más interesante.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {cards.map((item, i) => (
          <div
            key={i}
            className={`about-item relative opacity-0 ${item.tape}`}
            style={{ transform: `rotate(${item.rotate}deg)` }}
          >
            <div
              className="flex flex-col items-center text-center gap-3 p-6 relative"
              style={{
                background: item.color,
                boxShadow: '2px 3px 12px rgba(0,0,0,0.35)',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
                }}
              />
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center relative"
                style={{ background: 'rgba(90, 79, 69, 0.08)' }}
              >
                {item.icon}
              </div>
              <h3
                className="text-base font-semibold"
                style={{ color: '#2a1f1a', fontFamily: 'Biscotti, serif', fontSize: '1.2rem' }}
              >
                {item.title}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'rgba(60, 50, 40, 0.65)', fontWeight: 400 }}
              >
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
