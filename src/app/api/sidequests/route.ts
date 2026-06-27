import { prisma } from '@/lib/prisma';
import type { Sidequest } from '@/lib/sidequests';

export const dynamic = 'force-dynamic';

interface DbSidequest {
  id: number;
  title: string;
  description: string;
  query: string;
  category: string;
  difficulty: string;
  duration: string;
}

function toPublicSidequest(sidequest: DbSidequest): Sidequest {
  return {
    id: sidequest.id,
    title: sidequest.title,
    description: sidequest.description,
    query: sidequest.query,
    category: sidequest.category,
    difficulty: sidequest.difficulty,
    duration: sidequest.duration,
  };
}

export async function GET() {
  try {
    const sidequests = await prisma.sidequest.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });

    return Response.json({
      sidequests: sidequests.map(toPublicSidequest),
    });
  } catch (error) {
    console.error('Failed to load dynamic sidequests', error);
    return Response.json({ sidequests: [] });
  }
}
