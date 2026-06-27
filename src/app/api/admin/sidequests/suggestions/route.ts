import { getAdminUser } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = ['creativo', 'conexión', 'aventura', 'mindfulness', 'conocimiento', 'arte', 'hogar'];
const ALLOWED_DIFFICULTIES = ['fácil', 'media', 'difícil'];
const DEFAULT_MODEL = 'gemini-2.0-flash-lite';

type SuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface SuggestionRow {
  id: string;
  title: string;
  description: string;
  query: string;
  category: string;
  difficulty: string;
  duration: string;
  status: SuggestionStatus;
  createdAt: Date;
}

function toPublicSuggestion(suggestion: SuggestionRow) {
  return {
    id: suggestion.id,
    title: suggestion.title,
    description: suggestion.description,
    query: suggestion.query,
    category: suggestion.category,
    difficulty: suggestion.difficulty,
    duration: suggestion.duration,
    status: suggestion.status,
    createdAt: suggestion.createdAt.toISOString(),
  };
}

function simplify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeString(value: unknown, fallback: string, maxLength: number): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, maxLength);
}

function normalizeCategory(value: unknown): string {
  const simplified = typeof value === 'string' ? simplify(value) : '';
  const match = ALLOWED_CATEGORIES.find((category) => simplify(category) === simplified);
  return match ?? 'creativo';
}

function normalizeDifficulty(value: unknown): string {
  const simplified = typeof value === 'string' ? simplify(value) : '';
  const match = ALLOWED_DIFFICULTIES.find((difficulty) => simplify(difficulty) === simplified);
  return match ?? 'fácil';
}

function parseJsonText(text: string): unknown {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
    }

    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
    }

    throw new Error('Gemini response was not valid JSON');
  }
}

function normalizeSuggestion(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;

  return {
    title: normalizeString(raw.title, 'Nueva sidequest', 120),
    description: normalizeString(raw.description, 'Una misión simple para salir de la rutina.', 600),
    query: normalizeString(raw.query, 'small adventure', 120),
    category: normalizeCategory(raw.category),
    difficulty: normalizeDifficulty(raw.difficulty),
    duration: normalizeString(raw.duration, '10-20 min', 60),
  };
}

function buildPrompt(customPrompt: string, count: number): string {
  const extraContext = customPrompt
    ? `\nContexto adicional del admin: ${customPrompt}`
    : '';

  return `Crea ${count} sidequests nuevas para una app privada de pareja/familia.
Deben ser pequeñas, seguras, económicas, realizables en casa o ciudad, y con tono cálido.
Evita actividades ilegales, peligrosas, explícitamente sexuales, con alcohol/drogas, o muy costosas.
Usa solo estas categorías: ${ALLOWED_CATEGORIES.join(', ')}.
Usa solo estas dificultades: ${ALLOWED_DIFFICULTIES.join(', ')}.
El campo query debe servir para buscar una imagen inspiracional en Unsplash, en inglés y con 2 a 5 palabras.${extraContext}

Devuelve únicamente JSON con esta forma:
{
  "sidequests": [
    {
      "title": "string",
      "description": "string",
      "query": "string",
      "category": "creativo",
      "difficulty": "fácil",
      "duration": "10-20 min"
    }
  ]
}`;
}

export async function GET(request: Request) {
  const admin = await getAdminUser();

  if (!admin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const statusParam = new URL(request.url).searchParams.get('status')?.toUpperCase();
  const status = statusParam === 'APPROVED' || statusParam === 'REJECTED' || statusParam === 'PENDING'
    ? statusParam
    : 'PENDING';

  const suggestions = await prisma.sidequestSuggestion.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return Response.json({
    suggestions: suggestions.map(toPublicSuggestion),
  });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();

  if (!admin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Missing GEMINI_API_KEY' }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    count?: unknown;
    prompt?: unknown;
  };
  const requestedCount = Number(body.count);
  const count = Number.isFinite(requestedCount) ? Math.min(Math.max(Math.round(requestedCount), 1), 10) : 5;
  const customPrompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 1000) : '';
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPrompt(customPrompt, count) }],
          },
        ],
        generationConfig: {
          temperature: 0.85,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              sidequests: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    title: { type: 'STRING' },
                    description: { type: 'STRING' },
                    query: { type: 'STRING' },
                    category: { type: 'STRING' },
                    difficulty: { type: 'STRING' },
                    duration: { type: 'STRING' },
                  },
                  required: ['title', 'description', 'query', 'category', 'difficulty', 'duration'],
                },
              },
            },
            required: ['sidequests'],
          },
        },
      }),
    }
  );

  const data = (await response.json().catch(() => ({}))) as GeminiResponse;

  if (!response.ok) {
    console.error('Gemini generation failed', data.error?.message ?? response.status);
    return Response.json({ error: 'Gemini generation failed' }, { status: 502 });
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n').trim();
  if (!text) {
    return Response.json({ error: 'Gemini returned an empty response' }, { status: 502 });
  }

  const parsed = parseJsonText(text);
  const rawSidequests = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>).sidequests
      : null;

  if (!Array.isArray(rawSidequests)) {
    return Response.json({ error: 'Gemini response did not contain sidequests' }, { status: 502 });
  }

  const normalizedSuggestions = rawSidequests
    .slice(0, count)
    .map(normalizeSuggestion)
    .filter((suggestion): suggestion is NonNullable<ReturnType<typeof normalizeSuggestion>> => Boolean(suggestion));

  if (!normalizedSuggestions.length) {
    return Response.json({ error: 'Gemini did not generate valid suggestions' }, { status: 502 });
  }

  const suggestions = await Promise.all(
    normalizedSuggestions.map((suggestion) =>
      prisma.sidequestSuggestion.create({
        data: {
          ...suggestion,
          prompt: customPrompt || null,
          model,
          generatedByUserId: admin.userId,
          generatedByEmail: admin.email,
        },
      })
    )
  );

  return Response.json({
    suggestions: suggestions.map(toPublicSuggestion),
  });
}
