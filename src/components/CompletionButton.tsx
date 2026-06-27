'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

interface Props {
  completed: boolean;
  isSignedIn: boolean;
  onComplete: () => void;
  onOpenModal: () => void;
  onSwap?: () => void;
}

function fireParticles(buttonEl: HTMLElement) {
  const colors = ['#ff6d28', '#f5ecd9', '#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#c9a961'];
  const shapes = ['circle', 'square', 'triangle'];

  for (let i = 0; i < 40; i++) {
    const particle = document.createElement('div');
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = Math.random() * 12 + 5;
    const color = colors[Math.floor(Math.random() * colors.length)];

    particle.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${shape === 'circle' ? '50%' : shape === 'square' ? '2px' : '0'};
      pointer-events: none;
      z-index: 9999;
      clip-path: ${shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none'};
    `;
    document.body.appendChild(particle);

    const rect = buttonEl.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const angle = (Math.random() * Math.PI * 2);
    const distance = 80 + Math.random() * 220;

    gsap.set(particle, { x: startX, y: startY, scale: 0 });
    gsap.to(particle, {
      x: startX + Math.cos(angle) * distance,
      y: startY + Math.sin(angle) * distance - 60,
      opacity: 0,
      scale: Math.random() * 1.5 + 0.5,
      rotation: Math.random() * 720 - 360,
      duration: 0.7 + Math.random() * 0.6,
      ease: 'power2.out',
      onComplete: () => particle.remove(),
    });
  }
}

export default function CompletionButton({ completed, isSignedIn, onComplete, onOpenModal, onSwap }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [animating, setAnimating] = useState(false);

  // Entrance animation
  useEffect(() => {
    if (!wrapperRef.current) return;
    gsap.fromTo(
      wrapperRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', delay: 0.7 }
    );
  }, []);

  const handleClick = () => {
    if (completed || animating || !btnRef.current) return;
    setAnimating(true);

    fireParticles(btnRef.current);

    if (isSignedIn) {
      setTimeout(() => {
        setAnimating(false);
        onOpenModal();
      }, 250);
    } else {
      setTimeout(() => {
        onComplete();
        setAnimating(false);
      }, 250);
    }
  };

  return (
    <div ref={wrapperRef} className="flex flex-col sm:flex-row items-stretch gap-3 mt-6 md:mt-8 opacity-0 w-full">
      <button
        ref={btnRef}
        onClick={handleClick}
        disabled={completed || animating}
        className="stamp-btn flex-1 flex items-center justify-center gap-2 text-sm"
        aria-label={completed ? 'Misión cumplida' : 'Completar misión'}
      >
        {completed ? (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Misión cumplida
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Completado
          </>
        )}
      </button>

      {onSwap && !completed && (
        <button
          onClick={onSwap}
          className="stamp-btn-secondary flex items-center justify-center gap-1.5"
          aria-label="Cambiar misión"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 5h8M10 5L8 3M10 5L8 7M12 9H4M4 9l2-2M4 9l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Cambiar
        </button>
      )}
    </div>
  );
}
