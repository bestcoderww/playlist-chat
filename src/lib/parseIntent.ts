import type { PlaylistFilter } from "@/types";

const SYSTEM_PROMPT = `You are a music understanding model. Your job is to interpret natural conversational language about music and convert it into a structured filter.

You are NOT a keyword matcher. You understand intent. The user might say things like:
- "add a little bit of mabu but keep kendrick and his friends" -> add Lil Mabu to artist_seeds, KEEP existing kendrick + related artists
- "swap kendrick for tyler" -> remove Kendrick from seeds, add Tyler The Creator
- "make this feel more like driving home at 4am" -> mood: melancholic, energy: low, genre_bias: ambient/indie
- "throw in some old stuff" -> era: "2000s" or earlier
- "less depressing" -> energy: medium-high, mood: euphoric
- "i want to feel like im in a coming of age movie" -> genre_bias: indie pop, dream pop, mood: dreamy
- "more songs like cudi's day n nite" -> artist_seeds: ["Kid Cudi"], related_artists: similar artists
- "ok but darker" -> shift mood darker, possibly lower energy
- "this is too white" -> shift genre_bias toward hip hop, r&b, soul
- "add some heat" -> energy: high, mood: euphoric/intense

Song request handling:
- "add HUMBLE by kendrick" -> song_requests: [{title: "HUMBLE.", artist: "Kendrick Lamar"}]
- "put no role modelz on there" -> song_requests: [{title: "No Role Modelz", artist: "J. Cole"}]
- "throw in midnight city" -> song_requests: [{title: "Midnight City", artist: "M83"}]
- If you know the artist, include it. If unsure, leave artist as empty string.

CONTRADICTION RULE — VERY IMPORTANT:
If the user excludes a genre (like "less rap") and there are existing artist_seeds that belong to that genre, MOVE those seeds to exclude_artists. Example: artist_seeds: ["Kendrick Lamar"] + user says "less rap" -> remove Kendrick from artist_seeds, add him to exclude_artists. Same applies to "less hip-hop", "no rap", "less indie", etc. You know which genre each major artist belongs to — apply that knowledge.

CRITICAL RULES:
1. ALWAYS interpret natural language. Don't require specific keywords.
2. Recognize artist names ANYWHERE in the input, even with typos and partial names ("kendrick" = "Kendrick Lamar", "lil mabu" = "Lil Mabu", "phoebe bridges" = "Phoebe Bridgers").
3. When the user says "keep" / "with" / "and" with existing artists, PRESERVE those in artist_seeds.
4. When the user says "swap" / "replace" / "instead of" / "less" / "no more", REMOVE from artist_seeds and add to exclude_artists.
5. When you put an artist in artist_seeds, ALWAYS populate related_artists with 4-6 musically similar artists.
6. Always merge with the existing filter. Don't reset fields the user didn't mention.
7. The "mood" field should be a single descriptive word that captures the feel.
8. If the user is being abstract ("4am vibes", "movie soundtrack"), interpret it intelligently.

ALSO populate "responseMessage" with a short (under 15 words) conversational message that acknowledges what changed. Sound like a friend, not a robot. Examples:
- "got it — adding mabu, keeping the kendrick crew intact"
- "ok, going darker and slower now"
- "swapped kendrick out for tyler — different energy entirely"
- "throwing some old school in the mix"
- "leaning more underground, less radio"`;

