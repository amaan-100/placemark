import { createAuthClient } from '@neon/auth';
import { BetterAuthReactAdapter } from '@neon/auth/react/adapters';

const AUTH_URL = (import.meta.env.VITE_NEON_AUTH_URL ?? '').trim();

export const authConfigured = AUTH_URL.length > 0;

const adapter = authConfigured
  ? BetterAuthReactAdapter({ fetchOptions: { credentials: 'include' } })
  : null;

export const authClient = authConfigured && adapter ? createAuthClient(AUTH_URL, { adapter }) : null;

/** Typed Better Auth instance, used for session reads (sign-in/up live on authClient). */
const betterAuth = adapter && authConfigured ? adapter(AUTH_URL).getBetterAuthInstance() : null;

export async function getAccessToken(): Promise<string | null> {
  if (!betterAuth) {
    return null;
  }
  try {
    const result = await betterAuth.getSession();
    const data = result?.data as { session?: { token?: string } } | null | undefined;
    return data?.session?.token ?? null;
  } catch {
    return null;
  }
}

export type AuthUser = {
  id: string;
  email: string;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!betterAuth) {
    return null;
  }
  try {
    const result = await betterAuth.getSession();
    const data = result?.data as { user?: { id?: string; email?: string } } | null | undefined;
    const user = data?.user;
    if (!user?.id || !user.email) {
      return null;
    }
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}
