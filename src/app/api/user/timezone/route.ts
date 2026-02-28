import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { timezone } = await request.json();
  if (!timezone || typeof timezone !== 'string') {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { timezone },
  });

  return NextResponse.json({ ok: true });
}
