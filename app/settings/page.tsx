import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import SettingsPageClient from '@/components/SettingsPageClient';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  const userId = session.user.id;

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

