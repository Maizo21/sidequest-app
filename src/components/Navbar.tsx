'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { gsap } from 'gsap';

interface Props {
  streak?: number;
}

export default function Navbar({ streak = 0 }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const { isSignedIn } = useUser();
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!navRef.current) return;
    gsap.fromTo(
      navRef.current,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', delay: 0.1 }
    );
  }, []);

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 opacity-0"
      style={{ background: 'linear-gradient(to bottom, rgba(26,19,19,0.95) 0%, rgba(26,19,19,0) 100%)' }}
    >
      {/* Logo */}
      <Link href="/" className="group flex items-center gap-2.5">
        {/* S mark */}
        <span
          className="flex items-center justify-center font-bold"
          style={{
            width: 32,
            height: 32,
            background: '#ff6d28',
            color: '#1a1313',
            fontFamily: 'Biscotti, serif',
            fontSize: '1.4rem',
            borderRadius: 4,
            boxShadow: '2px 2px 0 #1a1313',
            lineHeight: 1,
            paddingTop: 2,
          }}
        >
          S
        </span>
        <div className="flex flex-col leading-none">
          <span
            className="text-lg leading-none"
            style={{ fontFamily: 'Biscotti, serif', color: '#f5ecd9' }}
          >
            SideQuest
          </span>
          <span
            className="text-[0.55rem] font-medium tracking-widest uppercase mt-0.5"
            style={{ color: 'rgba(245,236,217,0.45)', letterSpacing: '0.2em' }}
          >
            Diario · {year}
          </span>
        </div>
      </Link>

      {/* Right side: streak + auth */}
      <div className="flex items-center gap-3">
        {streak > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
            style={{
              background: 'rgba(255,109,40,0.15)',
              border: '1px solid rgba(255,109,40,0.4)',
              color: '#ff6d28',
              borderRadius: 999,
            }}
          >
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <path d="M6 1c0 3 3 4 3 7a3 3 0 11-6 0c0-1 1-2 1-3 0 2 2 2 2-1V1z" fill="currentColor"/>
            </svg>
            {streak} {streak === 1 ? 'día' : 'días'}
          </div>
        )}

        {!isSignedIn && (
          <SignInButton mode="modal">
            <button
              className="text-sm font-medium px-4 py-2 rounded-full border transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                color: '#f5ecd9',
                borderColor: 'rgba(245,236,217,0.3)',
                background: 'rgba(245,236,217,0.05)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#ff6d28';
                (e.currentTarget as HTMLButtonElement).style.color = '#ff6d28';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(245,236,217,0.3)';
                (e.currentTarget as HTMLButtonElement).style.color = '#f5ecd9';
              }}
            >
              Entrar
            </button>
          </SignInButton>
        )}

        {isSignedIn && (
          <>
            <Link
              href="/dashboard"
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: 'rgba(245,236,217,0.7)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#ff6d28')}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(245,236,217,0.7)')
              }
            >
              Mi diario
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-8 h-8 ring-2 ring-offset-2 ring-offset-[#1a1313] ring-[#ff6d28]/40',
                },
              }}
            />
          </>
        )}
      </div>
    </nav>
  );
}
