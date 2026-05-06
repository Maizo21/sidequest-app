'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

interface Props {
  isOpen: boolean;
  sidequestTitle: string;
  onClose: () => void;
  onSave: (comment: string, imageBase64?: string) => void;
}

export default function CompletionModal({ isOpen, sidequestTitle, onClose, onSave }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [comment, setComment] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Open / close animation
  useEffect(() => {
    if (!overlayRef.current || !modalRef.current) return;

    if (isOpen) {
      // Reset
      setSaved(false);
      setSaving(false);
      document.body.style.overflow = 'hidden';

      gsap.set(overlayRef.current, { display: 'flex' });
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: 40, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
      );
    } else {
      document.body.style.overflow = '';
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          if (overlayRef.current) overlayRef.current.style.display = 'none';
        },
      });
    }
  }, [isOpen]);

  const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar 5MB');
      return;
    }
    const compressed = await compressImage(file);
    setImagePreview(compressed);
    setImageBase64(compressed);
  };

  const handleSave = async () => {
    setSaving(true);
    // Short delay for UX feedback
    await new Promise((r) => setTimeout(r, 400));
    onSave(comment.trim(), imageBase64);
    setSaved(true);
    setSaving(false);

    // Animate success then close
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        scale: 1.03,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
        ease: 'power1.inOut',
        onComplete: () => {
          setTimeout(() => {
            setComment('');
            setImagePreview(null);
            setImageBase64(undefined);
            onClose();
          }, 800);
        },
      });
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 items-center justify-center px-4"
      style={{
        display: 'none',
        background: 'rgba(16, 25, 35, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-2xl p-6 md:p-8"
        style={{
          background: '#1a2535',
          border: '1px solid rgba(255,109,40,0.2)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-150"
          style={{ color: 'rgba(240,236,227,0.4)', background: 'rgba(240,236,227,0.05)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = '#f0ece3';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(240,236,227,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,236,227,0.4)';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(240,236,227,0.05)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {saved ? (
          /* Success state */
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,109,40,0.15)' }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M6 16l7 7 13-13" stroke="#ff6d28" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontFamily: 'Biscotti, serif', fontSize: '1.5rem', color: '#f0ece3' }}>
              ¡Guardado!
            </p>
            <p className="text-sm text-center" style={{ color: 'rgba(240,236,227,0.6)' }}>
              Tu recuerdo quedó guardado en tu progreso.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#ff6d28' }}>
                Misión completada
              </p>
              <h2
                className="leading-tight"
                style={{ fontFamily: 'Biscotti, serif', fontSize: '1.6rem', color: '#f0ece3' }}
              >
                {sidequestTitle}
              </h2>
            </div>

            {/* Comment */}
            <div className="mb-5">
              <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(240,236,227,0.6)' }}>
                ¿Cómo fue? (opcional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Escribe algo sobre tu experiencia..."
                className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all duration-200"
                style={{
                  background: 'rgba(16,25,35,0.8)',
                  border: '1px solid rgba(240,236,227,0.12)',
                  color: '#f0ece3',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,109,40,0.5)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(240,236,227,0.12)')}
              />
              <p className="text-right text-xs mt-1" style={{ color: 'rgba(240,236,227,0.3)' }}>
                {comment.length}/500
              </p>
            </div>

            {/* Image upload */}
            <div className="mb-6">
              <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(240,236,227,0.6)' }}>
                Adjuntar foto (opcional, máx. 5MB)
              </label>

              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="w-full h-40 object-cover"
                  />
                  <button
                    onClick={() => { setImagePreview(null); setImageBase64(undefined); }}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full"
                    style={{ background: 'rgba(16,25,35,0.8)', color: '#f0ece3' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl py-6 flex flex-col items-center gap-2 transition-all duration-200"
                  style={{
                    border: '1.5px dashed rgba(240,236,227,0.18)',
                    color: 'rgba(240,236,227,0.4)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,109,40,0.4)';
                    (e.currentTarget as HTMLButtonElement).style.color = '#ff6d28';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(240,236,227,0.18)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,236,227,0.4)';
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-xs">Subir foto</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors duration-200"
                style={{
                  background: 'rgba(240,236,227,0.06)',
                  color: 'rgba(240,236,227,0.5)',
                  border: '1px solid rgba(240,236,227,0.1)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(240,236,227,0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(240,236,227,0.06)';
                }}
              >
                Omitir
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: saving ? 'rgba(255,109,40,0.5)' : '#ff6d28',
                  color: '#101923',
                  boxShadow: saving ? 'none' : '0 4px 20px rgba(255,109,40,0.3)',
                }}
              >
                {saving ? 'Guardando...' : 'Guardar recuerdo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
