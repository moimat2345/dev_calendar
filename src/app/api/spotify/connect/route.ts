import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Spotify not configured' }, { status: 500 });
  }

  const redirectUri = process.env.SPOTIFY_REDIRECT_URI
    || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/spotify/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'user-read-recently-played user-library-read user-top-read user-read-currently-playing user-follow-read',
    redirect_uri: redirectUri,
    state: session.user.id,
    show_dialog: 'true',
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params}`
  );
}
