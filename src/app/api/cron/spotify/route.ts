import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { syncSpotifyForUser } from '@/plugins/spotify/lib';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch all users with an enabled Spotify connection
  const connections = await prisma.pluginConnection.findMany({
    where: { pluginId: 'spotify', enabled: true },
    include: { user: { select: { id: true } } },
  });

  const results: Record<string, { newEvents: number; error?: string }> = {};

  for (const conn of connections) {
    const userId = conn.user.id;
    try {
      if (!conn.credentials) continue;

      const result = await syncSpotifyForUser(
        userId,
        conn.credentials as Record<string, any>,
        conn.lastSynced
      );

      // Update connection with refreshed credentials + lastSynced
      await prisma.pluginConnection.update({
        where: { id: conn.id },
        data: {
          credentials: result.credentials,
          lastSynced: new Date(),
        },
      });

      results[userId] = { newEvents: result.newEvents };

      // Invalidate cache for this user
      revalidateTag(`activity-${userId}`, 'default');
    } catch (error: any) {
      console.error(`Spotify cron error for user ${userId}:`, error);
      results[userId] = { newEvents: 0, error: error.message };
    }
  }

  return NextResponse.json({
    synced: Object.keys(results).length,
    results,
  });
}
