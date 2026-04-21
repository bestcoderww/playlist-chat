// src/lib/authOptions.ts
import type { AuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-top-read",
  "user-read-recently-played",
].join(" ");

async function refreshAccessToken(token: any) {
  try {
    const url = "https://accounts.spotify.com/api/token";
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const refreshed = await res.json();
    if (!res.ok) throw refreshed;
    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: { params: { scope: SPOTIFY_SCOPES } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: (account.expires_at ?? 0) * 1000,
        };
      }
      if (Date.now() < (token.accessTokenExpires as number)) return token;
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
  pages: { signIn: "/" },
};
