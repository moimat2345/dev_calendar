import { prisma } from '@/lib/prisma';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

interface SpotifyTokens {
  [key: string]: string | number;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp ms
}

interface SpotifyTrackPlay {
  playedAt: string;
  track: {
    id: string;
    name: string;
    durationMs: number;
    uri: string;
    artists: { name: string }[];
    album: {
      name: string;
      images: { url: string; width: number }[];
    };
  };
}

function getClientCredentials(): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

export async function getSpotifyTokens(
  code: string,
  redirectUri: string
): Promise<SpotifyTokens> {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getClientCredentials()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Spotify token exchange failed: ${error}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<SpotifyTokens> {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getClientCredentials()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Spotify token refresh failed: ${error}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function getValidAccessToken(
  credentials: Record<string, any>
): Promise<{ accessToken: string; credentials: SpotifyTokens }> {
  const { accessToken, refreshToken, expiresAt } = credentials as SpotifyTokens;

  // Refresh if expires within 5 minutes
  if (Date.now() > expiresAt - 300_000) {
    const newTokens = await refreshAccessToken(refreshToken);
    return { accessToken: newTokens.accessToken, credentials: newTokens };
  }

  return {
    accessToken,
    credentials: { accessToken, refreshToken, expiresAt },
  };
}

export async function fetchRecentlyPlayed(
  accessToken: string,
  after?: number
): Promise<SpotifyTrackPlay[]> {
  const params = new URLSearchParams({ limit: '50' });
  if (after) {
    params.set('after', String(after));
  }

  const res = await fetch(
    `${SPOTIFY_API_BASE}/me/player/recently-played?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Spotify recently-played failed: ${error}`);
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    playedAt: item.played_at,
    track: {
      id: item.track.id,
      name: item.track.name,
      durationMs: item.track.duration_ms,
      uri: item.track.uri,
      artists: item.track.artists.map((a: any) => ({ name: a.name })),
      album: {
        name: item.track.album.name,
        images: item.track.album.images || [],
      },
    },
  }));
}

export async function syncSpotifyForUser(
  userId: string,
  credentials: Record<string, any>,
  lastSynced: Date | null
): Promise<{ newEvents: number; credentials: SpotifyTokens }> {
  const { accessToken, credentials: updatedCreds } =
    await getValidAccessToken(credentials);

  // Fetch tracks played since last sync (or last 50 if first sync)
  const after = lastSynced ? lastSynced.getTime() : undefined;
  const tracks = await fetchRecentlyPlayed(accessToken, after);

  let newEvents = 0;

  for (const play of tracks) {
    const timestamp = new Date(play.playedAt);
    const day = timestamp.toISOString().split('T')[0];
    const artists = play.track.artists.map((a) => a.name).join(', ');
    const albumImage = play.track.album.images.find((i) => i.width <= 300)?.url
      || play.track.album.images[0]?.url
      || null;

    // Upsert to avoid duplicates (same user + same track + same played_at)
    const existing = await prisma.activityEvent.findFirst({
      where: {
        userId,
        pluginId: 'spotify',
        timestamp,
      },
    });

    if (!existing) {
      await prisma.activityEvent.create({
        data: {
          userId,
          pluginId: 'spotify',
          day,
          timestamp,
          type: 'track_play',
          title: play.track.name,
          subtitle: artists,
          value: play.track.durationMs,
          metadata: {
            trackId: play.track.id,
            trackUri: play.track.uri,
            albumName: play.track.album.name,
            albumImageUrl: albumImage,
            durationMs: play.track.durationMs,
          },
        },
      });
      newEvents++;
    }
  }

  return { newEvents, credentials: updatedCreds };
}
