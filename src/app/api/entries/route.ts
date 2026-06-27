import { auth } from '@clerk/nextjs/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entries = await prisma.entry.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  return Response.json({
    entries: entries.map(toPublicEntry),
  });
}
