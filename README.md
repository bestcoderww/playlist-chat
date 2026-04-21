# Playlist Chat

A conversational playlist editor for Spotify. Describe a vibe, get a 20-song playlist, then refine it through chat — "more kendrick", "less rap", "add HUMBLE", "more shoegaze".

Built as an exploration of what's possible with the Spotify Web API after their February 2026 dev mode restrictions, plus what GPT-4o-mini can do as a natural language → structured filter parser.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **NextAuth.js** for Spotify OAuth (with token refresh)
- **OpenAI GPT-4o-mini** with structured outputs for parsing user intent
- **Spotify Web API** for search, artist data, and playlist creation
- **Zustand** for state management
- **Supabase** (optional) for persisting onboarding preferences

## Features

- Spotify OAuth login with proper scope handling
- 5-question onboarding flow to set initial taste profile
- Describe-a-vibe playlist generation ("late night drive", "rainy sunday morning")
- Conversational refinement that understands natural language:
  - Artist additions: "add kendrick lamar", "more tyler the creator"
  - Specific song requests: "add HUMBLE by kendrick"
  - Genre additions/exclusions: "more shoegaze", "less rap"
  - Popularity shifts: "more underground", "more mainstream"
  - Vocal preferences: "more female vocals", "instrumental"
- 3-layer artist collaboration graph (seeds → collaborators → 2nd-degree)
- Pin tracks to keep them through refinements
- Save final playlist to your Spotify library
- Mock data fallback so UI works without API keys
- Dark UI with green accent, mobile responsive

## Architecture Notes

The app uses a hybrid approach to playlist generation since Spotify removed key endpoints in February 2026:

1. **Intent parsing**: User input → GPT-4o-mini → structured filter object (artist seeds, related artists, genre bias, exclusions, popularity, etc.)
2. **Artist graph traversal**: For each seed artist, fetch direct tracks via search, then their collaborators (extracted from track metadata), then 2nd-degree collaborators
3. **Genre backfill**: Fill remaining slots with genre-based search
4. **Filtering**: Apply popularity range, exclusions, and dedup against pinned tracks

A fast-path matcher handles common refinement patterns ("more underground", "less rap") without an OpenAI call to keep things snappy.

## Known Limitations

This app was built during/after Spotify's February 2026 API restructure, which severely limited what dev mode apps can do:

- **No audio features**: Spotify gated the `/audio-features` endpoint, so we can't filter by danceability, energy, valence, etc. This means abstract requests like "darker" or "more upbeat" can't really be honored — they require actual audio data we don't have access to.
- **Search limited to 10 results**: Each search call returns max 10 tracks. We work around this with parallel queries on different terms, but per-artist track diversity is limited.
- **No `/recommendations` endpoint**: Killed for new dev apps. We use search + artist collaboration graph traversal as a substitute.
- **No `/related-artists` endpoint**: Killed for new dev apps. We use GPT to suggest related artists, then verify they exist via search.
- **Rate limiting**: Dev mode caps you at ~30 requests per 30 seconds. Heavy refinement chains can hit this.
- **Dev mode user cap**: Only Spotify accounts you explicitly add to your app's user management can log in.

To remove these limitations, you'd need [Extended Quota Mode](https://developer.spotify.com/documentation/web-api/concepts/quota-modes), which Spotify now restricts to registered businesses with active user bases. Solo developers can't apply.

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd playlist-chat
npm install
```

### 2. Environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Fill in:

- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` — from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://127.0.0.1:3000` for local dev
- `OPENAI_API_KEY` — from [OpenAI Platform](https://platform.openai.com/api-keys)
- Supabase keys are optional; the app falls through gracefully without them

### 3. Spotify app setup

In your Spotify app dashboard:
- **Redirect URI**: `http://127.0.0.1:3000/api/auth/callback/spotify`
- Enable Web API
- Add your Spotify account email under User Management (required for login in dev mode)
- Required scopes (auto-requested): `user-read-email`, `user-read-private`, `playlist-modify-public`, `playlist-modify-private`, `user-top-read`, `user-read-recently-played`

### 4. Run

```bash
npm run dev
```

Open `http://127.0.0.1:3000`. **Use 127.0.0.1, not localhost** — your Spotify redirect URI must match exactly.

### 5. (Optional) Supabase

For persisting onboarding preferences across sessions, create a Supabase project and run `supabase/schema.sql` in the SQL editor. Add the Supabase env vars to `.env.local`.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # Spotify OAuth
│   │   ├── playlist/              # Initial generation
│   │   ├── refine/                # Conversational refinement
│   │   ├── save-to-spotify/       # Export
│   │   └── onboarding/            # Save user prefs
│   ├── builder/page.tsx           # Main split-panel app
│   ├── onboarding/page.tsx        # 5-question flow
│   └── page.tsx                   # Landing page
├── components/ui/                 # TrackCard, ChatPanel, PlaylistPanel, Spinner
├── hooks/usePlaylist.ts           # Generate/refine/save logic
├── lib/
│   ├── authOptions.ts             # NextAuth config
│   ├── parseIntent.ts             # OpenAI intent parser + fast-path
│   ├── spotify.ts                 # Search, graph traversal, save
│   ├── store.ts                   # Zustand store
│   ├── supabase.ts                # Optional persistence
│   └── mockData.ts                # Fallback for UI dev
└── types/                         # Type definitions
```

## Development Notes

- This app was built primarily with Claude (Anthropic) as a learning exercise in shipping a real Next.js app with multiple third-party APIs. Most of the debugging time went into discovering and working around Spotify's February 2026 dev mode restrictions, which weren't well-documented when this was built.
- The fast-path parser saves ~1.5s per refinement on common patterns by avoiding the OpenAI call entirely. The structured outputs mode (`json_schema` with `strict: true`) is what makes the GPT-based parsing reliable.
- The artist collaboration graph approach (seeds → collaborators → 2nd-degree) was chosen as a substitute for the killed `/recommendations` endpoint. It works reasonably well for popular artists with lots of features but degrades for niche artists with few collaborations.

## License

MIT
