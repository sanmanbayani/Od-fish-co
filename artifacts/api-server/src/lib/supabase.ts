/**
 * Supabase Admin client for server-side token verification.
 *
 * The mobile app signs the user in via Supabase Auth (Google OAuth) and
 * receives an access token. This module verifies that token and extracts the
 * user's profile so the API can upsert a local `customers` row.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_AUTH_ENABLED,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "./env";

let adminClient: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (!adminClient) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}

export interface SupabaseUserInfo {
  /** Supabase Auth user ID (UUID). */
  uid: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  provider: string;
}

/**
 * Verify a Supabase access token and return the user's profile.
 *
 * Returns `null` if the token is invalid or expired.
 */
export async function verifySupabaseToken(
  accessToken: string,
): Promise<SupabaseUserInfo | null> {
  if (!SUPABASE_AUTH_ENABLED) return null;

  const admin = getAdmin();
  const { data, error } = await admin.auth.getUser(accessToken);

  if (error || !data.user) return null;

  const user = data.user;
  const meta = user.user_metadata ?? {};

  return {
    uid: user.id,
    email: user.email ?? meta.email ?? null,
    fullName: meta.full_name ?? meta.name ?? null,
    avatarUrl: meta.avatar_url ?? meta.picture ?? null,
    provider:
      user.app_metadata?.provider ?? user.identities?.[0]?.provider ?? "google",
  };
}
