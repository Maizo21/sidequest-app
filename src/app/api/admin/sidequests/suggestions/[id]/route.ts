import { getAdminUser } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function toPublicSuggestion(suggestion: {
  id: string;
  title: string;
  description: string;
  query: string;
  category: string;
  tag: string | null;
  difficulty: string;
  duration: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
}) {
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();

  if (!admin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: unknown };
  const action = typeof body.action === 'string' ? body.action : '';

  if (action !== 'approve' && action !== 'reject') {
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }

  const suggestion = await prisma.sidequestSuggestion.findUnique({
    where: { id },
  });

  if (!suggestion) {
    return Response.json({ error: 'Suggestion not found' }, { status: 404 });
  }

  if (suggestion.status !== 'PENDING') {
    return Response.json({ error: 'Suggestion already reviewed' }, { status: 409 });
  }

  if (action === 'reject') {
    const rejectedSuggestion = await prisma.sidequestSuggestion.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedByUserId: admin.userId,
        reviewedByEmail: admin.email,
      },
    });

    return Response.json({
      suggestion: toPublicSuggestion(rejectedSuggestion),
    });
  }

  const result = await prisma.$transaction(async (transaction) => {
    const sidequest = await transaction.sidequest.create({
      data: {
        title: suggestion.title,
        description: suggestion.description,
        query: suggestion.query,
        category: suggestion.category,
        tag: suggestion.tag,
        difficulty: suggestion.difficulty,
        duration: suggestion.duration,
        source: suggestion.model ? 'gemini' : 'admin',
        createdByUserId: admin.userId,
        createdByEmail: admin.email,
      },
    });

    const approvedSuggestion = await transaction.sidequestSuggestion.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedByUserId: admin.userId,
        reviewedByEmail: admin.email,
      },
    });

    return {
      sidequest,
      suggestion: approvedSuggestion,
    };
  });

  return Response.json({
    suggestion: toPublicSuggestion(result.suggestion),
    sidequest: {
      id: result.sidequest.id,
      title: result.sidequest.title,
      description: result.sidequest.description,
      query: result.sidequest.query,
      category: result.sidequest.category,
      tag: result.sidequest.tag,
      difficulty: result.sidequest.difficulty,
      duration: result.sidequest.duration,
    },
  });
}
