// src/lib/spotify.ts
import type { PlaylistFilter, Track } from "@/types";

const BASE = "https://api.spotify.com/v1";

async function spotifyFetch(url: string, accessToken: string) {
  const res = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[spotify] error:", res.status, err);
    throw new Error(err.error?.message ?? "Spotify API error: " + res.status);
  }
  return res.json();
}

async function spotifyPost(url: string, body: any, accessToken: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[spotify] POST error", res.status, "body:", text);
    throw new Error("Spotify POST " + res.status + ": " + text);
  }
  try { return JSON.parse(text); } catch { return {}; }
}



// Tracks which songs we've already shown for each artist this session
// (resets on server restart — good enough for now)
const shownTracksByArtist = new Map<string, Set<string>>();
const offsetByArtist = new Map<string, number>();

function recordShownTrack(artistName: string, trackId: string) {
  const key = artistName.toLowerCase();
  if (!shownTracksByArtist.has(key)) shownTracksByArtist.set(key, new Set());
  shownTracksByArtist.get(key)!.add(trackId);
}

function hasBeenShown(artistName: string, trackId: string): boolean {
  return shownTracksByArtist.get(artistName.toLowerCase())?.has(trackId) ?? false;
}

function getNextOffset(artistName: string): number {
  const key = artistName.toLowerCase();
  const current = offsetByArtist.get(key) ?? 0;
  const next = (current + 10) % 50; // cycle through offset 0, 10, 20, 30, 40
  offsetByArtist.set(key, next);
  return current;
}

// In-memory cache for canonical artist names (resets on server restart)
const canonicalCache = new Map<string, string | null>();

// Look up a specific song by title + optional artist
async function findSpecificSong(
  title: string,
  artist: string,
  accessToken: string
): Promise<any | null> {
  try {
    const query = artist
      ? 'track:"' + title + '" artist:"' + artist + '"'
      : 'track:"' + title + '"';
    const data = await spotifyFetch(
      BASE + "/search?q=" + encodeURIComponent(query) + "&type=track&limit=5&market=US",
      accessToken
    );
    const items = data.tracks?.items ?? [];
    if (!items.length) {
      // Fallback: looser search
      const looseData = await spotifyFetch(
        BASE + "/search?q=" + encodeURIComponent(title + " " + artist) + "&type=track&limit=3&market=US",
        accessToken
      );
      return looseData.tracks?.items?.[0] ?? null;
    }
    return items[0];
  } catch (err) {
    console.error("[spotify] song search failed:", title, artist, err);
    return null;
  }
}

function popularityRange(pop: PlaylistFilter["popularity"]): [number, number] {
  if (pop === "lower") return [0, 50];
  if (pop === "higher") return [60, 100];
  return [25, 85];
}

function buildSearchQueries(filter: PlaylistFilter): string[] {
  const queries: string[] = [];
  const moodMap: Record<string, string[]> = {
    dreamy: ["dream pop", "shoegaze"],
    dark: ["dark ambient", "post punk"],
    warm: ["indie folk", "bedroom pop"],
    melancholic: ["sad indie", "slowcore"],
    chill: ["lo-fi", "chillwave"],
    intense: ["post rock", "noise rock"],
  };
  if (filter.mood && moodMap[filter.mood]) queries.push(...moodMap[filter.mood]);
  if (filter.genre_bias?.length) queries.push(...filter.genre_bias.slice(0, 3));
  if (queries.length === 0) queries.push("indie", "alternative");
  return [...new Set(queries)].slice(0, 4);
}

