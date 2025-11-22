import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import SettingsPageClient from '@/components/SettingsPageClient';

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/auth/login');
  }

  const userId = currentUser.id;

  // Get user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      plan: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect('/auth/login');
  }

  return <SettingsPageClient user={user} />;
}

