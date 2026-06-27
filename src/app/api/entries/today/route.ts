import { auth } from '@clerk/nextjs/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface DbEntry {
  sidequestId: number;
  date: string;
  completed: boolean;
  completedAt: Date | null;
  comment: string | null;
}

function toPublicEntry(entry: DbEntry) {
  return {
    sidequestId: entry.sidequestId,
    date: entry.date,
    completed: entry.completed,
    completedAt: entry.completedAt?.toISOString(),
    comment: entry.comment ?? undefined,
  };
}

function parseCompletedAt(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    sidequestId?: unknown;
    date?: unknown;
    completed?: unknown;
    completedAt?: unknown;
    comment?: unknown;
  } | null;

  const sidequestId = Number(body?.sidequestId);
  const date = body?.date;

  if (!Number.isInteger(sidequestId) || typeof date !== 'string' || !DATE_PATTERN.test(date)) {
    return Response.json({ error: 'Invalid entry payload' }, { status: 400 });
  }

  const completed = Boolean(body?.completed);
  const completedAt = completed ? parseCompletedAt(body?.completedAt) ?? new Date() : null;
  const comment =
    typeof body?.comment === 'string' && body.comment.trim()
      ? body.comment.trim().slice(0, 1000)
      : null;

  const entry = await prisma.entry.upsert({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
    create: {
      userId,
      sidequestId,
      date,
      completed,
      completedAt,
      comment,
    },
    update: {
      sidequestId,
      completed,
      completedAt,
      comment,
    },
  });

  return Response.json({
    entry: toPublicEntry(entry),
  });
}
