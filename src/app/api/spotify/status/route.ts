import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connection = await prisma.pluginConnection.findUnique({
    where: {
      userId_pluginId: {
        userId: session.user.id,
        pluginId: 'spotify',
      },
    },
    select: { enabled: true, lastSynced: true },
  });

  return NextResponse.json({
    connected: !!connection?.enabled,
    lastSynced: connection?.lastSynced?.toISOString() || null,
  });
}
