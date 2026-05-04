const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() ?? '';

export function adminEmailConfigured() {
  return Boolean(ADMIN_EMAIL);
}

export function isAdminSession(user: { email?: string | null } | null | undefined) {
  if (!ADMIN_EMAIL || !user?.email) return false;
  return user.email.trim().toLowerCase() === ADMIN_EMAIL;
}
