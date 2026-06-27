import { getAdminUser } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { sidequests as staticSidequests } from '@/lib/sidequests';

export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = ['creativo', 'conexión', 'aventura', 'mindfulness', 'conocimiento', 'arte', 'hogar', 'musica', 'videojuegos', 'ciencia', 'deporte', 'social', 'cuerpo', 'azar', 'micro-aventura'];
const ALLOWED_DIFFICULTIES = ['fácil', 'media', 'difícil'];
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const MAX_SUGGESTIONS_PER_RUN = 25;

export const SIDEQUEST_TAGS = [
  'casa',
  'calle',
  'internet',
  'creativo',
  'social',
  'reflexivo',
  'cuerpo',
  'aprendizaje',
  'azar',
  'micro-aventura',
] as const;

type SidequestTag = (typeof SIDEQUEST_TAGS)[number];
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
  tag: string | null;
  difficulty: string;
  duration: string;
  status: SuggestionStatus;
  createdAt: Date;
}

interface NormalizedSuggestion {
  title: string;
  description: string;
  query: string;
  category: string;
  tag: SidequestTag;
  difficulty: string;
  duration: string;
}

interface ContextItem {
  title: string;
  tag: string | null;
}

interface GenerationContext {
  existingTitleKeys: Set<string>;
  recentApproved: ContextItem[];
  recentRejected: ContextItem[];
}

function toPublicSuggestion(suggestion: SuggestionRow) {
  return {
    id: suggestion.id,
    title: suggestion.title,
    description: suggestion.description,
    query: suggestion.query,
    category: suggestion.category,
    tag: suggestion.tag,
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

function normalizeTitleKey(value: string): string {
  return simplify(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
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

function normalizeTag(value: unknown): SidequestTag {
  const simplified = typeof value === 'string' ? simplify(value).replace(/\s+/g, '-') : '';
  const match = SIDEQUEST_TAGS.find((tag) => simplify(tag).replace(/\s+/g, '-') === simplified);
  return match ?? 'casa';
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

function normalizeSuggestion(value: unknown): NormalizedSuggestion | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;

  return {
    title: normalizeString(raw.title, 'Nueva sidequest', 120),
    description: normalizeString(raw.description, 'Una misión simple para salir de la rutina.', 600),
    query: normalizeString(raw.query, 'small adventure', 120),
    category: normalizeCategory(raw.category),
    tag: normalizeTag(raw.tag),
    difficulty: normalizeDifficulty(raw.difficulty),
    duration: normalizeString(raw.duration, '10-20 min', 60),
  };
}

function formatContextItems(items: ContextItem[]): string {
  if (!items.length) return '- ninguna';
  return items.map((item) => `- ${item.title}${item.tag ? ` [${item.tag}]` : ''}`).join('\n');
}

async function getGenerationContext(): Promise<GenerationContext> {
  const [recentApproved, recentRejected, existingSidequests, existingSuggestions] = await Promise.all([
    prisma.sidequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { title: true, tag: true },
    }),
    prisma.sidequestSuggestion.findMany({
      where: { status: 'REJECTED' },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: { title: true, tag: true },
    }),
    prisma.sidequest.findMany({
      select: { title: true },
    }),
    prisma.sidequestSuggestion.findMany({
      select: { title: true },
    }),
  ]);

  const existingTitleKeys = new Set([
    ...staticSidequests.map((sidequest) => normalizeTitleKey(sidequest.title)),
    ...existingSidequests.map((sidequest) => normalizeTitleKey(sidequest.title)),
    ...existingSuggestions.map((suggestion) => normalizeTitleKey(suggestion.title)),
  ].filter(Boolean));

  return {
    existingTitleKeys,
    recentApproved,
    recentRejected,
  };
}

function buildPrompt(customPrompt: string, count: number, context: GenerationContext): string {
  const extraContext = customPrompt
    ? `\nPedido específico del admin, prioridad alta: ${customPrompt}`
    : '';

  return `Crea ${count} sidequests nuevas para una app personal y privada.
Prioriza el pedido específico del admin por sobre el contexto general.
No asumas que la sidequest es en pareja, familiar o romántica salvo que se pida.
Escribe en español latino/neutro.
Usa tono claro, directo y cálido, dirigido a una persona con "tú" o en infinitivo.
Deben ser pequeñas.
Evita actividades muy costosas.
Usa solo estas categorías visuales: ${ALLOWED_CATEGORIES.join(', ')}.
Usa solo estas dificultades: ${ALLOWED_DIFFICULTIES.join(', ')}.
Usa exactamente un tag de esta lista: ${SIDEQUEST_TAGS.join(', ')}.
Elige el tag que mejor clasifique la idea.
El campo query debe servir para buscar una imagen inspiracional en Unsplash, en inglés y con 2 a 5 palabras.
Evita repetir títulos exactos o casi idénticos a las referencias recientes.
${extraContext}

Últimas 10 aprobadas:
${formatContextItems(context.recentApproved)}

Últimas 10 descartadas:
${formatContextItems(context.recentRejected)}

Devuelve únicamente JSON con esta forma:
{
  "sidequests": [
    {
      "title": "string",
      "description": "string",
      "query": "string",
      "category": "creativo",
      "tag": "casa",
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
  const count = Number.isFinite(requestedCount)
    ? Math.min(Math.max(Math.round(requestedCount), 1), MAX_SUGGESTIONS_PER_RUN)
    : 5;
  const customPrompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 1500) : '';
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const generationContext = await getGenerationContext();

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
            parts: [{ text: buildPrompt(customPrompt, count, generationContext) }],
          },
        ],
        generationConfig: {
          temperature: 0.9,
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
                    tag: { type: 'STRING' },
                    difficulty: { type: 'STRING' },
                    duration: { type: 'STRING' },
                  },
                  required: ['title', 'description', 'query', 'category', 'tag', 'difficulty', 'duration'],
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

  const seenTitleKeys = new Set<string>();
  let skippedDuplicates = 0;
  const normalizedSuggestions: NormalizedSuggestion[] = [];

  for (const rawSidequest of rawSidequests) {
    const suggestion = normalizeSuggestion(rawSidequest);
    if (!suggestion) continue;

    const titleKey = normalizeTitleKey(suggestion.title);
    if (!titleKey) continue;

    if (generationContext.existingTitleKeys.has(titleKey) || seenTitleKeys.has(titleKey)) {
      skippedDuplicates += 1;
      continue;
    }

    seenTitleKeys.add(titleKey);
    normalizedSuggestions.push(suggestion);

    if (normalizedSuggestions.length >= count) {
      break;
    }
  }

  if (!normalizedSuggestions.length) {
    return Response.json({
      suggestions: [],
      skippedDuplicates,
    });
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
    skippedDuplicates,
  });
}
