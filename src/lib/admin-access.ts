import { timingSafeEqual } from "node:crypto";

/**
 * Checks the private, server-only token used by the internal admin shortcut.
 * This is intentionally not a user authentication mechanism: possession of the
 * link grants administrative access, so the token must remain private.
 */
export function hasAdminLinkAccess(token: string | null | undefined) {
  const expected = process.env.ADMIN_ACCESS_TOKEN;
  if (!expected || !token || expected.length !== token.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
