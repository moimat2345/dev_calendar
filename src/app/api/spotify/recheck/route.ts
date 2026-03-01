import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { recheckAllSpotifyContexts } from '@/plugins/spotify/lib';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await recheckAllSpotifyContexts(session.user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Recheck failed' },
      { status: 500 }
    );
  }
}
