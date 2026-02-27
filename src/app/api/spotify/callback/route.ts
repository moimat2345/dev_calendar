import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSpotifyTokens } from '@/plugins/spotify/lib';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    console.error('Spotify OAuth error:', error);
    return NextResponse.redirect(new URL('/dashboard?spotify=error', request.url));
  }

  if (!code || state !== session.user.id) {
    return NextResponse.redirect(new URL('/dashboard?spotify=error', request.url));
  }

  try {
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI
      || `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/spotify/callback`;
    const tokens = await getSpotifyTokens(code, redirectUri);

    await prisma.pluginConnection.upsert({
      where: {
        userId_pluginId: {
          userId: session.user.id,
          pluginId: 'spotify',
        },
      },
      update: {
        credentials: tokens,
        enabled: true,
      },
      create: {
        userId: session.user.id,
        pluginId: 'spotify',
        credentials: tokens,
        enabled: true,
      },
    });

    return NextResponse.redirect(new URL('/dashboard?spotify=connected', request.url));
  } catch (err) {
    console.error('Spotify callback error:', err);
    return NextResponse.redirect(new URL('/dashboard?spotify=error', request.url));
  }
}
