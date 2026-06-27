'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  query: string;
  category: string;
  tag: string | null;
  difficulty: string;
  duration: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

interface Props {
  adminEmail: string;
}

async function readJson(response: Response) {
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    suggestions?: Suggestion[];
    skippedDuplicates?: number;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'No se pudo completar la acción');
  }

  return data;
}

export default function AdminSidequestPanel({ adminEmail }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      try {
        setError(null);
        const response = await fetch('/api/admin/sidequests/suggestions?status=PENDING');
        const data = await readJson(response);
        if (!cancelled) {
          setSuggestions(data.suggestions ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar sugerencias');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      setMessage(null);

      const response = await fetch('/api/admin/sidequests/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count, prompt }),
      });
      const data = await readJson(response);
      const newSuggestions = data.suggestions ?? [];
      const skippedText = data.skippedDuplicates
        ? ` ${data.skippedDuplicates} duplicada(s) exacta(s) fueron omitidas.`
        : '';

      setSuggestions((current) => [...newSuggestions, ...current]);
      setMessage(`${newSuggestions.length} sugerencia(s) generada(s). Revísalas antes de publicar.${skippedText}`);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'No se pudieron generar sugerencias');
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    try {
      setBusyId(id);
      setError(null);
      setMessage(null);

      const response = await fetch(`/api/admin/sidequests/suggestions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      await readJson(response);

      setSuggestions((current) => current.filter((suggestion) => suggestion.id !== id));
      setMessage(action === 'approve' ? 'Sidequest publicada en la base de datos.' : 'Sugerencia descartada.');
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'No se pudo revisar la sugerencia');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="min-h-screen px-5 py-10" style={{ background: '#101923', color: '#f5ecd9' }}>
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-sm" style={{ color: 'rgba(245,236,217,0.55)' }}>
              ← Volver a SideQuest
            </Link>
            <h1 className="mt-4 text-4xl" style={{ fontFamily: 'Biscotti, serif' }}>
              Admin de sidequests
            </h1>
            <p className="mt-2 max-w-2xl text-sm" style={{ color: 'rgba(245,236,217,0.62)' }}>
              Sesión admin: {adminEmail}. Gemini solo propone ideas; ninguna sidequest se publica sin aprobarla.
            </p>
          </div>
        </header>

        <section
          className="rounded-3xl p-5 md:p-6"
          style={{ background: '#1a2535', border: '1px solid rgba(245,236,217,0.08)' }}
        >
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <label className="flex flex-col gap-2 text-sm">
              Pedirle ideas a la IA
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ej: sidequests para reconectar en casa, sin gastar dinero, durante una semana lluviosa"
                className="min-h-28 rounded-2xl border px-4 py-3 outline-none"
                style={{
                  background: '#101923',
                  borderColor: 'rgba(245,236,217,0.12)',
                  color: '#f5ecd9',
                }}
              />
            </label>

            <div className="flex flex-col gap-3 md:w-48">
              <label className="flex flex-col gap-2 text-sm">
                Cantidad
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={count}
                  onChange={(event) => {
                    const nextCount = Number(event.target.value);
                    setCount(Number.isFinite(nextCount) ? Math.min(Math.max(nextCount, 1), 25) : 1);
                  }}
                  className="rounded-2xl border px-4 py-3 outline-none"
                  style={{
                    background: '#101923',
                    borderColor: 'rgba(245,236,217,0.12)',
                    color: '#f5ecd9',
                  }}
                />
              </label>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-full px-5 py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ background: '#ff6d28', color: '#101923' }}
              >
                {generating ? 'Generando...' : 'Generar ideas'}
              </button>
            </div>
          </div>

          {message && (
            <p className="mt-4 rounded-2xl px-4 py-3 text-sm" style={{ background: 'rgba(124,232,124,0.12)' }}>
              {message}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-2xl px-4 py-3 text-sm" style={{ background: 'rgba(255,109,40,0.16)' }}>
              {error}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pendientes de revisión</h2>
            <span className="text-sm" style={{ color: 'rgba(245,236,217,0.5)' }}>
              {suggestions.length} pendiente(s)
            </span>
          </div>

          {loading && (
            <div className="rounded-3xl p-6 text-sm" style={{ background: '#1a2535' }}>
              Cargando sugerencias...
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <div
              className="rounded-3xl p-8 text-center"
              style={{ background: '#1a2535', border: '1px solid rgba(245,236,217,0.08)' }}
            >
              <p className="text-3xl">🗺️</p>
              <p className="mt-3 text-sm" style={{ color: 'rgba(245,236,217,0.62)' }}>
                No hay sugerencias pendientes. Pídele unas cuantas ideas a la IA.
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {suggestions.map((suggestion) => (
              <article
                key={suggestion.id}
                className="rounded-3xl p-5"
                style={{ background: '#1a2535', border: '1px solid rgba(245,236,217,0.08)' }}
              >
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full px-3 py-1" style={{ background: 'rgba(255,109,40,0.16)' }}>
                    {suggestion.category}
                  </span>
                  {suggestion.tag && (
                    <span className="rounded-full px-3 py-1" style={{ background: 'rgba(124,185,232,0.16)' }}>
                      {suggestion.tag}
                    </span>
                  )}
                  <span className="rounded-full px-3 py-1" style={{ background: 'rgba(245,236,217,0.08)' }}>
                    {suggestion.difficulty}
                  </span>
                  <span className="rounded-full px-3 py-1" style={{ background: 'rgba(245,236,217,0.08)' }}>
                    {suggestion.duration}
                  </span>
                </div>

                <h3 className="text-2xl" style={{ fontFamily: 'Biscotti, serif' }}>
                  {suggestion.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(245,236,217,0.68)' }}>
                  {suggestion.description}
                </p>
                <p className="mt-4 text-xs" style={{ color: 'rgba(245,236,217,0.42)' }}>
                  Unsplash query: {suggestion.query}
                </p>

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => handleReview(suggestion.id, 'approve')}
                    disabled={busyId === suggestion.id}
                    className="flex-1 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
                    style={{ background: '#ff6d28', color: '#101923' }}
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleReview(suggestion.id, 'reject')}
                    disabled={busyId === suggestion.id}
                    className="flex-1 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
                    style={{ background: 'rgba(245,236,217,0.08)', color: '#f5ecd9' }}
                  >
                    Descartar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
