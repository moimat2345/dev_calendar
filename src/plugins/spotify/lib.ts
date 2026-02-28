import { prisma } from '@/lib/prisma';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

interface SpotifyTokens {
  [key: string]: string | number;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp ms
}

interface SpotifyContext {
  type: string; // 'playlist' | 'album' | 'artist'
  uri: string;
  name: string; // resolved via separate API call
}

interface SpotifyTrackPlay {
  playedAt: string;
  context: SpotifyContext | null;
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
    context: item.context
      ? { type: item.context.type, uri: item.context.uri, name: '' }
      : null,
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

function parseSpotifyUri(uri: string): { type: string; id: string } | null {
  // spotify:playlist:xxx or spotify:album:xxx or spotify:artist:xxx
  const parts = uri.split(':');
  if (parts.length >= 3) {
    return { type: parts[1], id: parts[2] };
  }
  return null;
}

async function resolveContextNames(
  accessToken: string,
  tracks: SpotifyTrackPlay[]
): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  const uniqueUris = new Set<string>();

  for (const t of tracks) {
    if (t.context?.uri) uniqueUris.add(t.context.uri);
  }

  const fetches = Array.from(uniqueUris).map(async (uri) => {
    const parsed = parseSpotifyUri(uri);
    if (!parsed) return;

    let endpoint = '';
    if (parsed.type === 'playlist' || parsed.type === 'playlist_v2') {
      endpoint = `${SPOTIFY_API_BASE}/playlists/${parsed.id}?fields=name`;
    } else if (parsed.type === 'album') {
      endpoint = `${SPOTIFY_API_BASE}/albums/${parsed.id}?fields=name`;
    } else if (parsed.type === 'artist') {
      endpoint = `${SPOTIFY_API_BASE}/artists/${parsed.id}?fields=name`;
    } else {
      return;
    }

    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        nameMap.set(uri, data.name || uri);
      }
    } catch {
      // Ignore failed lookups — name stays empty
    }
  });

  await Promise.all(fetches);
  return nameMap;
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

  // Resolve context names (playlist/album/artist) in parallel
  const contextNames = await resolveContextNames(accessToken, tracks);

  let newEvents = 0;

  for (const play of tracks) {
    const timestamp = new Date(play.playedAt);
    const day = timestamp.toISOString().split('T')[0];
    const artists = play.track.artists.map((a) => a.name).join(', ');
    const albumImage = play.track.album.images.find((i) => i.width <= 300)?.url
      || play.track.album.images[0]?.url
      || null;

    // Resolve context name
    const contextName = play.context?.uri
      ? contextNames.get(play.context.uri) || null
      : null;
    const contextType = play.context?.type?.replace('_v2', '') || null;

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
            contextType,
            contextName,
            contextUri: play.context?.uri || null,
          },
        },
      });
      newEvents++;
    }
  }

  return { newEvents, credentials: updatedCreds };
}