const FILTER_SCHEMA = {
  type: "object",
  properties: {
    mood: { type: "string" },
    energy: { type: "string", enum: ["low", "medium-low", "medium", "medium-high", "high"] },
    popularity: { type: "string", enum: ["lower", "mixed", "higher"] },
    vocals: { type: "string", enum: ["female-preferred", "male-preferred", "any", "instrumental-ok"] },
    genre_bias: { type: "array", items: { type: "string" } },
    exclude: { type: "array", items: { type: "string" } },
    artist_seeds: {
      type: "array",
      items: { type: "string" },
      description: "Exact artist names mentioned by user. Preserve previous seeds unless user explicitly removes them.",
    },
    song_requests: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          artist: { type: "string", description: "Best guess of artist if mentioned, else empty string" },
        },
        required: ["title", "artist"],
        additionalProperties: false,
      },
      description: "Specific songs the user wants added. Examples: 'add HUMBLE by kendrick' -> [{title:'HUMBLE.', artist:'Kendrick Lamar'}], 'put no role modelz on there' -> [{title:'No Role Modelz', artist:'J. Cole'}]. Empty array if no specific songs mentioned.",
    },
    related_artists: {
      type: "array",
      items: { type: "string" },
      description: "4-6 artists similar to artist_seeds.",
    },
    exclude_artists: { type: "array", items: { type: "string" } },
    tempo_feel: { type: ["string", "null"], enum: ["slow", "mid", "fast", null] },
    era: { type: ["string", "null"] },
    rawInstruction: { type: "string" },
    responseMessage: {
      type: "string",
      description: "Short conversational acknowledgment of the change. Under 15 words.",
    },
  },
  required: [
    "mood", "energy", "popularity", "vocals",
    "genre_bias", "exclude", "artist_seeds", "song_requests", "related_artists",
    "exclude_artists", "tempo_feel", "era", "rawInstruction", "responseMessage",
  ],
  additionalProperties: false,
};

function fallbackFilter(userInput: string): PlaylistFilter {
  return {
    mood: "chill",
    energy: "medium",
    popularity: "mixed",
    vocals: "any",
    genre_bias: ["indie", "alternative"],
    exclude: [],
    artist_seeds: [],
    song_requests: [],
    related_artists: [],
    exclude_artists: [],
    rawInstruction: userInput,
    responseMessage: "got something for you",
  };
}

// Fast-path for common patterns — skips openai entirely
// Abstract mood adjectives (darker, warmer) get sent to openai because they need interpretation.
function tryFastPath(
  userInput: string,
  existingFilter?: Partial<PlaylistFilter>
): PlaylistFilter | null {
  const input = userInput.toLowerCase().trim();
  const base: PlaylistFilter = {
    mood: existingFilter?.mood ?? "chill",
    energy: existingFilter?.energy ?? "medium",
    popularity: existingFilter?.popularity ?? "mixed",
    vocals: existingFilter?.vocals ?? "any",
    genre_bias: existingFilter?.genre_bias ?? [],
    exclude: existingFilter?.exclude ?? [],
    artist_seeds: existingFilter?.artist_seeds ?? [],
    related_artists: existingFilter?.related_artists ?? [],
    exclude_artists: existingFilter?.exclude_artists ?? [],
    tempo_feel: existingFilter?.tempo_feel ?? null,
    era: existingFilter?.era ?? null,
    rawInstruction: userInput,
    responseMessage: "",
  };
  (base as any).song_requests = [];

  // Genre additions — these we can actually do via search
  const genreAdd = (genres: string[], msg: string): PlaylistFilter => ({
    ...base,
    genre_bias: [...new Set([...base.genre_bias, ...genres])],
    responseMessage: msg,
  });

  if (input === "more rap" || input === "add rap") return genreAdd(["rap", "hip-hop"], "pulling in more rap");
  if (input === "more shoegaze") return genreAdd(["shoegaze"], "adding shoegaze tracks");
  if (input === "more indie") return genreAdd(["indie", "indie rock"], "adding more indie");
  if (input === "more electronic") return genreAdd(["electronic", "edm"], "adding electronic");
  if (input === "more jazz") return genreAdd(["jazz"], "adding jazz");
  if (input === "more folk") return genreAdd(["indie folk", "folk"], "adding folk tracks");
  if (input === "more r&b" || input === "more rnb") return genreAdd(["r&b", "soul"], "adding r&b");
  if (input === "more pop") return genreAdd(["pop"], "adding pop");
  if (input === "more punk") return genreAdd(["punk", "post punk"], "adding punk");
  if (input === "more metal") return genreAdd(["metal"], "adding metal");
  if (input === "more lofi" || input === "more lo-fi") return genreAdd(["lo-fi", "chillhop"], "adding lo-fi");
  if (input === "more dream pop") return genreAdd(["dream pop"], "adding dream pop");

  // Genre exclusions
  const genreExclude = (genres: string[], msg: string): PlaylistFilter => ({
    ...base,
    exclude: [...new Set([...base.exclude, ...genres])],
    responseMessage: msg,
  });

  // NOTE: "less rap" / "no rap" now go to openai because they may need to remove seed artists too
  if (input === "less pop") return genreExclude(["pop"], "filtering out pop");
  if (input === "less rock") return genreExclude(["rock"], "filtering out rock");
  if (input === "less electronic") return genreExclude(["electronic", "edm"], "filtering out electronic");

  // Popularity (this we can actually control)
  if (input === "more underground" || input === "underground" || input === "more obscure") {
    return { ...base, popularity: "lower", responseMessage: "going more underground" };
  }
  if (input === "more mainstream" || input === "mainstream" || input === "more popular") {
    return { ...base, popularity: "higher", responseMessage: "leaning mainstream" };
  }

  // Vocals
  if (input === "more female vocals") return { ...base, vocals: "female-preferred", responseMessage: "prioritizing female vocals" };
  if (input === "more male vocals") return { ...base, vocals: "male-preferred", responseMessage: "prioritizing male vocals" };
  if (input === "instrumental" || input === "no vocals") return { ...base, vocals: "instrumental-ok", responseMessage: "going instrumental" };

  // Note: NOT fast-pathing "darker" / "warmer" / "more upbeat" anymore.
  // Those go to openai which will set genre_bias based on actual interpretation.
  return null;
}

