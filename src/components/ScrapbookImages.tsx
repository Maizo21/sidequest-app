'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';

interface UnsplashImage {
  url: string;
  small: string;
  alt: string;
  author?: string;
}

interface Props {
  query: string;
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const TAPE_CLASSES = ['tape', 'tape-left', 'tape-right', 'tape-orange', 'tape-blue', 'tape-green', 'tape-pink'] as const;

// 4 polaroids — pixel positions, all clustered in the top of left column
// Overlapping is intentional (scrapbook collage)
interface SlotConfig {
  top: number;   // px
  left: number;  // px
  width: number;
  rotate: number;
  z: number;
  tape: string;
}

function buildSlots(): SlotConfig[] {
  return [
    {
      // Top-left, biggest hero photo
      top: 0,
      left: 10,
      width: 270,
      rotate: rand(-6, -3),
      z: 2,
      tape: pick(TAPE_CLASSES),
    },
    {
      // Top-right, overlapping front of #1
      top: 60,
      left: 240,
      width: 215,
      rotate: rand(4, 8),
      z: 3,
      tape: pick(TAPE_CLASSES),
    },
    {
      // Bottom-left, behind
      top: 280,
      left: 0,
      width: 195,
      rotate: rand(-9, -5),
      z: 1,
      tape: pick(TAPE_CLASSES),
    },
    {
      // Bottom-right front (gets the caption)
      top: 320,
      left: 210,
      width: 200,
      rotate: rand(3, 7),
      z: 4,
      tape: pick(TAPE_CLASSES),
    },
  ];
}

export default function ScrapbookImages({ query }: Props) {
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const floatTweens = useRef<gsap.core.Tween[]>([]);

  // Slots + caption (random per page load, but stable across re-renders)
  const slots = useMemo(() => buildSlots(), []);
  const caption = useMemo(
    () => pick(['los detalles que casi se me escapan', 'pequeñas notas del día', 'lo que vi y no olvidaré', 'momentos sueltos', 'fragmentos del jueves']),
    []
  );

  // Fetch images
  useEffect(() => {
    const cacheKey = `sq_imgs_${query}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= 1) {
          setImages(parsed);
          setLoading(false);
          return;
        }
      } catch { /* ignore */ }
    }

    fetch(`/api/unsplash?query=${encodeURIComponent(query)}&count=5`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setImages(data);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [query]);

  // Gentle floating animation
  useEffect(() => {
    if (images.length === 0 || !containerRef.current) return;

    const els = containerRef.current.querySelectorAll<HTMLElement>('.sq-polaroid');
    floatTweens.current.forEach((t) => t.kill());
    floatTweens.current = [];

    els.forEach((el, i) => {
      const tween = gsap.to(el, {
        y: `+=${rand(3, 6)}`,
        rotation: `+=${(i % 2 === 0 ? 1 : -1) * rand(0.8, 1.6)}`,
        duration: rand(2.5, 4),
        repeat: -1, yoyo: true, ease: 'sine.inOut',
        delay: i * 0.2,
      });
      floatTweens.current.push(tween);
    });

    return () => { floatTweens.current.forEach((t) => t.kill()); };
  }, [images]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Loading shimmer */}
      {loading && slots.map((slot, i) => (
        <div
          key={`shim-${i}`}
          className="polaroid"
          style={{
            position: 'absolute',
            top: slot.top,
            left: slot.left,
            width: slot.width,
            transform: `rotate(${slot.rotate}deg)`,
            zIndex: slot.z,
            opacity: 0.3,
          }}
        >
          <div className="shimmer" style={{ width: '100%', height: slot.width * 0.75 }} />
        </div>
      ))}

      {/* Decorative star sticker on the hero polaroid */}
      {!loading && images.length > 0 && (
        <div
          className="sq-deco"
          style={{
            position: 'absolute',
            top: 18,
            left: 230,
            zIndex: 10,
            transform: 'rotate(15deg)',
            filter: 'drop-shadow(2px 3px 4px rgba(0,0,0,0.4))',
            pointerEvents: 'none',
          }}
        >
          <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
            <path
              d="M23 3l5 14h14l-11 9 4 14-12-9-12 9 4-14L4 17h14z"
              fill="#ffc94a"
              stroke="#c8a020"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* 4 polaroids */}
      {!loading && images.length > 0 && slots.map((slot, i) => {
        const img = images[i % images.length];
        const imgH = Math.round(slot.width * 0.8);
        const isLast = i === slots.length - 1;
        return (
          <div
            key={`pol-${i}`}
            className={`sq-polaroid polaroid ${slot.tape}`}
            style={{
              position: 'absolute',
              top: slot.top,
              left: slot.left,
              width: slot.width,
              transform: `rotate(${slot.rotate.toFixed(1)}deg)`,
              transformOrigin: 'center center',
              zIndex: slot.z,
            }}
          >
            <img
              src={img.small}
              alt={img.alt}
              className="block w-full object-cover"
              style={{ height: imgH, display: 'block' }}
              draggable={false}
            />
            {/* Handwritten caption only on the last (front) photo */}
            {isLast && (
              <div
                style={{
                  fontFamily: 'Biscotti, serif',
                  fontSize: '0.85rem',
                  color: '#5a4a3a',
                  textAlign: 'center',
                  marginTop: 6,
                  fontStyle: 'italic',
                  opacity: 0.85,
                }}
              >
                &lsquo;{caption}&rsquo;
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
