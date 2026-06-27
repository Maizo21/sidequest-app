import { redirect } from 'next/navigation';

import AdminSidequestPanel from '@/components/AdminSidequestPanel';
import { getAdminUser } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect('/');
  }

  return <AdminSidequestPanel adminEmail={admin.email} />;
}