// First do fuzzy lookup to find canonical spotify artist name
async function findCanonicalArtist(artistName: string, accessToken: string): Promise<string | null> {
  const cacheKey = artistName.toLowerCase();
  if (canonicalCache.has(cacheKey)) {
    return canonicalCache.get(cacheKey) ?? null;
  }
  try {
    const data = await spotifyFetch(
      BASE + "/search?q=" + encodeURIComponent(artistName) + "&type=artist&limit=3&market=US",
      accessToken
    );
    const items = data.artists?.items ?? [];
    if (!items.length) return null;
    // Take the most popular match
    const best = items.sort((a: any, b: any) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
    if (best.name.toLowerCase() !== artistName.toLowerCase()) {
      console.log("[spotify] resolved", JSON.stringify(artistName), "->", JSON.stringify(best.name));
    }
    canonicalCache.set(cacheKey, best.name);
    return best.name;
  } catch {
    canonicalCache.set(cacheKey, null);
    return null;
  }
}

// Search for tracks BY a specific artist (resolves canonical name first)
async function getArtistTracks(artistName: string, accessToken: string): Promise<any[]> {
  try {
    // Resolve to canonical name (handles "Tyler The Creator" -> "Tyler, The Creator")
    const canonical = await findCanonicalArtist(artistName, accessToken);
    if (!canonical) {
      console.log("[spotify] no artist found for:", artistName);
      return [];
    }
    const query = 'artist:"' + canonical + '"';
    const data = await spotifyFetch(
      BASE + "/search?q=" + encodeURIComponent(query) + "&type=track&limit=10&market=US",
      accessToken
    );
    const items = data.tracks?.items ?? [];
    const filtered = items.filter((t: any) =>
      t.artists?.some((a: any) => a.name?.toLowerCase() === canonical.toLowerCase())
    );
    console.log("[spotify] got", filtered.length, "tracks for", canonical);
    return filtered;
  } catch (err) {
    console.error("[spotify] artist tracks failed:", artistName, err);
    return [];
  }
}

// Extract collaborator names from a list of tracks (excluding the seed artist itself)
function extractCollaborators(tracks: any[], excludeArtistsLower: string[]): string[] {
  const collaborators = new Set<string>();
  for (const t of tracks) {
    for (const a of t.artists ?? []) {
      const name = a.name;
      if (!name) continue;
      if (!excludeArtistsLower.includes(name.toLowerCase())) {
        collaborators.add(name);
      }
    }
  }
  return [...collaborators];
}

// LAYER 1: tracks BY seed artists
// LAYER 2: collaborators on those tracks (people who appeared on seed artist tracks)
// LAYER 3: collaborators on layer 2 artists' tracks
async function buildArtistGraph(
  seedArtists: string[],
  accessToken: string
): Promise<{ layer1: any[]; layer2: any[]; layer3: any[] }> {
  console.log("[graph] starting with seeds:", seedArtists);
  const seedsLower = seedArtists.map((a) => a.toLowerCase());

  // LAYER 1: direct seed artist tracks
  const layer1Arrays = await Promise.all(
    seedArtists.slice(0, 5).map((name) => getArtistTracks(name, accessToken))
  );
  // Interleave so each seed artist gets fair share
  const layer1: any[] = [];
  const maxLen1 = Math.max(...layer1Arrays.map((a) => a.length), 0);
  for (let i = 0; i < maxLen1; i++) {
    for (const arr of layer1Arrays) {
      if (arr[i]) layer1.push(arr[i]);
    }
  }
  console.log("[graph] layer 1 (direct seed tracks):", layer1.length);

  // Extract layer 2 artists from layer 1 tracks (collaborators on seed tracks)
  const layer2Artists = extractCollaborators(layer1, seedsLower);
  console.log("[graph] layer 2 artists found:", layer2Artists.length, "->", layer2Artists.slice(0, 8));

  // LAYER 2: tracks by collaborators (limit to avoid blowing up api calls)
  const layer2Arrays = await Promise.all(
    layer2Artists.slice(0, 6).map((name) => getArtistTracks(name, accessToken))
  );
  const layer2: any[] = [];
  const maxLen2 = Math.max(...layer2Arrays.map((a) => a.length), 0);
  for (let i = 0; i < Math.min(maxLen2, 3); i++) {
    for (const arr of layer2Arrays) {
      if (arr[i]) layer2.push(arr[i]);
    }
  }
  console.log("[graph] layer 2 (collaborator tracks):", layer2.length);

  // Extract layer 3 artists (collaborators of collaborators)
  const allKnownLower = new Set([...seedsLower, ...layer2Artists.map((a) => a.toLowerCase())]);
  const layer3Artists = extractCollaborators(layer2, [...allKnownLower]);
  console.log("[graph] layer 3 artists found:", layer3Artists.length, "->", layer3Artists.slice(0, 8));

  // LAYER 3: tracks by 2nd-degree collaborators (smaller batch)
  const layer3Arrays = await Promise.all(
    layer3Artists.slice(0, 6).map((name) => getArtistTracks(name, accessToken))
  );
  const layer3: any[] = [];
  const maxLen3 = Math.max(...layer3Arrays.map((a) => a.length), 0);
  for (let i = 0; i < Math.min(maxLen3, 2); i++) {
    for (const arr of layer3Arrays) {
      if (arr[i]) layer3.push(arr[i]);
    }
  }
  console.log("[graph] layer 3 (2nd-degree tracks):", layer3.length);

  return { layer1, layer2, layer3 };
}

export async function generatePlaylist(
  filter: PlaylistFilter,
  accessToken: string,
  count = 20
): Promise<Track[]> {
  // Allow filter to override count
  const targetCount = (filter as any).targetCount ?? count;
  count = Math.min(Math.max(targetCount, 5), 100);
  console.log("[generate] filter:", JSON.stringify(filter, null, 2));

  const tracks: Track[] = [];
  const seen = new Set<string>();
  const [minPop, maxPop] = popularityRange(filter.popularity);

  let layer1: any[] = [];
  let layer2: any[] = [];
  let layer3: any[] = [];

  // FIRST: handle specific song requests (highest priority)
  const specificSongs: any[] = [];
  if ((filter as any).song_requests?.length) {
    const songResults = await Promise.all(
      (filter as any).song_requests.slice(0, 10).map((req: any) =>
        findSpecificSong(req.title, req.artist, accessToken)
      )
    );
    for (const song of songResults) {
      if (song) specificSongs.push(song);
    }
    console.log("[generate] resolved", specificSongs.length, "specific songs");
  }

  // Build artist graph if seeds exist
  if (filter.artist_seeds?.length) {
    const graph = await buildArtistGraph(filter.artist_seeds, accessToken);
    layer1 = graph.layer1;
    layer2 = graph.layer2;
    layer3 = graph.layer3;
  }

  // Fallback: if graph is too sparse, also pull gpt's related_artists
  const totalGraphTracks = layer1.length + layer2.length + layer3.length;
  // Force backfill when user explicitly added genres
  const hasExplicitGenres = (filter.genre_bias?.length ?? 0) > 0;
  let relatedFallback: any[] = [];
  if (filter.artist_seeds?.length && totalGraphTracks < count && filter.related_artists?.length) {
    console.log("[generate] graph too sparse, falling back to gpt related_artists");
    const fallbackArrays = await Promise.all(
      filter.related_artists.slice(0, 4).map((name) => getArtistTracks(name, accessToken))
    );
    relatedFallback = fallbackArrays.flat();
  }

  // Genre backfill if no seeds, under count, OR user explicitly named genres
  let genreCandidates: any[] = [];
  const needGenreBackfill = !filter.artist_seeds?.length ||
    totalGraphTracks + relatedFallback.length < count ||
    hasExplicitGenres;

  if (needGenreBackfill) {
    const queries = buildSearchQueries(filter);
    console.log("[generate] genre backfill queries:", queries);
    const searchResults = await Promise.allSettled(
      queries.map((q) =>
        spotifyFetch(BASE + "/search?q=" + encodeURIComponent(q) + "&type=track&limit=10&market=US", accessToken)
      )
    );
    for (const result of searchResults) {
      if (result.status === "fulfilled") {
        genreCandidates.push(...(result.value.tracks?.items ?? []));
      }
    }
  }

  const excludedArtistsLower = (filter.exclude_artists ?? []).map((a) => a.toLowerCase());
  const excludeTermsLower = (filter.exclude ?? []).map((e) => e.toLowerCase());
  const seedArtistsLower = (filter.artist_seeds ?? []).map((a) => a.toLowerCase());

  const tryAddTrack = (item: any, ignorePopularity = false) => {
    if (!item || !item.id || seen.has(item.id)) return false;
    if (tracks.length >= count) return false;
    const pop = item.popularity ?? 50;
    if (!ignorePopularity && (pop < minPop || pop > maxPop)) return false;
    const artistName = (item.artists?.[0]?.name ?? "").toLowerCase();
    const trackName = (item.name ?? "").toLowerCase();
    if (excludedArtistsLower.some((a) => artistName.includes(a))) return false;
    if (excludeTermsLower.some((t) => trackName.includes(t) || artistName.includes(t))) return false;
    seen.add(item.id);
    tracks.push(spotifyTrackToTrack(item, filter, seedArtistsLower));
    return true;
  };

  // Slot allocation:
  // ~50% layer 1 (direct seed tracks)
  // ~30% layer 2 (collaborators)
  // ~15% layer 3 (2nd degree)
  // ~5% fallback / genre
  // PRIORITY 0: specific song requests always go in
  for (const item of specificSongs) {
    tryAddTrack(item, true);
  }

  if (filter.artist_seeds?.length) {
    const layer1Cap = Math.ceil(count * 0.5);
    const layer2Cap = Math.ceil(count * 0.3);
    const layer3Cap = Math.ceil(count * 0.15);

    let l1 = 0;
    for (const item of layer1) {
      if (l1 >= layer1Cap) break;
      if (tryAddTrack(item, true)) l1++;
    }

    // Shuffle layer 2 for variety across refinements
    for (let i = layer2.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [layer2[i], layer2[j]] = [layer2[j], layer2[i]];
    }
    let l2 = 0;
    for (const item of layer2) {
      if (l2 >= layer2Cap) break;
      if (tryAddTrack(item, true)) l2++;
    }

    for (let i = layer3.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [layer3[i], layer3[j]] = [layer3[j], layer3[i]];
    }
    let l3 = 0;
    for (const item of layer3) {
      if (l3 >= layer3Cap) break;
      if (tryAddTrack(item, true)) l3++;
    }

    console.log("[generate] filled from graph - L1:", l1, "L2:", l2, "L3:", l3);
  }

  // Fill remaining with relatedFallback if any
  for (const item of relatedFallback) {
    tryAddTrack(item, true);
  }

  // Final fill with genre candidates
  for (let i = genreCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [genreCandidates[i], genreCandidates[j]] = [genreCandidates[j], genreCandidates[i]];
  }
  for (const item of genreCandidates) {
    tryAddTrack(item);
  }

  // Last resort: ignore popularity on everything
  if (tracks.length < count) {
    for (const item of [...layer1, ...layer2, ...layer3, ...relatedFallback, ...genreCandidates]) {
      tryAddTrack(item, true);
    }
  }

  console.log("[generate] returning", tracks.length, "tracks total");
  return tracks.slice(0, count);
}

function spotifyTrackToTrack(item: any, filter: PlaylistFilter, seedArtistsLower: string[]): Track {
  return {
    id: item.id,
    title: item.name,
    artist: item.artists?.map((a: any) => a.name).join(", ") ?? "Unknown",
    album: item.album?.name ?? "",
    albumArt: item.album?.images?.[0]?.url ?? "",
    spotifyUri: item.uri,
    previewUrl: item.preview_url,
    reason: buildReason(item, filter, seedArtistsLower),
  };
}

function buildReason(item: any, filter: PlaylistFilter, seedArtistsLower: string[]): string {
  const pop = item.popularity ?? 50;
  const parts: string[] = [];
  const artistName = item.artists?.[0]?.name ?? "";

  const isSeed = seedArtistsLower.some((a) =>
    item.artists?.some((art: any) => art.name?.toLowerCase() === a)
  );
  const featuresSeed = !isSeed && seedArtistsLower.some((a) =>
    item.artists?.some((art: any) => art.name?.toLowerCase() === a)
  );

  if (isSeed) {
    parts.push("by " + artistName);
  } else if (filter.artist_seeds?.length) {
    parts.push("collab network of " + filter.artist_seeds[0]);
  } else if (filter.mood) {
    parts.push("fits the " + filter.mood + " mood");
  }

  if (pop < 45) parts.push("underground find");
  else if (pop > 70) parts.push("crowd favorite");

  return parts.length ? parts.join(" · ") : "matches your vibe";
}

export async function savePlaylistToSpotify(
  tracks: Track[],
  playlistName: string,
  accessToken: string
): Promise<string> {
  console.log("[save] starting save with", tracks.length, "tracks");
  const user = await spotifyFetch(BASE + "/me", accessToken);
  console.log("[save] got user:", user.id);
  if (!user.id) throw new Error("Could not get Spotify user ID");

  // Create playlist (this endpoint still works in 2026 dev mode)
  const playlist = await spotifyPost(
    BASE + "/me/playlists",
    { name: playlistName || "Playlist Chat Export", description: "Generated by Playlist Chat", public: false },
    accessToken
  );
  console.log("[save] created playlist:", playlist.id);
  if (!playlist.id) throw new Error("Spotify did not return a playlist ID — your app may need extended quota mode");

  // Add tracks using the NEW /items endpoint (Feb 2026 migration)
  const uris = tracks.map((t) => t.spotifyUri).filter(Boolean);
  console.log("[save] adding", uris.length, "tracks via /items endpoint");
  for (let i = 0; i < uris.length; i += 100) {
    await spotifyPost(
      BASE + "/playlists/" + playlist.id + "/items",
      { uris: uris.slice(i, i + 100) },
      accessToken
    );
  }
  console.log("[save] done");
  return "https://open.spotify.com/playlist/" + playlist.id;
}


export async function findSpecificSongDirect(
  title: string,
  artist: string,
  accessToken: string
): Promise<Track | null> {
  try {
    const query = artist
      ? 'track:"' + title + '" artist:"' + artist + '"'
      : 'track:"' + title + '"';
    let data = await spotifyFetch(
      BASE + "/search?q=" + encodeURIComponent(query) + "&type=track&limit=5&market=US",
      accessToken
    );
    let item = data.tracks?.items?.[0];
    if (!item) {
      // Looser fallback
      data = await spotifyFetch(
        BASE + "/search?q=" + encodeURIComponent(title + " " + artist) + "&type=track&limit=3&market=US",
        accessToken
      );
      item = data.tracks?.items?.[0];
    }
    if (!item) return null;
    return {
      id: item.id,
      title: item.name,
      artist: item.artists?.map((a: any) => a.name).join(", ") ?? "Unknown",
      album: item.album?.name ?? "",
      albumArt: item.album?.images?.[0]?.url ?? "",
      spotifyUri: item.uri,
      previewUrl: item.preview_url,
      reason: "you asked for it",
    };
  } catch (err) {
    console.error("[spotify] specific song direct failed:", title, artist, err);
    return null;
  }
}
