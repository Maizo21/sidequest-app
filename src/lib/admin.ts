import 'server-only';

import { currentUser } from '@clerk/nextjs/server';

export interface AdminUser {
  userId: string;
  email: string;
}

const DEFAULT_ADMIN_EMAIL = 'hernanamaizp@gmail.com';

function getAllowedAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? DEFAULT_ADMIN_EMAIL)
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await currentUser();
  const email = (user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? '')
    .trim()
    .toLowerCase();

  if (!user?.id || !email || !getAllowedAdminEmails().includes(email)) {
    return null;
  }

  return {
    userId: user.id,
    email,
  };
}
