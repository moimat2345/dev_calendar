import { prisma } from '@/lib/prisma';
import { getLocalDay } from '@/lib/utils';

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

interface ContextInfo {
  name: string;
  imageUrl: string | null;
}

export async function resolveContextsByUris(
  accessToken: string,
  uris: string[]
): Promise<Map<string, ContextInfo>> {
  const infoMap = new Map<string, ContextInfo>();
  const uniqueUris = new Set(uris);

  const fetches = Array.from(uniqueUris).map(async (uri) => {
    const parsed = parseSpotifyUri(uri);
    if (!parsed) return;

    let endpoint = '';
    if (parsed.type === 'playlist' || parsed.type === 'playlist_v2') {
      endpoint = `${SPOTIFY_API_BASE}/playlists/${parsed.id}?fields=name,images`;
    } else if (parsed.type === 'album') {
      endpoint = `${SPOTIFY_API_BASE}/albums/${parsed.id}`;
    } else if (parsed.type === 'artist') {
      endpoint = `${SPOTIFY_API_BASE}/artists/${parsed.id}`;
    } else {
      return;
    }

    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const images = data.images || [];
        const imageUrl = images.find((i: any) => i.width && i.width <= 300)?.url
          || images[0]?.url
          || null;
        infoMap.set(uri, { name: data.name || uri, imageUrl });
      }
    } catch {
      // Ignore failed lookups
    }
  });

  await Promise.all(fetches);
  return infoMap;
}

export async function checkSavedTracks(
  accessToken: string,
  trackIds: string[]
): Promise<Set<string>> {
  const saved = new Set<string>();
  if (trackIds.length === 0) return saved;

  // API accepts max 50 IDs per call
  for (let i = 0; i < trackIds.length; i += 50) {
    const batch = trackIds.slice(i, i + 50);
    const res = await fetch(
      `${SPOTIFY_API_BASE}/me/tracks/contains?ids=${batch.join(',')}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.ok) {
      const results: boolean[] = await res.json();
      batch.forEach((id, idx) => {
        if (results[idx]) saved.add(id);
      });
    }
  }

  return saved;
}

export async function syncSpotifyForUser(
  userId: string,
  credentials: Record<string, any>,
  lastSynced: Date | null,
  timezone: string = 'UTC'
): Promise<{ newEvents: number; credentials: SpotifyTokens }> {
  const { accessToken, credentials: updatedCreds } =
    await getValidAccessToken(credentials);

  // Fetch tracks played since last sync (or last 50 if first sync)
  const after = lastSynced ? lastSynced.getTime() : undefined;
  const tracks = await fetchRecentlyPlayed(accessToken, after);

  // Resolve context info (name + image) in parallel
  const contextUris = tracks
    .map(t => t.context?.uri)
    .filter((uri): uri is string => !!uri);
  const contextInfoMap = await resolveContextsByUris(accessToken, contextUris);

  // Check which context-less tracks are in Liked Songs
  const noContextTrackIds = tracks
    .filter(t => !t.context)
    .map(t => t.track.id);
  const savedTrackIds = await checkSavedTracks(accessToken, noContextTrackIds);

  let newEvents = 0;

  for (const play of tracks) {
    const timestamp = new Date(play.playedAt);
    const day = getLocalDay(timestamp, timezone);
    const artists = play.track.artists.map((a) => a.name).join(', ');
    const albumImage = play.track.album.images.find((i) => i.width <= 300)?.url
      || play.track.album.images[0]?.url
      || null;

    // Resolve context info
    let contextType: string | null = null;
    let contextName: string | null = null;
    let contextImageUrl: string | null = null;

    if (play.context?.uri) {
      const contextInfo = contextInfoMap.get(play.context.uri) || null;
      contextName = contextInfo?.name || null;
      contextImageUrl = contextInfo?.imageUrl || null;
      contextType = play.context.type?.replace('_v2', '') || null;
    } else if (savedTrackIds.has(play.track.id)) {
      // No context but track is in Liked Songs
      contextType = 'collection';
      contextName = 'Titres likés';
    }

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
            contextImageUrl,
            contextUri: play.context?.uri || null,
          },
        },
      });
      newEvents++;
    }
  }

  return { newEvents, credentials: updatedCreds };
}

export async function recheckAllSpotifyContexts(
  userId: string
): Promise<{ updated: number }> {
  // Get Spotify connection + valid access token
  const connection = await prisma.pluginConnection.findUnique({
    where: { userId_pluginId: { userId, pluginId: 'spotify' } },
  });
  if (!connection?.enabled || !connection.credentials) {
    throw new Error('Spotify not connected');
  }

  const { accessToken, credentials: updatedCreds } =
    await getValidAccessToken(connection.credentials as Record<string, any>);

  // Save refreshed credentials
  await prisma.pluginConnection.update({
    where: { id: connection.id },
    data: { credentials: updatedCreds },
  });

  // Fetch all Spotify events for this user
  const events = await prisma.activityEvent.findMany({
    where: { userId, pluginId: 'spotify' },
  });

  let updated = 0;

  // 1. Fix liked songs: check tracks with no contextType
  const noContextEvents = events.filter(
    e => !(e.metadata as any)?.contextType
  );
  const noContextTrackIds = noContextEvents
    .map(e => (e.metadata as any)?.trackId as string)
    .filter(Boolean);

  const savedIds = await checkSavedTracks(accessToken, noContextTrackIds);

  for (const event of noContextEvents) {
    const trackId = (event.metadata as any)?.trackId;
    if (trackId && savedIds.has(trackId)) {
      await prisma.activityEvent.update({
        where: { id: event.id },
        data: {
          metadata: {
            ...(event.metadata as any),
            contextType: 'collection',
            contextName: 'Titres likés',
          },
        },
      });
      updated++;
    }
  }

  // 2. Fix missing context names/images for tracks that have a URI
  const missingContextEvents = events.filter(e => {
    const m = e.metadata as any;
    return m?.contextUri && !m?.contextName;
  });

  const urisToResolve = [
    ...new Set(missingContextEvents.map(e => (e.metadata as any).contextUri as string)),
  ];

  if (urisToResolve.length > 0) {
    const contextInfoMap = await resolveContextsByUris(accessToken, urisToResolve);

    for (const event of missingContextEvents) {
      const uri = (event.metadata as any).contextUri;
      const info = contextInfoMap.get(uri);
      if (info) {
        await prisma.activityEvent.update({
          where: { id: event.id },
          data: {
            metadata: {
              ...(event.metadata as any),
              contextName: info.name,
              contextImageUrl: info.imageUrl,
            },
          },
        });
        updated++;
      }
    }
  }

  return { updated };
}