export async function parseIntent(
  userInput: string,
  existingFilter?: Partial<PlaylistFilter>
): Promise<PlaylistFilter> {
  // Try fast-path first to avoid openai call
  const fastPath = tryFastPath(userInput, existingFilter);
  if (fastPath) {
    console.log("[parseIntent] fast-path hit:", userInput);
    return fastPath;
  }

  if (!process.env.OPENAI_API_KEY) {
    return fallbackFilter(userInput);
  }

  const context = existingFilter
    ? `Current filter (preserve unless user changes them):\n${JSON.stringify(existingFilter, null, 2)}\n\nUser said: "${userInput}"\n\nMerge thoughtfully. Keep what wasn't changed.`
    : `First request: "${userInput}"\n\nInterpret freely.`;

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: context },
      ],
      temperature: 0.4,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "playlist_filter",
          schema: FILTER_SCHEMA,
          strict: true,
        },
      },
    });

    const raw = res.choices[0].message.content ?? "{}";
    console.log("[parseIntent] openai returned:", raw);
    return JSON.parse(raw) as PlaylistFilter;
  } catch (err: any) {
    console.error("[parseIntent] error:", err.message ?? err);
    return fallbackFilter(userInput);
  }
}

// Now mostly unused — kept as a fallback if responseMessage isn't set
export function describeFilterChange(
  prev: Partial<PlaylistFilter>,
  next: PlaylistFilter
): string {
  if ((next as any).responseMessage) return (next as any).responseMessage;

  const changes: string[] = [];
  const newArtists = next.artist_seeds?.filter(
    (a) => !prev.artist_seeds?.some((p) => p.toLowerCase() === a.toLowerCase())
  );
  if (newArtists?.length) changes.push("pulling in " + newArtists.join(", "));

  const newExcludeArtists = next.exclude_artists?.filter(
    (a) => !prev.exclude_artists?.some((p) => p.toLowerCase() === a.toLowerCase())
  );
  if (newExcludeArtists?.length) changes.push("removing " + newExcludeArtists.join(", "));

  if (prev.mood !== next.mood && next.mood) changes.push("mood -> " + next.mood);
  if (prev.energy !== next.energy && next.energy) changes.push("energy " + next.energy);

  return changes.length ? changes.join(" · ") : "refined";
}
